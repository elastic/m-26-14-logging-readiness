# M-26-14 Alert Coverage Dashboard — User Guide

## 1. Overview

The **M-26-14 Alert Coverage (Appendix B)** dashboard (`m_26_14-alert-coverage`) is the detection-and-alerting evidence view for OMB Memorandum M-26-14 **Element 3**. It answers a single audit question: *for each of the eleven Appendix B log categories (a–k), do we have active detection rules, and are those rules actually firing?*

Element 3 (detection and alerting) is the maturity element that separates Level 3 and Level 4 agencies from those that merely collect logs. Collection alone (Elements 1–2) proves you *could* detect; this dashboard proves you *are* detecting — per category, with 30-day alert volume as corroborating evidence.

### Who Uses This Dashboard

| Role | Primary Use |
|------|-------------|
| **ISSO** | Verifies per-category detection coverage before evidence package assembly; documents `partial`/`none` categories as POA&M entries |
| **CISO** | Confirms Element 3 posture across all 11 Appendix B categories before maturity attestation |
| **Authorizing Official (AO)** | Reviews exported view (PDF or live link) as primary Element 3 evidence for ATO decisions |
| **SOC Lead** | Watches for category-level coverage degradation (rules disabled, telemetry gaps) and noisy-rule outliers |

### Where It Fits in the Dashboard Suite

This dashboard is a **drill-down target from the M-26-14 Maturity Overview hub**. A typical review path:

1. **M-26-14 Maturity Overview** — overall maturity level and per-element rollup. Element 3 panel links here.
2. **M-26-14 Alert Coverage (Appendix B)** *(this dashboard)* — per-category detection rule and alert evidence.
3. **Appendix B Coverage Matrix** — log *collection* coverage (Elements 1–2) for the same eleven categories; use alongside this dashboard to distinguish "not collecting" from "collecting but not detecting."
4. **Readiness Attestation** — the evidence-package view used for the final AO submission.

A "← Back: M-26-14 Maturity Overview" link panel sits at the top of this dashboard so reviewers can return to the hub without losing their time range or filters (the link preserves both).

---

## 2. Dashboard Layout

All panels read from the `m_26_14-metrics-alert-coverage` index — pre-aggregated per-category metrics — never from raw `.alerts-security.*` documents, so load time is constant regardless of total alert volume.

![M-26-14 Alert Coverage dashboard — back link at top, four coverage metric panels, alerts and rules bar charts, and the per-category coverage status table](../screenshots/03-alert-coverage.png)

### Panel Reference

| # | Panel | Type | What It Shows |
|---|-------|------|---------------|
| 1 | **← Back: M-26-14 Maturity Overview** | Links panel (top row, full width) | Navigation back to the hub dashboard (`m_26_14-maturity-overview`), preserving the current time range and filters |
| 2 | **Categories Fully Covered** | Metric (teal) | Count of distinct categories where `m_26_14.coverage_status == "covered"` — active rules *and* recent alerts |
| 3 | **Partial Coverage** | Metric (yellow) | Count of distinct categories where `m_26_14.coverage_status == "partial"` — rules exist but few or no recent alerts |
| 4 | **No Coverage** | Metric (red) | Count of distinct categories where `m_26_14.coverage_status == "none"` — no active detection rules |
| 5 | **Total Alerts (30d)** | Metric (blue) | `SUM(m_26_14.alerts_30d)` across all categories — gross detection activity for the trailing 30 days |
| 6 | **Alerts Last 30 Days by Appendix B Category** | Horizontal bar chart | `m_26_14.alerts_30d` per `m_26_14.category_label`, sorted descending — where alert volume concentrates |
| 7 | **Active Detection Rules by Category** | Vertical bar chart | `m_26_14.rules_active` per `m_26_14.category_label`, sorted descending — depth of rule coverage per category |
| 8 | **Appendix B Category Coverage Status** | Data table | One row per category: label, active rule count, and 30-day alert count, sorted alphabetically — the primary evidence panel |

All Lens panels use ES|QL against `m_26_14-metrics-alert-coverage`. The bar charts and table use `MAX()` per category rather than `SUM()` because the transform writes one snapshot document per category per run; `MAX()` returns the latest snapshot value within the selected time range.

The three coverage metric panels (2–4) always sum to 11 — every Appendix B category lands in exactly one status bucket.

---

## 3. How to Read It

### Coverage Status Definitions

| Status | Condition | Audit Meaning |
|--------|-----------|---------------|
| **covered** | One or more active detection rules mapped to the category, with alerts in the last 30 days | Element 3 satisfied for this category — detection is deployed and demonstrably working |
| **partial** | Active rules exist, but few or no alerts in the last 30 days | Detection is *deployed but unverified*. May be benign (high-threshold rules, quiet environment) or a silent failure (telemetry gap, broken rule query). Requires investigation before attestation |
| **none** | No active detection rules mapped to the category | Confirmed Element 3 gap — equivalent to a missing control from the AO's perspective. Requires a POA&M entry with a remediation date |

A clean Level 3/Level 4 posture is **Categories Fully Covered = 11, Partial = 0, No Coverage = 0**. Anything else needs a documented explanation in the evidence package.

### Interpreting Alert Volume

- **Zero alerts with `covered` status** should not occur (it would be `partial`); if you see it, the transform may not have run since the rule's first alert — check transform health (Section 6).
- **Zero alerts with rules active** (`partial`) is the case that deserves the most scrutiny: confirm the rule is enabled, its source index has data in the rule's lookback window, and the rule has no execution errors in **Security → Rules**.
- **Rule count vs. alert volume are independent signals.** A category can have five rules and ten alerts, or one rule and ten thousand. Read panels 6 and 7 together: rules prove *intent to detect*, alerts prove *the pipeline works end-to-end*.

### Noisy-Rule Caveat

A single dominant bar in the alerts chart usually means one noisy rule, not superior coverage. If one category shows 10,000+ alerts while others show under 100, treat it as a tuning candidate (likely false positives) rather than evidence of strength. High volume in one category also does **not** compensate for `partial` or `none` status elsewhere — M-26-14 coverage is assessed per category, not in aggregate.

---

## 4. How to Use for AO Reporting

1. **Set the time range** to at least "Last 7 days" so the latest transform snapshot is in view. The metrics themselves are trailing-30-day values computed by the transform; the dashboard time range only selects which snapshot documents are read.
2. **Check the three coverage metrics.** Confirm they sum to 11. Record the values; the target is 11 / 0 / 0.
3. **For each `partial` category:** open **Security → Rules**, filter by the category tag (e.g., `Appendix-B-G`), confirm the rules are enabled and executing without errors, and document the reason for low alert volume (high threshold, quiet data source, recent deployment).
4. **For each `none` category:** create or update a POA&M entry stating the missing detection content, the planned rule(s), and a target deployment date. Do not submit an Element 3 attestation at Level 3+ with an undocumented `none` category.
5. **Cross-check against the Appendix B Coverage Matrix dashboard.** A category that lacks *collection* coverage there cannot achieve detection coverage here — fix collection first.
6. **Export the evidence.** Use **Share → Export → PDF** (or attach the dashboard link for live AO access), and include the data table (panel 8) as the per-category evidence record.
7. **Return to the hub** via the back link and confirm the Element 3 rollup on the Maturity Overview reflects the same posture.

---

## 5. Data Sources

The dashboard sits at the end of an automated metrics pipeline:

```
Detection rules (tagged)            e.g., tags: ["M-26-14", "Appendix-B-B", "Element-3", "Level-2"]
        │ alerts
        ▼
.alerts-security.*                  raw alert documents
        │
        ▼
Category-normalization pipeline     maps rule tags → m_26_14.category (a–k) and m_26_14.category_label
        │
        ▼
Transform: m_26_14-alert-coverage-daily
        │ aggregates per category: m_26_14.rules_active, m_26_14.alerts_30d, m_26_14.coverage_status
        ▼
m_26_14-metrics-alert-coverage        snapshot index read by every panel on this dashboard
```

Key points:

- **Rule tags drive everything.** A detection rule is counted toward a category only if it carries the `M-26-14` tag plus an `Appendix-B-<letter>` tag. Untagged rules are invisible to this dashboard even if they functionally cover a category.
- **Refresh cadence is hourly.** The transform checkpoints on an hourly schedule; expect up to one hour of lag between an alert firing and the dashboard reflecting it.
- **Fields written per category document:** `m_26_14.category` (a–k), `m_26_14.category_label`, `m_26_14.rules_active`, `m_26_14.alerts_30d`, `m_26_14.coverage_status` (covered / partial / none), `@timestamp`.

---

## 6. Troubleshooting

### Dashboard shows "No results found"

1. Confirm the metrics index exists and has documents:

   ```
   GET m_26_14-metrics-alert-coverage/_count
   ```

2. If the count is 0, check the transform (next subsection). If the count is non-zero, widen the dashboard time range — snapshot documents may fall outside a narrow window.

### A category shows fewer rules than expected

The most common cause is missing or misspelled tags. Verify the rule's tags in **Security → Rules → (rule) → About**, or query the alerts directly:

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

Each contributing rule must carry the full tag set, e.g. `["M-26-14", "Appendix-B-B", "Element-3", "Level-2"]`. Tags are case- and hyphen-sensitive.

### Metrics look stale (alerts fired but counts unchanged)

Check transform health:

```
GET _transform/m_26_14-alert-coverage-daily/_stats
```

- `state` should be `started`; `health.status` should be `green`.
- If the transform is `stopped` or `failed`, restart it:

  ```
  POST _transform/m_26_14-alert-coverage-daily/_start
  ```

- Check `stats.search_failures` and `stats.index_failures` for non-zero values, and review the transform's audit messages under **Stack Management → Transforms** for the underlying error.

### Coverage status disagrees with what you see in Security → Alerts

Remember the up-to-one-hour transform lag, and that `alerts_30d` is a trailing 30-day window computed at transform run time — not the dashboard's selected time range. If the discrepancy persists past one transform cycle, verify the category-normalization ingest pipeline is attached and populating `m_26_14.category` on alert documents.

---

*Part of the Elastic M-26-14 readiness pack. Related guides: M-26-14 Maturity Overview (hub), Appendix B Coverage Matrix, Readiness Attestation.*
