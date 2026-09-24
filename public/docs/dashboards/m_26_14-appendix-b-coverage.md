# M-26-14 Appendix B Coverage Matrix: User Guide

## 1. Overview

The **M-26-14 Appendix B Coverage Matrix** (`m_26_14-appendix-b-coverage`) is a MITRE ATT&CK-style detection coverage grid for the eleven activity categories (A to K) in Appendix B of OMB Memorandum M-26-14. It supports **Element 3** of the memo's Appendix C maturity model, and answers one question at a glance: *for each category, have pack detection rules tagged for it produced alerts, and how many in the last 30 days?*

Each category has its own tile showing its 30-day alert count, with a KPI row, two bar charts, and a full-detail table around it. All panels read two pre-aggregated stores written hourly by transforms (Section 6), so the dashboard loads fast regardless of raw alert volume. The level wording used across the pack (Ineffective, Initial, Intermediate, Advanced, Optimal) is Elastic's interpretation of the Appendix C ladder.

### Who Uses This Dashboard

| Role | Primary Use |
|------|-------------|
| **ISSO** | Daily gap check; identifies categories needing rule deployment or data-source onboarding; drives POA&M entries |
| **CISO** | Grid view of detection posture for leadership briefings; tracks gap closure across reporting periods |
| **Authorizing Official (AO)** | Visual evidence of Appendix B detection coverage for ATO packages; the full-detail table and its row-click evidence views are the audit artifact |
| **SOC Lead** | Spots categories whose rules have stopped firing (silent detection failure) before it becomes a finding |

### Where It Fits Among the Companion Dashboards

This dashboard is reached as a drill-down from the **M-26-14 Maturity Overview** hub (`m_26_14-maturity-overview`). A links panel at the top ("← Back: M-26-14 Maturity Overview") returns you to the hub in the same tab, carrying your time range and filters.

It is a companion to:

- **M-26-14 Alert Coverage (Appendix B)** (`m_26_14-alert-coverage`): the same stores and status logic, laid out as a status table with rule and alert charts. See `m_26_14-alert-coverage.md`.
- **Readiness Attestation Dashboard** (`m_26_14-readiness-attestation-dash`): reads the same two alert coverage stores, oriented toward evidence-package generation. See `../detection-rules/compliance-dashboard-guide.md`.
- **Security → Alerts**: raw alert investigation once the matrix identifies which category needs attention. The table's row click opens it pre-filtered.

Use the matrix for *visual gap identification*; use the Attestation Dashboard for *evidence export*.

---

## 2. Dashboard Layout

The dashboard contains nineteen panels in six rows. Every Lens panel is an ES|QL query against one of two stores:

- `m_26_14-metrics-alert-coverage-latest` (the "latest store"): one row per rule, holding that rule's most recent alert.
- `m_26_14-metrics-alert-coverage-by-day` (the "by-day store"): one row per (UTC day, Appendix B category), holding `alert_count` and `last_alert_ts`.

![M-26-14 Appendix B Coverage Matrix: KPI row, eleven category tiles, alert and rule bar charts, and the full-detail coverage table](../screenshots/m_26_14-appendix-b-coverage.png)

### Row 0: Navigation

| Panel | Type | Behavior |
|-------|------|----------|
| **← Back: M-26-14 Maturity Overview** | Links panel | Returns to the hub dashboard in the same tab, carrying the current time range and filters |

### Row 1: KPI Metrics

Four metric panels summarizing posture. The first three always sum to 11 by construction, because No Coverage is 11 minus the categories counted by the other two.

| Panel | Store | What It Computes |
|-------|-------|------------------|
| **Fully Covered Categories** | latest | Categories where at least one rule carrying the category tag has its newest alert within the last 30 days (subtitle: "Categories with an alert in the last 30 days (of 11)"). Value-click ("View categories") lists them with `status`, `rules`, `last_alert` |
| **Partial Coverage** | latest | Categories whose rules have alerted, but not in the last 30 days (subtitle: "Rules have alerted before, nothing in the last 30 days"). Value-click lists them |
| **No Coverage** | latest | `11` minus the number of distinct `Appendix-B-*` tags found on rules in the latest store (subtitle: "Categories with no alerting rule at all"). No drilldown |
| **Rules with Alerts** | latest | `COUNT_DISTINCT(kibana.alert.rule.rule_id)` over the latest store: M-26-14 rules with at least one alert whose newest alert falls in the selected range. Includes rules with no `Appendix-B-*` tag. Value-click ("View rows") lists each rule's name, ID, severity and last alert time |

The three status panels share one ES|QL pipeline:

```
FROM m_26_14-metrics-alert-coverage-latest
| MV_EXPAND `kibana.alert.rule.tags`
| WHERE STARTS_WITH(`kibana.alert.rule.tags`, "Appendix-B-")
| STATS last_alert = MAX(@timestamp), rules = COUNT_DISTINCT(`kibana.alert.rule.rule_id`) BY cat = `kibana.alert.rule.tags`
| EVAL status = CASE(last_alert >= NOW() - 30 days, "covered", "partial"), category = CASE(...)
```

`MV_EXPAND` splits each rule's tag list, so a rule tagged for two categories counts toward both.

### Rows 2 and 3: The 11 Category Tiles (A to K)

Eleven metric tiles, one per Appendix B category, arranged six across (A to F) and five across (G to K). Each tile shows:

- **Title**: category letter and name (for example "A: Identity Events").
- **Value**: the category's alert count over the trailing 30 days, from the by-day store:

  ```
  FROM m_26_14-metrics-alert-coverage-by-day
  | WHERE day_bucket >= NOW() - 30 days AND appendix_b_category == "Appendix-B-A"
  | STATS alerts = SUM(alert_count) | EVAL alerts = COALESCE(alerts, 0)
  ```

  A category with no by-day rows shows 0.
- **Subtitle**: "Alerts (30d)" plus the telemetry the category represents (Section 4).
- **Value-click**: "View 30-day history" opens Discover on the by-day store with that category's alerts per day. A category with zero alerts legitimately opens an empty view.

The tile colors are fixed in the saved object and do **not** change with the data (see Section 3). Read coverage status from the KPI row and the full-detail table.

### Row 4: Bar Charts

| Panel | Type | Store | What It Shows |
|-------|------|-------|---------------|
| **Alerts by Category - Last 30d** | Horizontal bar | by-day | `SUM(alert_count)` per category over `day_bucket >= NOW() - 30 days`, sorted descending. Clicking a bar opens that category's by-day rows (`day_bucket`, `alert_count`, `last_alert_ts`) |
| **Rules with Alerts by Category** | Horizontal bar | latest | Distinct rule IDs per category tag, sorted descending. Clicking a bar lists that category's rules (name, rule ID, severity, last alert time) |

### Row 5: Full-Detail Table

| Panel | Type | Columns |
|-------|------|---------|
| **Appendix B Coverage - Full Detail** | Data table | `cat` (the rule tag, `Appendix-B-A` to `Appendix-B-K`, sorted ascending), `category` (label), `status` (`covered` or `partial`), `rules` (distinct rules that alerted), `last_alert`. One row per category tag that appears on at least one alerting rule; uncovered categories have no row. This is the audit-ready evidence export |

Row click passes the row's `cat` tag to three evidence drilldowns (R-127):

| Drilldown | Opens | Query |
|-----------|-------|-------|
| **Evidence: rules that alerted (latest store)** | Discover (ES\|QL) | Latest-store rows whose tags include the category tag: `@timestamp`, rule name, rule ID, severity, newest first |
| **Evidence: alerts in Security (30d)** | Security → Alerts | KQL `kibana.alert.rule.tags : "Appendix-B-<X>"` over a fixed last-30-days range |
| **Evidence: alert volume by day** | Discover (ES\|QL) | By-day rows where `appendix_b_category` equals the tag: `day_bucket`, `appendix_b_category`, `alert_count`, newest day first |

The two Discover views inherit the dashboard time range. The Security view always uses the last 30 days.

---

## 3. Color Coding & Status Definitions

### Status definitions

| Status | Condition (as computed) | Meaning |
|--------|-------------------------|---------|
| `covered` | At least one rule tagged `Appendix-B-<X>` has its most recent alert within the last 30 days | Detection for the category is deployed and demonstrably producing alerts |
| `partial` | Rules tagged for the category have alerted, but the newest of those alerts is older than 30 days | Detection worked and has gone quiet: a quiet environment, a rarely-firing rule, or a silent failure. Investigate before attestation |
| none (No Coverage panel only) | No rule carrying the tag has an alert in the latest store | Either no tagged rule is deployed or tagged rules have never alerted. The dashboard cannot tell these apart. A confirmed gap needs a POA&M entry |

The dashboard computes status at query time from the latest store. No status field is stored.

### Colors

| Where | Color | Hex |
|-------|-------|-----|
| Fully Covered Categories | Teal | `#16C5C0` |
| Partial Coverage | Yellow | `#EAAE01` |
| No Coverage | Red | `#F6726A` |
| Rules with Alerts | Blue | `#61A2FF` |
| Category tiles A to F and H | Teal | `#16C5C0` |
| Category tiles G, J and K | Yellow | `#EAAE01` |
| Category tile I | Red | `#F6726A` |

The category tile colors are static and reflect the reference demo posture. They do not recolor when a category's status changes, so a teal tile can belong to a `partial` or uncovered category. Use the table's `status` column and the KPI row for the actual status.

---

## 4. The 11 Appendix B Categories

The matrix maps each Appendix B category to a tile and an `Appendix-B-<letter>` rule tag:

| Cat | Tile Label | Tile Subtitle (telemetry represented) |
|-----|-----------|----------------------------------------|
| **A** | Identity Events | identity and authentication events |
| **B** | Network Sessions | network session logs |
| **C** | Object/Resource Access | object and resource access |
| **D** | Privilege Changes | privilege and role changes |
| **E** | Infrastructure Changes | infrastructure and configuration changes |
| **F** | Security Tool Alerts | security tool alerts |
| **G** | IoC Monitoring | indicator-of-compromise matches |
| **H** | Anomalous Activity | ML anomaly detections |
| **I** | Data Volume / Exfil | outbound data-volume anomalies |
| **J** | Attack Vectors | attack-vector and technique chains |
| **K** | Automated Alerts | meta-rule over automated alerts |

A category counts only through rules carrying its tag. A single rule may carry several `Appendix-B-*` tags and then evidences each of those categories.

---

## 5. How to Use for AO Reporting

1. **Set the time range** to at least the last 90 days. Every panel filters on `@timestamp`, and in the latest store that is each rule's newest alert. With a range of 30 days or less, `partial` categories drop out and are counted as No Coverage instead.
2. **Read the KPI row first.** A clean submission shows Fully Covered = 11, Partial = 0, No Coverage = 0. Any non-zero No Coverage value blocks submission until remediated or documented.
3. **Scan the tile values, not the tile colors.** A tile at 0 means no alerts in the trailing 30 days for that category. Confirm its status in the Full Detail table: `partial` if present with an old `last_alert`, uncovered if absent.
4. **Use the two bar charts together.** A category in the *Rules* chart but missing from the *Alerts* chart has rules that alerted before the 30-day window but not within it. Verify the data source is flowing before concluding the rule is broken.
5. **Export the Full Detail table** (panel menu → *Download as CSV*) as the per-category evidence artifact. Its five columns (`cat`, `category`, `status`, `rules`, `last_alert`) map directly to an Appendix B readiness worksheet. When the auditor asks for the evidence behind a `covered` row, use the row click to open the rules, the alerts in Security, and the daily volume.
6. **Document residual gaps.** Any `partial` row or uncovered category requires a POA&M entry with a remediation date; attach the exported CSV and a dashboard screenshot to the AO package.
7. **Return to the Maturity Overview** via the back link to capture the agency-wide maturity score in the same evidence package.

---

## 6. Data Sources & Refresh

| Component | Detail |
|-----------|--------|
| Source alerts | `.alerts-security.*` and `.alerts-security.test`, filtered to alerts whose rule carries the `M-26-14` tag, excluding the canary rule `m_26_14-canary-alert` |
| Latest store | `m_26_14-metrics-alert-coverage-latest`, written by transform `m_26_14-alert-coverage-latest` (latest function, unique key `kibana.alert.rule.rule_id`, sort `@timestamp`, dest pipeline `m_26_14-alert-coverage-latest-provenance`). One row per rule: `@timestamp`, `kibana.alert.rule.name`, `kibana.alert.rule.rule_id`, `kibana.alert.rule.tags`, `kibana.alert.severity`, `m_26_14.derived.*`, `m_26_14.provenance.*` |
| By-day store | `m_26_14-metrics-alert-coverage-by-day`, written by transform `m_26_14-alert-coverage-daily` (pivot on `day_bucket`, a 1-day UTC date histogram, and `appendix_b_category`, a runtime keyword taken from the rule's `Appendix-B-*` tags; aggregations `alert_count` and `last_alert_ts`). One row per (day, category) |
| By-day pipeline | `m_26_14-alert-coverage-daily-provenance` stamps `@timestamp` from `day_bucket` (R-128) and adds `m_26_14.derived.*` and `m_26_14.provenance.*` |
| Multi-category rules | An alert whose rule carries several `Appendix-B-*` tags is counted under each of them in the by-day store |
| Mappings | Index template `m_26_14-alert-coverage-metrics`, pattern `m_26_14-metrics-alert-coverage-*`, covers both stores |
| Refresh cadence | Both transforms run hourly with a 60-second sync delay; the dashboard reflects the latest checkpoint |
| Query language | All Lens panels use ES|QL against the two stores; none query raw alert indices |

Because the matrix, the Alert Coverage dashboard and the Readiness Attestation Dashboard read the same two stores, disagreement between them points to a stale or failed transform, not a data problem.

---

## 7. Troubleshooting

**All tiles and KPIs show 0 or "No results".** A store is empty or a transform has not run. In Dev Tools:

```
GET m_26_14-metrics-alert-coverage-latest/_count
GET m_26_14-metrics-alert-coverage-by-day/_count

GET _transform/m_26_14-alert-coverage-latest/_stats
GET _transform/m_26_14-alert-coverage-daily/_stats
```

Each transform should be `started` with `health.status` `green` and a recent checkpoint. Start a stopped one with `POST _transform/<id>/_start`, and read `stats.search_failures`, `stats.index_failures` and the audit messages under **Stack Management → Transforms** if it failed. If both counts are non-zero, widen the time range.

**KPI row is populated but every tile and the "Alerts by Category - Last 30d" chart are empty.** The by-day rows probably lack `@timestamp`. Rows written before R-128 carry only `day_bucket`, and the dashboard time filter drops them. Check:

```
GET m_26_14-metrics-alert-coverage-by-day/_count
{ "query": { "bool": { "must_not": { "exists": { "field": "@timestamp" } } } } }
```

Rebuild the store with the current pipeline:

```
POST _transform/m_26_14-alert-coverage-daily/_stop
POST _transform/m_26_14-alert-coverage-daily/_reset
POST _transform/m_26_14-alert-coverage-daily/_start
```

or backfill the rows in place:

```
POST m_26_14-metrics-alert-coverage-by-day/_update_by_query
{
  "query": { "bool": { "must_not": { "exists": { "field": "@timestamp" } } } },
  "script": { "source": "ctx._source['@timestamp'] = ctx._source.day_bucket" }
}
```

**A category tile shows 0 but the table marks it `covered`.** Check the by-day store for that category:

```
POST m_26_14-metrics-alert-coverage-by-day/_search
{
  "size": 0,
  "aggs": { "cats": { "terms": { "field": "appendix_b_category", "size": 20 } } }
}
```

If the category is missing, confirm the missing-`@timestamp` case above and the transform health, then confirm the rule's alerts carry the `Appendix-B-<letter>` tag.

**A rule appears in "Rules with Alerts" but in no category.** The rule carries `M-26-14` but no `Appendix-B-*` tag. It reaches the latest store but never the by-day store, and no category counts it. Add the correct tag in **Security → Rules → (rule) → About**. Tags are case- and hyphen-sensitive.

**A category shows fewer rules than expected.** Only rules that have alerted appear. A deployed rule that has never fired, or whose newest alert is outside the time range, is not counted. Verify the rule is enabled in **Security → Rules** and widen the time range.

**Canary alerts are missing.** The canary rule `m_26_14-canary-alert` is excluded from both stores by design.

**No Coverage looks too low, or the table has an unexpected row.** A rule carries a malformed tag that starts with `Appendix-B-` but is not one of `Appendix-B-A` to `Appendix-B-K`. The status pipeline counts it as an extra category, which lowers No Coverage (the three KPIs still sum to 11). Check the `cat` column in the Full Detail table and fix the rule's tags.

**Back link does not navigate.** The hub dashboard `m_26_14-maturity-overview` must be installed in the same space; re-import the readiness pack saved objects if it is missing.

---

*This guide covers the M-26-14 Appendix B Coverage Matrix as shipped in the `m_26_14` pack. For the companion Readiness Attestation Dashboard and detection rule documentation, see `../detection-rules/compliance-dashboard-guide.md`.*
