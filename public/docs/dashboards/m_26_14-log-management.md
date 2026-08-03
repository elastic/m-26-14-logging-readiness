# M-26-14 Log Management Dashboard — User Guide

## 1. Overview

The **M-26-14 Log Management dashboard** (`m_26_14-log-management`, titled *"M-26-14 Log Management (Element 5)"*) is the operational view for **Element 5 — Log Integrity** of OMB Memorandum M-26-14. It answers two questions an auditor will ask about your log management program:

1. **Are logs tamper-evident?** Every log routed through the `m_26_14-log-integrity-hash` ingest pipeline receives a SHA-256 hash computed over the log message content at ingest time, and is flagged with `event.integrity.hashed: true`. The dashboard shows how much of your log estate carries that hash.
2. **Has anything been tampered with?** A scheduled verification job re-computes hashes and writes any mismatch to `m_26_14-integrity-violations-default`. The dashboard surfaces those violations in both summary and detail form.

Beyond integrity, the bottom row provides general log-pipeline visibility (event category mix and overall log volume) so coverage gaps and ingest disruptions are visible on the same screen.

### Who Uses This Dashboard

| Role | Primary Use |
|------|-------------|
| **SOC Lead** | Daily watch for integrity violations; triage of hash-mismatch events as potential tampering incidents |
| **Platform Engineer** | Monitors hash coverage percentage and per-host coverage; drives pipeline rollout to unhashed sources; investigates ingest volume anomalies |
| **ISSO** | Evidence that the Element 5 tamper-evidence control is implemented and operating; documents violations and coverage gaps for POA&M and AO reporting |

### Relation to the Maturity Overview Hub

This dashboard is one spoke of the M-26-14 readiness pack's hub-and-spoke navigation. The **M-26-14 Maturity Overview** hub dashboard links here as **"Element 5 — Log Integrity"**, and the links panel at the top of this dashboard (**"← Back: M-26-14 Maturity Overview"**) returns you to the hub, preserving your time range and filters.

---

## 2. Dashboard Layout

The dashboard contains one navigation panel and nine visualization panels, all driven by ES|QL queries against two indices: `m_26_14-demo-logs` (hashed/unhashed log documents) and `m_26_14-integrity-violations-default` (verification-job findings).

![M-26-14 Log Management dashboard — back-link bar at top, four integrity metric panels, hash coverage trend and per-host bar chart, violations detail table, and category pie with log volume trend at the bottom](../screenshots/05-log-management.png)

| # | Panel | Type | Source / Query | What It Shows |
|---|-------|------|----------------|---------------|
| 0 | **← Back: M-26-14 Maturity Overview** | Links | Dashboard link to `m_26_14-maturity-overview` | Hub navigation; carries time range and filters back to the overview |
| 1 | **Documents with Integrity Hash** | Metric | `m_26_14-demo-logs` where `event.integrity.hashed == true` | Count of log documents carrying a SHA-256 integrity hash (teal; subtitle notes ~78% of log volume hashed in the demo dataset) |
| 2 | **Documents Without Hash** | Metric | `m_26_14-demo-logs` where `event.integrity.hashed == false` | Count of logs that bypassed the hash pipeline (yellow — flagged as "needs pipeline rollout") |
| 3 | **Integrity Violations (30d)** | Metric | `m_26_14-integrity-violations-default`, total count | Hash mismatches detected by the verification job within the selected time range (red) |
| 4 | **Hosts with Hash Coverage** | Metric | `m_26_14-demo-logs`, `COUNT_DISTINCT(host.name)` where hashed | Number of distinct hosts producing hashed logs |
| 5 | **Log Hash Coverage Trend** | Area chart (XY) | `m_26_14-demo-logs` hashed docs, daily buckets (`DATE_TRUNC(1 day, @timestamp)`) | Daily volume of hashed log documents over time |
| 6 | **Hash Coverage by Host (Top 15)** | Horizontal bar (XY) | `m_26_14-demo-logs` hashed docs, `STATS COUNT(*) BY host.name`, top 15 | Which hosts contribute the most hashed logs — useful for spotting per-host rollout gaps |
| 7 | **Integrity Violations Detail** | Data table | `m_26_14-integrity-violations-default`; columns `m_26_14.integrity.host_name`, `m_26_14.integrity.violation_type`, `m_26_14.integrity.index`, `m_26_14.integrity.document_id`, `@timestamp`; latest 50 | Per-violation forensic detail: which host, what kind of mismatch, in which index, on which document |
| 8 | **Log Events by Category** | Pie | `m_26_14-demo-logs`, count by `event.category`, top 10 | Mix of event categories flowing through the log pipeline |
| 9 | **Log Volume Trend** | Area chart (XY) | `m_26_14-demo-logs`, all docs, daily buckets | Overall daily log volume — baseline for spotting ingest drops or surges |

All visualization panels honor the dashboard time picker via `@timestamp`. The "30d" in the violations metric title reflects the recommended default time range; the panel itself counts violations within whatever range is selected.

---

## 3. How to Read It

### Hash Coverage

Panels 1 and 2 together give your **coverage ratio**: hashed documents ÷ total documents. The goal state is for Documents Without Hash to trend toward zero as the `m_26_14-log-integrity-hash` pipeline is attached to every log-producing data stream.

- **Healthy:** Coverage ratio is stable or rising; the Hash Coverage Trend (panel 5) tracks the Log Volume Trend (panel 9) in shape. When the two trend lines move in parallel, hashing is keeping pace with ingest.
- **Degraded:** The hash trend flattens or drops while overall log volume holds steady. This means new log volume is arriving *unhashed* — a data stream was added without the pipeline, or a pipeline reference was removed during a template update.
- **Per-host gaps:** Compare panel 4 (Hosts with Hash Coverage) against your known fleet size. Hosts missing from panel 6's top-15 bar chart that you expect to be high-volume log producers are candidates for pipeline rollout.

### What a Violation Means

A row in the violations table means the verification job re-computed the SHA-256 hash over a document's message content and it **did not match** the hash recorded at ingest. Because the hash was computed at the moment of ingest, a mismatch is direct evidence that the stored content changed *after* it entered Elasticsearch. There are only a few explanations, and all of them matter:

1. **Tampering** — someone or something modified the document post-ingest (the scenario Element 5 exists to detect).
2. **Operational mutation** — an update-by-query, reindex with a transforming script, or pipeline rerun altered the message field legitimately but without re-hashing.
3. **Verification-job defect** — the job hashed a different field or normalization of the content than the ingest pipeline did (should be ruled out once, then trusted).

**Healthy state:** Integrity Violations (30d) = **0** and the detail table is empty. **Any non-zero value is an investigate-now condition**, not a trend to watch.

### Quick Health Check

| Signal | Healthy | Degraded |
|--------|---------|----------|
| Integrity Violations (30d) | 0 | ≥ 1 — open an investigation immediately |
| Documents Without Hash | Low and shrinking | Growing share of total volume |
| Hash Coverage Trend vs. Log Volume Trend | Parallel shapes | Hash trend diverges below volume trend |
| Hosts with Hash Coverage | Matches expected fleet | Below expected host count |
| Log Volume Trend | Consistent with baseline | Sudden drop (ingest outage) or unexplained spike |

---

## 4. Operational Procedures

### Responding to an Integrity Violation (Chain of Custody)

Treat every violation as potential evidence in a future investigation. Preserve before you analyze.

1. **Do not modify the affected document.** Capture the violation record first: from panel 7, note `m_26_14.integrity.host_name`, `m_26_14.integrity.violation_type`, `m_26_14.integrity.index`, `m_26_14.integrity.document_id`, and `@timestamp`.
2. **Snapshot the evidence.** Export the violation record and the referenced source document (see Section 6 for the retrieval query) to your evidence store before any remediation. The violation document in `m_26_14-integrity-violations-default` is itself part of the custody chain — never delete it.
3. **Establish the modification window.** The violation timestamp marks *detection*, not *modification*. The change occurred between original ingest and the verification run that flagged it.
4. **Check for an operational explanation.** Review cluster audit logs and change records for update-by-query, reindex, or script activity against the affected index in that window. If found, document it, re-hash the affected documents, and record the event as an operational finding.
5. **If no operational explanation exists, escalate as a security incident.** Unexplained post-ingest modification of log data is a tampering indicator. Hand the preserved evidence package to incident response and notify the ISSO.
6. **Document the outcome.** Every violation — benign or not — gets a written disposition. Auditors will ask what happened to each one.

### Responding to a Hash Coverage Drop

1. Identify *when* coverage diverged using panel 5 vs. panel 9, and *where* using panel 6 (which hosts stopped contributing hashed volume).
2. Check whether a new data stream or index template was deployed at that time without the `m_26_14-log-integrity-hash` pipeline attached (as a default or final pipeline).
3. Verify the pipeline still exists and is unmodified (Section 6).
4. Re-attach the pipeline to the affected data stream. Documents ingested during the gap remain permanently unhashed — record the gap window in the POA&M, since those documents cannot be retroactively proven tamper-free.

---

## 5. Data Sources & Refresh

| Component | Role |
|-----------|------|
| `m_26_14-log-integrity-hash` (ingest pipeline) | Computes SHA-256 over log message content at ingest; sets the hash field and `event.integrity.hashed: true` on each document |
| `m_26_14-demo-logs` (index) | Log documents, hashed and unhashed; source for panels 1, 2, 4, 5, 6, 8, 9 |
| Verification job | Periodically re-computes hashes against stored content; writes mismatches as violation documents |
| `m_26_14-integrity-violations-default` (index) | Violation records; source for panels 3 and 7 |

**Flow:** log source → ingest via `m_26_14-log-integrity-hash` pipeline (hash computed, flag set) → `m_26_14-demo-logs` → verification job re-hashes on schedule → mismatches land in `m_26_14-integrity-violations-default` → dashboard reads both indices live.

All panels query the indices directly with ES|QL — there is no intermediate transform, so the dashboard reflects new ingest and new violations as soon as documents are indexed and refreshed. Violations appear only after the next verification-job run, so detection latency equals the job's schedule interval, not the dashboard refresh interval.

---

## 6. Troubleshooting

Run these from **Kibana Dev Tools** (Management → Dev Tools).

**Metric panels show zero / no data — confirm the indices have documents:**

```
GET m_26_14-demo-logs/_count
GET m_26_14-integrity-violations-default/_count
```

**Check the hashed vs. unhashed split (should match panels 1 and 2):**

```
GET m_26_14-demo-logs/_search
{
  "size": 0,
  "aggs": {
    "hashed_split": { "terms": { "field": "event.integrity.hashed" } }
  }
}
```

**Verify the integrity-hash pipeline exists and inspect its processors:**

```
GET _ingest/pipeline/m_26_14-log-integrity-hash
```

**Confirm a data stream / index actually routes through the pipeline:**

```
GET m_26_14-demo-logs/_settings?filter_path=**.default_pipeline,**.final_pipeline
```

**Pull recent violation records (mirrors the Integrity Violations Detail table):**

```
GET m_26_14-integrity-violations-default/_search
{
  "size": 50,
  "sort": [{ "@timestamp": "desc" }],
  "_source": [
    "m_26_14.integrity.host_name",
    "m_26_14.integrity.violation_type",
    "m_26_14.integrity.index",
    "m_26_14.integrity.document_id",
    "@timestamp"
  ]
}
```

**Retrieve the source document referenced by a violation (for evidence preservation):**

```
GET <m_26_14.integrity.index>/_doc/<m_26_14.integrity.document_id>
```

**Panels load but charts are empty for the selected range — confirm document timestamps fall inside the dashboard time picker:**

```
GET m_26_14-demo-logs/_search
{
  "size": 1,
  "sort": [{ "@timestamp": "desc" }],
  "_source": ["@timestamp", "event.integrity.hashed", "host.name"]
}
```

If counts are correct in Dev Tools but panels stay empty, widen the dashboard time range — every panel filters on `@timestamp`.
