# M-26-14 Maturity Overview Dashboard — User Guide

## 1. Overview

The **M-26-14 Maturity Overview** dashboard (`m_26_14-maturity-overview`) is the executive hub of the Elastic M-26-14 compliance pack. It answers, on a single screen, the question that frames every maturity self-assessment under OMB Memorandum M-26-14: *"Where does the agency stand on each of the five compliance elements, and which elements are blocking advancement to the next maturity level?"*

The deployed demo configuration models a representative federal civilian agency progressing from **Event Logging Level 2 (L2) to Level 3 (L3)**. The dashboard's own description summarizes the posture it displays: Elements 1 and 4 are at L3; Elements 2, 3, and 5 are blocking L3 advancement. Every number on the dashboard ties back to one of the five M-26-14 compliance elements:

| Element | Requirement Area |
|---------|------------------|
| Element 1 | Hardware asset management — inventory coverage |
| Element 2 | Software asset management — log collection coverage |
| Element 3 | Detection and alerting — Appendix B category coverage (A–K) |
| Element 4 | Log retention — active and cold-tier retention periods |
| Element 5 | Log integrity — tamper-evident hashing and violation detection |

This is the **entry point** for the entire dashboard suite. Every panel carries a click-through drilldown, and the navigation bar at the top links to all six detail dashboards. Start here; drill down only where a score is yellow or red.

### Who Uses This Dashboard

| Role | Primary Use |
|------|-------------|
| **ISSO** | Daily posture check across all five elements; identifies which element-level dashboards need investigation; sources numbers for POA&M entries |
| **CISO** | Executive maturity-level view (L2 → L3 progress); briefing artifact for OMB/CISA reporting cycles; prioritizes remediation investment by element |
| **Authorizing Official (AO)** | Single-screen confirmation of maturity posture before signing attestation; launch point to the Attestation Report dashboard |
| **SOC Lead** | Monitors Element 3 category coverage and Element 5 integrity violations for degradation between reporting cycles |

### Where It Fits

The maturity overview sits at the top of a hub-and-spoke layout. Pre-aggregated metrics indices (populated by Elasticsearch Transforms, or by seeded demo data in the demo deployment) feed this hub and all six spokes. Detail and evidence live in the spokes; the hub shows only the element-level scores and their 30-day direction of travel.

---

## 2. Dashboard Layout

The dashboard contains **nine panels**: one navigation links bar, six ES|QL-driven metric panels (three per row, two rows of element scores), and two 30-day trend charts. All metric panels read pre-aggregated metrics indices — never raw alert or event stores — so load time is constant regardless of log volume.

![M-26-14 Maturity Overview dashboard — navigation links bar at top, six element score metrics in the center, and two 30-day coverage trend charts at the bottom](../screenshots/01-maturity-overview.png)

| # | Panel | Type | Source Index | What It Computes |
|---|-------|------|--------------|------------------|
| 1 | Navigation links bar | Links (horizontal) | n/a | Six dashboard links to the detail dashboards (see Section 3) |
| 2 | **Element 1: Inventory Coverage %** | Lens metric (ES\|QL) | `m_26_14-metrics-asset-coverage` | `MAX(m_26_14.value)` where `m_26_14.element == "element_1_inventory"`. Subtitle states the threshold: L3 ≥ 90% (current demo value: 90.1% — green) |
| 3 | **Element 2: Collection Coverage %** | Lens metric (ES\|QL) | `m_26_14-metrics-asset-coverage` | `MAX(m_26_14.value)` where `m_26_14.element == "element_2_collection"`. Subtitle: L2 ≥ 80%, target L3 ≥ 90% (yellow — below L3 threshold) |
| 4 | **Element 3: Appendix B Categories Covered** | Lens metric (ES\|QL) | `m_26_14-metrics-alert-coverage` | `COUNT_DISTINCT(m_26_14.category)` where `m_26_14.coverage_status == "covered"`. Subtitle: 6 of 11 covered, target L3 ≥ 8 (yellow) |
| 5 | **Element 4: L3-Compliant Data Streams** | Lens metric (ES\|QL) | `m_26_14-metrics-retention` | `COUNT(*)` where `m_26_14.retention.l3_compliant == true`. Subtitle: 6 of 10 streams meet L3 (green) |
| 6 | **Element 5: Hashed Log Documents** | Lens metric (ES\|QL) | `m_26_14-demo-logs` | `COUNT(*)` where `event.integrity.hashed == true`. Subtitle: ~78% of logs hashed, target L3 ≥ 80% (yellow) |
| 7 | **Element 5: Integrity Violations (30d)** | Lens metric (ES\|QL) | `m_26_14-integrity-violations-default` | `COUNT(*)` of recorded hash-mismatch events. Subtitle: 3 hash mismatches detected (red — any non-zero value warrants investigation) |
| 8 | **Element 1 — Inventory Coverage Trend (30d)** | Lens XY area (ES\|QL) | `m_26_14-metrics-asset-coverage` | Daily `MAX(m_26_14.value)` for `element_1_inventory`, bucketed with `DATE_TRUNC(1 day, @timestamp)` |
| 9 | **Element 2 — Collection Coverage Trend (30d)** | Lens XY area (ES\|QL) | `m_26_14-metrics-asset-coverage` | Daily `MAX(m_26_14.value)` for `element_2_collection`, same daily bucketing |

Panel colors are deliberate, not decorative: teal/green (`#00BFB3`) marks elements meeting their L3 threshold, yellow (`#FEC514`) marks elements at L2 but below the L3 threshold, and red (`#E7664C`) marks active findings (the integrity violations counter). The subtitle under each metric states the applicable threshold, so the panel is self-documenting in screenshots and exported evidence.

---

## 3. Navigation & Drill-downs

Two navigation layers are built into the dashboard:

**Layer 1 — the links bar (top of dashboard).** Six dashboard links, each configured to carry the current time range and filters into the target dashboard:

| Link Label | Target Dashboard | Question It Answers |
|------------|------------------|---------------------|
| Elements 1 & 2 — Asset Coverage | `m_26_14-asset-coverage` | Which hardware assets and software sources are inventoried and actually shipping logs? Where are the collection gaps? |
| Element 3 — Appendix B Matrix | `m_26_14-appendix-b-coverage` | Category by category (A–K): which required log types are being collected, and to what depth? |
| Element 3 — Alert Coverage | `m_26_14-alert-coverage` | Which Appendix B categories have active detection rules and recent alert activity? Which are `partial` or `none`? |
| Element 4 — Retention Compliance | `m_26_14-retention-compliance` | Per data stream: do active and cold-tier retention periods meet the L3 requirements? Which streams fall short? |
| Element 5 — Log Integrity | `m_26_14-log-management` | What fraction of log documents carry integrity hashes, and what produced the recorded violations? |
| Attestation Report | `m_26_14-compliance-attestation-dash` | Is the evidence package complete and current for AO sign-off? |

**Layer 2 — value-click drilldowns.** Every metric and trend panel has a value-click URL drilldown to its corresponding detail dashboard with a fixed 30-day window (`now-30d` to `now`). Clicking the Element 3 score, for example, lands directly on the Alert Coverage dashboard. Both Element 5 panels (hashed documents and violations) drill into the Log Integrity dashboard; both trend charts drill into Asset Coverage. The hub is therefore fully navigable without the links bar — click any number you do not like.

---

## 4. How to Read It

**Read top-to-bottom: scores first, trends second.**

1. **Scan the six score panels.** Each subtitle states the L2/L3 threshold next to the current value, so green/yellow status is verifiable at a glance — no external scoring rubric required.
2. **Check the Integrity Violations counter specifically.** Unlike the other five panels, this is a *findings* counter, not a coverage score. The target is always **0**. Any non-zero value represents documents whose stored hash failed re-verification — an audit-significant event regardless of overall maturity level. Drill into Log Integrity and document the disposition.
3. **Use the trend charts to distinguish degradation from stagnation.** A yellow Element 2 score with a rising 30-day trend is a maturity program on track; the same score with a flat or falling trend is a stalled program and belongs in the POA&M with a revised target date.

**What "good" looks like (ready to claim L3 on all elements):**

| Panel | Healthy State |
|-------|---------------|
| Element 1: Inventory Coverage % | ≥ 90%, trend flat or rising |
| Element 2: Collection Coverage % | ≥ 90% (the demo sits in the L2 band, ≥ 80%) |
| Element 3: Categories Covered | ≥ 8 of 11 for L3; 11 of 11 is the end state |
| Element 4: L3-Compliant Streams | All in-scope data streams (10 of 10 in the demo model) |
| Element 5: Hashed Documents | ≥ 80% of log documents hashed |
| Element 5: Integrity Violations | 0 |

**What "degraded" looks like:** any score that was green in the prior reporting period and is now yellow, a downward slope on either trend chart, or a violations count that has increased since the last review. Degradation between attestation cycles is exactly what continuous monitoring under M-26-14 is meant to surface — capture the date observed, drill down, and open a POA&M entry rather than waiting for the next formal assessment.

**Time range note:** the score panels run ES|QL `STATS` over the dashboard's selected time range. Keep the global time picker at **Last 30 days** (the panel drilldowns also pin to 30 days) so the scores align with the 30-day basis used in the metrics indices. Narrowing the window can drop the most recent metrics snapshot and produce misleadingly low or empty values.

---

## 5. Data Sources

All panels read pre-aggregated metrics indices, not raw alert stores or live event streams. The pre-aggregation layer is what keeps the hub fast and what makes the displayed numbers reproducible as audit evidence.

| Index | Feeds Panels | Populated By | Key Fields Used |
|-------|--------------|--------------|-----------------|
| `m_26_14-metrics-asset-coverage` | Element 1 and 2 scores; both trend charts | Asset-coverage transform / seeded demo data | `m_26_14.element`, `m_26_14.value`, `@timestamp` |
| `m_26_14-metrics-alert-coverage` | Element 3 score | Alert-coverage transform (aggregates rule and alert activity per Appendix B category) | `m_26_14.category`, `m_26_14.category_label`, `m_26_14.rules_active`, `m_26_14.alerts_30d`, `m_26_14.coverage_status` |
| `m_26_14-metrics-retention` | Element 4 score | Retention transform / seeded demo data | `m_26_14.retention.l3_compliant` |
| `m_26_14-demo-logs` | Element 5 hashed-documents score | Demo log generator with integrity-hash ingest pipeline | `event.integrity.hashed` |
| `m_26_14-integrity-violations-default` | Element 5 violations counter | Integrity re-verification job (writes one document per hash mismatch) | `@timestamp` |

**Refresh cadence.** In a production deployment the metrics indices are kept current by continuously running Elasticsearch Transforms, and the dashboard reflects each transform's last sync (typically within the hour). In the demo deployment the same indices are seeded by the pack's setup scripts, so values are static until the seed is re-run. Either way, the dashboard never queries `.alerts-security.*` or raw log data streams directly, so dashboard load is independent of total log volume.

---

## 6. Troubleshooting

### A score panel shows "No results found"

The backing metrics index is empty, missing, or has no documents inside the selected time range.

1. Confirm the time picker is set to **Last 30 days** or wider. Metrics documents are timestamped at write time; a narrow window can exclude them all.
2. Check that each index exists and has documents (Dev Tools):

```
GET m_26_14-metrics-asset-coverage/_count
GET m_26_14-metrics-alert-coverage/_count
GET m_26_14-metrics-retention/_count
GET m_26_14-demo-logs/_count
GET m_26_14-integrity-violations-default/_count
```

3. A `404` means the compliance pack's setup (index templates plus seed/transform) has not been run for that component. Re-run the pack installation for the affected asset.

### Counts exist but a score looks wrong or stale

Verify the transform feeding the index is running and healthy:

```
GET _transform/m_26_14-metrics-alert-coverage/_stats
GET _transform/_all/_stats?size=100
```

Check `state` (`started`/`indexing` is healthy; `stopped` or `failed` is not) and the checkpoint timestamps. To restart a stopped transform:

```
POST _transform/m_26_14-metrics-alert-coverage/_start
```

If the transform is healthy but values look outdated, compare the latest document timestamp against the current time:

```
POST m_26_14-metrics-asset-coverage/_search
{
  "size": 1,
  "sort": [{ "@timestamp": "desc" }],
  "_source": ["@timestamp", "m_26_14.element", "m_26_14.value"]
}
```

### Element 3 shows 0 categories covered but detection rules are enabled

The score counts categories with `m_26_14.coverage_status == "covered"` in the metrics index — it does not query rules directly. Inspect the status distribution:

```
POST m_26_14-metrics-alert-coverage/_search
{
  "size": 0,
  "aggs": {
    "by_status": { "terms": { "field": "m_26_14.coverage_status" } }
  }
}
```

If all documents show `partial` or `none`, the rules exist but have produced no qualifying alert activity in the 30-day window. Investigate on the **Element 3 — Alert Coverage** dashboard rather than here.

### Integrity Violations panel shows "No results found" instead of 0

An empty `m_26_14-integrity-violations-default` index renders as no-data, not as zero. This is the expected *clean* state when the index exists with zero documents. Confirm with `GET m_26_14-integrity-violations-default/_count` and record the count of 0 as evidence; only treat it as a fault if the index itself is missing (404), which means the integrity-verification component was never installed.

### Navigation links open but the target dashboard is empty

The links bar passes the hub's time range and filters into the target. A filter pill applied on the hub (for example, a stray `m_26_14.element` filter) will follow you into the drill-down and may exclude all of its data. Clear filter pills on the hub, or open the target from the Dashboards list directly to compare.
