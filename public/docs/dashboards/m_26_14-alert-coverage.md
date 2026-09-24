# M-26-14 Alert Coverage Dashboard: User Guide

## 1. Overview

The **M-26-14 Alert Coverage (Appendix B)** dashboard (`m_26_14-alert-coverage`) is the detection-and-alerting evidence view for OMB Memorandum M-26-14 **Element 3** (Appendix C). It answers one audit question: *for each of the eleven Appendix B activity categories (A to K), has a pack detection rule tagged for that category produced an alert, and how recently?*

Collection alone proves an agency *could* detect. This dashboard shows that tagged detection rules *are* producing alerts, per category, with the last-alert time and 30-day alert volume as the evidence. The maturity level wording used across the pack (Ineffective, Initial, Intermediate, Advanced, Optimal) is Elastic's interpretation of the Appendix C ladder; this dashboard supplies the per-category detection evidence behind the Element 3 rating.

### Who Uses This Dashboard

| Role | Primary Use |
|------|-------------|
| **ISSO** | Verifies per-category detection evidence before evidence package assembly; documents `partial` and uncovered categories as POA&M entries |
| **CISO** | Confirms Element 3 posture across all 11 Appendix B categories before maturity attestation |
| **Authorizing Official (AO)** | Reviews the exported view (PDF or live link) as Element 3 evidence; uses the row-click evidence views to see the alerts behind a `covered` row |
| **SOC Lead** | Watches for categories whose rules have gone quiet (last alert older than 30 days) and for categories where one noisy rule dominates volume |

### Where It Fits in the Dashboard Suite

This dashboard is a **drill-down target from the M-26-14 Maturity Overview hub**. A typical review path:

1. **M-26-14 Maturity Overview**: overall maturity level and per-element rollup. The Element 3 panel links here.
2. **M-26-14 Alert Coverage (Appendix B)** *(this dashboard)*: per-category status, alert volume, and the evidence drilldowns.
3. **M-26-14 Appendix B Coverage Matrix**: the same two stores rendered as an 11-tile grid with per-category 30-day alert counts. Use it for the at-a-glance view and this dashboard for the evidence trail.
4. **Readiness Attestation**: the evidence-package view used for the final AO submission. It reads the same two alert coverage stores.

A "← Back: M-26-14 Maturity Overview" link panel sits at the top of this dashboard. It opens the hub in the same tab and carries the current time range and filters.

---

## 2. Dashboard Layout

Every Lens panel is an ES|QL query against one of two pre-aggregated stores written by transforms (Section 5). No panel queries `.alerts-security.*` directly, so load time does not grow with raw alert volume.

- `m_26_14-metrics-alert-coverage-latest`: one row per rule, holding that rule's most recent alert.
- `m_26_14-metrics-alert-coverage-by-day`: one row per (UTC day, Appendix B category), holding `alert_count` and `last_alert_ts`.

![M-26-14 Alert Coverage dashboard: back link at top, four metric panels, alerts and rules bar charts, and the per-category coverage status table](../screenshots/m_26_14-alert-coverage.png)

### Panel Reference

| # | Panel | Type | Store | What It Shows |
|---|-------|------|-------|---------------|
| 1 | **← Back: M-26-14 Maturity Overview** | Links panel (top row, full width) | n/a | Navigation back to the hub dashboard, preserving time range and filters |
| 2 | **Categories Fully Covered** | Metric (teal) | latest | Number of categories whose newest alert, across all rules carrying that category's tag, is within the last 30 days (subtitle: "Categories with an alert in the last 30 days (of 11)"). Value-click ("View categories") lists those categories with `status`, `rules`, and `last_alert` |
| 3 | **Partial Coverage** | Metric (yellow) | latest | Number of categories whose rules have alerted, but whose newest alert is older than 30 days (subtitle: "Rules have alerted before, nothing in the last 30 days"). Value-click lists them |
| 4 | **No Coverage** | Metric (red) | latest | `11` minus the number of distinct `Appendix-B-*` tags found on rules in the latest store (subtitle: "Categories with no alerting rule at all"). No drilldown: an uncovered category has no rows to list |
| 5 | **Total Alerts (30d)** | Metric (blue) | by-day | `SUM(alert_count)` over by-day rows with `day_bucket >= NOW() - 30 days`, zero when empty. Value-click lists the per-category sums behind the total |
| 6 | **Alerts Last 30 Days by Appendix B Category** | Horizontal bar chart | by-day | `SUM(alert_count)` per category over the same 30-day window, sorted descending. Clicking a bar opens that category's by-day rows (`day_bucket`, `alert_count`, `last_alert_ts`) in Discover |
| 7 | **Rules with Alerts by Category** | Vertical bar chart | latest | Distinct `kibana.alert.rule.rule_id` per category tag, sorted descending. Clicking a bar lists that category's rules (name, rule ID, severity, last alert time) from the latest store |
| 8 | **Appendix B Category Coverage Status** | Data table | latest | One row per category tag that appears on at least one alerting rule: `cat` (the tag, `Appendix-B-A` to `Appendix-B-K`), `category` (label), `status` (`covered` or `partial`), `rules` (distinct rules that alerted), `last_alert`, sorted by tag. Row click offers the three evidence views below |

### How the status panels are computed

Panels 2, 3, 4, 7 and 8 share one ES|QL pipeline over the latest store:

```
FROM m_26_14-metrics-alert-coverage-latest
| MV_EXPAND `kibana.alert.rule.tags`
| WHERE STARTS_WITH(`kibana.alert.rule.tags`, "Appendix-B-")
| STATS last_alert = MAX(@timestamp), rules = COUNT_DISTINCT(`kibana.alert.rule.rule_id`) BY cat = `kibana.alert.rule.tags`
| EVAL status = CASE(last_alert >= NOW() - 30 days, "covered", "partial"), category = CASE(...)
```

`MV_EXPAND` splits each rule's tag list, so a rule tagged for two categories counts toward both. The `CASE` maps each tag to its label (for example `Appendix-B-A` to "A: Identity Events"). Panels 2 and 3 then count rows by `status`; panel 4 computes `11 - COUNT_DISTINCT(cat)`. Only two statuses exist in the data: `covered` and `partial`. A category with no alerting rule produces no row, so it never appears in the table and is counted only by panel 4.

Panels 2, 3 and 4 always sum to 11 by construction, because panel 4 is 11 minus the categories counted by panels 2 and 3. A malformed tag that starts with `Appendix-B-` but is not one of `Appendix-B-A` to `Appendix-B-K` is counted as an extra category and lowers **No Coverage**, so check the `cat` column in panel 8 for unexpected values.

### Row-click evidence views (panel 8)

Each row click passes the row's `cat` tag (for example `Appendix-B-G`) to three drilldowns:

| Drilldown | Opens | Query |
|-----------|-------|-------|
| **Evidence: rules that alerted (latest store)** | Discover (ES\|QL) | `m_26_14-metrics-alert-coverage-latest` rows whose tags include the category tag: `@timestamp`, rule name, rule ID, severity, newest first |
| **Evidence: alerts in Security (30d)** | Security → Alerts | KQL `kibana.alert.rule.tags : "Appendix-B-<X>"` over a fixed last-30-days range; these are the raw alerts |
| **Evidence: alert volume by day** | Discover (ES\|QL) | `m_26_14-metrics-alert-coverage-by-day` rows where `appendix_b_category` equals the tag: `day_bucket`, `appendix_b_category`, `alert_count`, newest day first |

The two Discover views inherit the dashboard time range. The Security view always uses the last 30 days.

---

## 3. How to Read It

### Coverage Status Definitions

| Status | Condition (as computed) | Audit Meaning |
|--------|-------------------------|---------------|
| **covered** | At least one rule tagged `Appendix-B-<X>` has its most recent alert within the last 30 days | Detection for this category is deployed and demonstrably producing alerts |
| **partial** | Rules tagged for the category have alerted, but the newest of those alerts is older than 30 days | Detection *was* working and has gone quiet. May be benign (quiet environment, high-threshold rule) or a silent failure (telemetry gap, disabled rule, broken query). Investigate before attestation |
| **none** (panel 4 only) | No rule carrying the category's tag has an alert in the latest store | Either no tagged rule is deployed, or tagged rules exist but have never alerted. The dashboard cannot tell these apart; check **Security → Rules** |

A clean posture is **Categories Fully Covered = 11, Partial = 0, No Coverage = 0**. Anything else needs a documented explanation in the evidence package.

### Time range matters

Every panel is filtered by the dashboard time range on `@timestamp`. In the latest store, `@timestamp` is the time of each rule's most recent alert, so a rule whose last alert falls outside the selected range disappears from panels 2, 3, 4, 7 and 8. Two consequences:

- With a range of 30 days or less, **Partial Coverage** is always 0 and quiet categories move to **No Coverage** instead. Use a range well beyond 30 days (for example the last 90 days or the last year) to separate "went quiet" from "never alerted".
- The dashboard does not save a time range, so it opens with the current Kibana range. Set it before reading the metrics.

The by-day panels (5 and 6) apply both the time range and their own `day_bucket >= NOW() - 30 days` filter, so they never show more than the trailing 30 days.

### Interpreting Alert Volume

- **Alert counts are per category, not per alert.** The by-day store counts an alert under every `Appendix-B-*` tag on its rule. A rule tagged `Appendix-B-A` and `Appendix-B-D` adds each of its alerts to both categories, and to **Total Alerts (30d)** twice. Read panel 5 as category evidence volume, not a count of distinct alerts.
- **Rule count and alert volume are independent signals.** Panel 7 counts rules that have alerted; panel 6 counts alerts. One rule with ten thousand alerts and five rules with ten alerts each both show as `covered`. Read the two charts together.
- **A `covered` category with zero volume in panel 6** means the latest store and by-day store disagree. Check transform health (Section 6) and the missing-`@timestamp` case.

### Noisy-Rule Caveat

A single dominant bar in the alerts chart usually means one noisy rule, not stronger coverage. Treat a category with thousands of alerts while others show under 100 as a tuning candidate. Use "Evidence: rules that alerted" on that row to find the rule. High volume in one category does not offset `partial` or uncovered categories elsewhere: coverage is assessed per category.

---

## 4. How to Use for AO Reporting

1. **Set the time range** to at least the last 90 days, so the status panels can distinguish `partial` from uncovered categories (Section 3).
2. **Check the three coverage metrics.** Record the values; the target is 11 / 0 / 0. Confirm that every `cat` value in panel 8 is one of `Appendix-B-A` to `Appendix-B-K`.
3. **For each `partial` row:** open **Security → Rules**, filter by the category tag (for example `Appendix-B-G`), confirm the rules are enabled and executing without errors, and document why nothing has alerted in 30 days.
4. **For each uncovered category** (counted in panel 4, absent from the table): confirm in **Security → Rules** whether any rule carries the tag. If none does, create or update a POA&M entry stating the missing detection content, the planned rules, and a target date. If rules exist but never alerted, treat it as a `partial`-style investigation.
5. **Back each `covered` row with evidence.** Use the row click: "Evidence: alerts in Security (30d)" shows the actual alerts, and "Evidence: alert volume by day" shows when they occurred.
6. **Cross-check collection.** A category whose source telemetry is not being collected cannot produce alerts. Confirm collection on the Log Management and Asset Coverage dashboards before concluding a rule is broken.
7. **Export the evidence.** Use **Share → Export → PDF** (or attach the dashboard link for live AO access), and export panel 8 as CSV for the per-category record.
8. **Return to the hub** via the back link and confirm the Element 3 rollup on the Maturity Overview reflects the same posture.

---

## 5. Data Sources

Both stores are written by transforms from Security alerts. Both transforms read `.alerts-security.*` and `.alerts-security.test`, keep only alerts whose rule carries the `M-26-14` tag, and exclude the canary rule `m_26_14-canary-alert`.

```
Detection rules tagged M-26-14 + Appendix-B-<X>   (a rule may carry several Appendix-B tags)
        │ alerts
        ▼
.alerts-security.*, .alerts-security.test
        │  filter: kibana.alert.rule.tags = "M-26-14", rule_id != m_26_14-canary-alert
        ├──────────────────────────────────────────┐
        ▼                                          ▼
Transform m_26_14-alert-coverage-latest        Transform m_26_14-alert-coverage-daily
  latest: unique key kibana.alert.rule.rule_id   pivot: day_bucket (1d UTC date histogram)
          sort @timestamp                               × appendix_b_category (from rule tags)
  pipeline m_26_14-alert-coverage-latest-       aggs: alert_count, last_alert_ts
          provenance                             pipeline m_26_14-alert-coverage-daily-provenance
        │                                          │  (stamps @timestamp from day_bucket)
        ▼                                          ▼
m_26_14-metrics-alert-coverage-latest          m_26_14-metrics-alert-coverage-by-day
  one row per rule                               one row per (day, category)
```

Key points:

- **Rule tags drive everything.** A rule reaches either store only if it carries `M-26-14`. It is attributed to a category only through an `Appendix-B-<letter>` tag. Rules without these tags are invisible here even if they functionally cover a category.
- **Latest store fields:** `@timestamp` (the rule's newest alert), `kibana.alert.rule.name`, `kibana.alert.rule.rule_id`, `kibana.alert.rule.tags`, `kibana.alert.severity`, plus `m_26_14.derived.*` and `m_26_14.provenance.*` stamps.
- **By-day store fields:** `day_bucket`, `appendix_b_category` (the tag, for example `Appendix-B-C`), `alert_count` (alerts that day), `last_alert_ts` (newest alert that day), `@timestamp` (copied from `day_bucket` by the dest pipeline, R-128), plus `m_26_14.derived.*` and `m_26_14.provenance.*`.
- **Multi-category rules.** The daily transform's runtime field emits every `Appendix-B-*` tag on the rule, so an alert is counted once under each of its categories. This matches the latest-store queries, which expand the tag list the same way.
- **Refresh cadence is hourly.** Both transforms run with a 1-hour frequency and a 60-second sync delay. Expect up to about an hour between an alert firing and the dashboard reflecting it.
- **Mappings.** The index template `m_26_14-alert-coverage-metrics` (pattern `m_26_14-metrics-alert-coverage-*`) maps both stores.

---

## 6. Troubleshooting

### Dashboard shows "No results found"

1. Confirm both stores exist and have documents:

   ```
   GET m_26_14-metrics-alert-coverage-latest/_count
   GET m_26_14-metrics-alert-coverage-by-day/_count
   ```

2. If a count is 0, check the transforms (below) and confirm M-26-14 rules have produced alerts in **Security → Alerts**. If the counts are non-zero, widen the dashboard time range: the latest store only shows rules whose newest alert falls inside it.

### Metrics look stale (alerts fired but counts unchanged)

Check both transforms:

```
GET _transform/m_26_14-alert-coverage-latest/_stats
GET _transform/m_26_14-alert-coverage-daily/_stats
```

- `state` should be `started` and `health.status` should be `green`.
- If a transform is `stopped` or `failed`, start it again with `POST _transform/<id>/_start`.
- Check `stats.search_failures` and `stats.index_failures`, and read the audit messages under **Stack Management → Transforms** for the underlying error.

### "Alerts Last 30 Days" and "Total Alerts (30d)" are empty while the status panels are populated

The by-day rows probably have no `@timestamp`. Rows written before R-128 carry only `day_bucket`, and the dashboard time filter drops any row without `@timestamp`. Check:

```
GET m_26_14-metrics-alert-coverage-by-day/_count
{ "query": { "bool": { "must_not": { "exists": { "field": "@timestamp" } } } } }
```

Fix it one of two ways:

- Rebuild the store so the current dest pipeline stamps every row:

  ```
  POST _transform/m_26_14-alert-coverage-daily/_stop
  POST _transform/m_26_14-alert-coverage-daily/_reset
  POST _transform/m_26_14-alert-coverage-daily/_start
  ```

- Or backfill the existing rows in place:

  ```
  POST m_26_14-metrics-alert-coverage-by-day/_update_by_query
  {
    "query": { "bool": { "must_not": { "exists": { "field": "@timestamp" } } } },
    "script": { "source": "ctx._source['@timestamp'] = ctx._source.day_bucket" }
  }
  ```

### A rule's alerts are missing from the per-category volume

A rule tagged `M-26-14` with no `Appendix-B-*` tag reaches the latest store but never the by-day store, because it has no category to group on. It still counts in the latest store, but not toward any category. Verify the rule's tags in **Security → Rules → (rule) → About**, or query the alerts directly:

```
GET .alerts-security.*/_search
{
  "size": 0,
  "query": { "term": { "kibana.alert.rule.tags": "Appendix-B-B" } },
  "aggs": {
    "rules": { "terms": { "field": "kibana.alert.rule.name", "size": 50 } }
  }
}
```

Tags are case- and hyphen-sensitive: `Appendix-B-B`, not `appendix-b-b` or `AppendixB-B`.

### Status disagrees with what you see in Security → Alerts

- Allow for the transform lag (up to about an hour).
- The canary rule `m_26_14-canary-alert` is excluded from both stores by design, so its alerts appear in Security → Alerts but never here.
- The Security drilldown uses a fixed 30-day range; the Discover drilldowns and the dashboard use the selected time range.

---

*Part of the Elastic M-26-14 readiness pack. Related guides: M-26-14 Maturity Overview (hub), Appendix B Coverage Matrix, Readiness Attestation.*
