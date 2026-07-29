# M-26-14 Retention Readiness Dashboard — User Guide

## 1. Overview

The **M-26-14 Retention Readiness Dashboard** (`m_26_14-retention-compliance`) is the evidence view for **Element 4** of OMB Memorandum M-26-14: logs must remain *searchable* (online, queryable in the active cluster) and *retrievable* (recoverable from snapshot or frozen storage) for the durations required at each maturity level. The dashboard answers, per data stream, two questions an auditor will always ask:

1. **How long is this data searchable today?**
2. **How long is it retrievable in total, and does that meet the L3 / L4 maturity thresholds?**

Every panel reads from the `m_26_14-metrics-retention` index, which is populated by the readiness pack's retention metrics pipeline. The thresholds enforced by the dashboard (taken directly from the panel definitions) are:

| Maturity Level | Searchable Window | Retrievable Window |
|----------------|-------------------|--------------------|
| **L3** | ≥ 90 days | ≥ 365 days |
| **L4** | ≥ 180 days | ≥ 365 days |

> These are the thresholds encoded in the readiness pack's metrics. If your agency's records schedule or M-26-14 implementation plan mandates longer windows, adjust the metric pipeline and ILM policies accordingly — the dashboard will reflect the new values automatically.

### Who Uses This Dashboard

| Role | Primary Use |
|------|-------------|
| **ISSO** | Periodic verification that every in-scope data stream meets its retention window; documents non-compliant streams in the POA&M |
| **Records Officer** | Confirms retention aligns with the approved records schedule; reviews retirement (deletion) gate activity for defensible disposal |
| **Authorizing Official (AO)** | Receives this dashboard (or its export) as the Element 4 evidence artifact during ATO and annual M-26-14 attestation |
| **Platform Engineer** | Investigates non-compliant streams; verifies ILM policy assignment, tier transitions, and snapshot repository health |

### Relation to the Maturity Overview Hub

This dashboard is a drill-down from the **M-26-14 Maturity Overview** hub dashboard (`m_26_14-maturity-overview`). A links panel at the top of the dashboard — **"← Back: M-26-14 Maturity Overview"** — returns you to the hub while preserving your current time range and filters, so the retention view and the overall maturity score always describe the same evaluation window.

---

## 2. Dashboard Layout

The dashboard contains seven panels: the back-link, three KPI metrics, two horizontal bar charts, and one readiness data table. All read from `m_26_14-metrics-retention` via ES|QL.

![M-26-14 Retention Readiness dashboard — back-link at top, three retention KPI metrics, searchable/retrievable bar charts, and per-stream readiness table](../screenshots/04-retention-compliance.png)

| # | Panel | Type | What It Shows |
|---|-------|------|---------------|
| 1 | **← Back: M-26-14 Maturity Overview** | Links | Navigation back to the hub dashboard; carries time range and filters |
| 2 | **L3-Compliant Data Streams** | Metric (teal) | Count of streams where `m_26_14.retention.l3_compliant == true`. Subtitle: *≥90d searchable + ≥365d retrievable* |
| 3 | **Non-Compliant Streams** | Metric (red) | Count of streams where `m_26_14.retention.l3_compliant == false` — below the L3 retention threshold. Target: **0** |
| 4 | **L4-Compliant Data Streams** | Metric (teal) | Count of streams where `m_26_14.retention.l4_compliant == true`. Subtitle: *≥180d searchable + ≥365d retrievable* |
| 5 | **Searchable Days by Data Stream** | Horizontal bar | `MAX(m_26_14.retention.searchable_days)` per `m_26_14.data_stream`, sorted ascending — shortest (riskiest) windows at the top |
| 6 | **Retrievable Days by Data Stream** | Horizontal bar | `MAX(m_26_14.retention.retrievable_days)` per stream, sorted ascending |
| 7 | **Retention Readiness by Data Stream** | Data table | One row per stream: searchable days, retrievable days, L3 flag, L4 flag. Sorted with non-compliant (L3 = `false`) rows first. Limit 50 rows |

The three metric panels (2–4) form the top KPI row; the two bar charts sit side by side below them; the full-width readiness table anchors the bottom of the dashboard.

---

## 3. How to Read It

### Retention window readiness

A data stream is **L3-compliant** when its measured searchable window is at least **90 days** *and* its total retrievable window is at least **365 days**. **L4 readiness** raises the searchable requirement to **180 days** with the same 365-day retrievable floor. Both flags are computed in the metrics pipeline and surfaced as booleans (`m_26_14.retention.l3_compliant`, `m_26_14.retention.l4_compliant`), so the dashboard shows pass/fail directly — no mental arithmetic during an audit.

A healthy posture looks like:

- **Non-Compliant Streams = 0** and **L3-Compliant** equals the total number of in-scope streams.
- Every bar in **Searchable Days** extends past 90 (or 180 for L4 targets).
- Every bar in **Retrievable Days** extends past 365.
- The readiness table shows `true` in both flag columns for every row.

### What a violation looks like

Because both bar charts sort **ascending**, violations surface at the top of each chart. Typical patterns:

| Symptom | Likely Cause |
|---------|--------------|
| Searchable days short (e.g., 30) but retrievable days fine | Stream is rolling to frozen/snapshot too early, or is on a non-pack ILM policy with an aggressive hot/warm phase |
| Both searchable and retrievable days short | Stream is on a default policy with a delete phase, or was onboarded recently and simply hasn't accumulated history yet |
| Retrievable days < 365 with searchable days fine | Searchable snapshot or SLM retention misconfigured; snapshots being pruned from `found-snapshots` |
| Stream missing from the table entirely | Stream not yet enrolled in the retention metrics pipeline — a coverage gap, not a pass |

The readiness table sorts L3 = `false` rows first, so the table's first rows are always your work queue. A newly onboarded stream that has not yet aged 90/365 days is *expected* to show `false`; document the onboarding date and projected readiness date rather than treating it as a control failure.

---

## 4. How to Use for AO Reporting

1. **Set the time range** to the attestation period (typically *Last 90 days* or the period named in the evidence request) and confirm it matches the hub dashboard.
2. **Check the KPI row.** L3-Compliant should equal your in-scope stream count; Non-Compliant should be 0. If it is not, do not proceed to export until each exception is explained.
3. **Reconcile stream count.** Compare the number of rows in the compliance table against your system inventory of in-scope data streams. A stream absent from the table is an unmonitored stream and must be enrolled or documented.
4. **For each non-compliant row**, record: the stream name, current searchable/retrievable days, root cause (new stream vs. policy misconfiguration), and either a remediation date or a POA&M entry.
5. **Capture evidence.** Export the dashboard as PDF (Share → Export) or capture the screen, and attach the per-stream table as the Element 4 evidence artifact. Note the dashboard ID, time range, and capture date in the package.
6. **Cross-reference disposal.** If any data was retired during the period, attach the Gate 1 approval records (see Section 5) to demonstrate that deletions were authorized and legal-hold-checked.

---

## 5. Retention Architecture

The dashboard reports on outcomes; the following pack components produce them.

### ILM tiers and searchable snapshots

The readiness pack ships two ILM policies:

- **`m_26_14-logs-l3-no-delete`** — L3 retention profile
- **`m_26_14-logs-l4-no-delete`** — L4 retention profile

Both move indices from the **hot** tier to the **frozen** tier backed by **searchable snapshots** on the `found-snapshots` repository. Data in frozen remains fully searchable (satisfying the searchable window at low storage cost) and the underlying snapshot guarantees retrievability. Critically, **neither policy contains a delete phase** — data on these policies can never be silently aged out by ILM.

### Two-gate retirement and legal holds

Deletion is deliberately impossible through ILM alone. Retiring data requires the pack's two-gate workflow:

- **Gate 1 — Approval and record.** A retirement request is detected, routed for approval, and recorded. Nothing is deleted; this gate exists purely to create an authorization trail.
- **Gate 2 — Execution.** Only after Gate 1 approval, the stream is switched to the corresponding `-hot-frozen` policy *with* a delete phase, allowing ILM to dispose of expired data. Gate 2 is **blocked if a legal hold exists** on the data; held data is preserved (with selective copy support) regardless of the retirement request.

This means every deletion visible in retention metrics is traceable to an approved Gate 1 record — the defensible-disposal evidence records officers and auditors expect.

---

## 6. Data Sources & Refresh

| Item | Value |
|------|-------|
| Index | `m_26_14-metrics-retention` |
| Query language | ES\|QL (all panels) |
| Key fields | `m_26_14.data_stream`, `m_26_14.retention.searchable_days`, `m_26_14.retention.retrievable_days`, `m_26_14.retention.l3_compliant`, `m_26_14.retention.l4_compliant`, `@timestamp` |
| Time field | `@timestamp` — panels honor the dashboard time picker |
| Aggregation note | Bar charts use `MAX(...)` per stream, so multiple metric documents per stream within the window resolve to the most favorable (latest/highest) measurement |
| Table limit | 50 streams (`LIMIT 50`); raise the limit in the panel's ES\|QL if your inventory is larger |

The metrics index is refreshed by the pack's retention metrics pipeline on its scheduled interval. If the table is empty, the pipeline has not run for the selected time range — widen the time picker before assuming a data problem.

---

## 7. Troubleshooting

**A stream shows non-compliant — verify its ILM state** (Dev Tools):

```
GET <data-stream-or-index>/_ilm/explain
```

Check `policy` (should be `m_26_14-logs-l3-no-delete` or `m_26_14-logs-l4-no-delete`), `phase`, and any `step_info` errors.

**Confirm the pack policies exist and have no delete phase:**

```
GET _ilm/policy/m_26_14-logs-l3-no-delete
GET _ilm/policy/m_26_14-logs-l4-no-delete
```

The `phases` object should contain `hot` and `frozen` (with `searchable_snapshot` on `found-snapshots`) and **no** `delete` key.

**Retrievable days too low — check the snapshot repository and snapshots:**

```
GET _snapshot/found-snapshots
GET _snapshot/found-snapshots/*?verbose=false
```

**Stream missing from the dashboard — confirm metrics exist for it:**

```
GET m_26_14-metrics-retention/_search
{
  "query": { "term": { "m_26_14.data_stream": "<stream-name>" } },
  "sort": [ { "@timestamp": "desc" } ],
  "size": 1
}
```

No hits means the stream is not enrolled in the retention metrics pipeline.

**Stream stuck on the wrong policy — reassign it:**

```
PUT <index>/_settings
{ "index.lifecycle.name": "m_26_14-logs-l3-no-delete" }
```

For data streams, update the backing index template so future backing indices inherit the correct policy as well.

**Common pitfalls**

| Symptom | Check |
|---------|-------|
| Metric panels show 0 / table empty | Time range too narrow for the metrics pipeline schedule; widen the picker |
| `_ilm/explain` shows `ERROR` step | Frozen tier or snapshot repository unavailable; resolve, then `POST <index>/_ilm/retry` |
| Stream compliant yesterday, non-compliant today | Index template changed and new backing indices picked up a different ILM policy |
| Deletion observed without a Gate 1 record | Treat as an incident: an index bypassed the two-gate workflow — audit who changed its ILM policy |
