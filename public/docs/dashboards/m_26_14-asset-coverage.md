# M-26-14 Asset Coverage Dashboard — User Guide

## 1. Overview

The **M-26-14 Asset Coverage Drill-Down** dashboard (`m_26_14-asset-coverage`) is the evidence surface for **Element 1 (Hardware Asset Management — HWAM)** and **Element 2 (Software Asset Management — SWAM)** of OMB Memorandum M-26-14. It answers the two questions that anchor the lower maturity levels (L1–L2) of every agency self-assessment:

1. **Do we know what is on the network?** (Element 1 — complete hardware inventory)
2. **Are we collecting logs from it?** (Element 2 — Elastic Agent enrollment and active log collection coverage)

The dashboard reads the **canonical asset store** (`m_26_14-assets`) — the same single-source-of-truth inventory that backs the HWAM Overview, HWAM Gaps, Asset Drift, and SWAM dashboards. Every tile and chart reflects the merged, deduplicated asset identity produced by the entity-resolution transform, so the numbers here reconcile exactly with the rest of the HWAM story (60 discovered / 55 managed / 5 unmanaged on the reference dataset). The gap between "discovered" and "managed," and any unmanaged device, is exactly the evidence an Authorizing Official needs quantified.

> **Note (redesign):** earlier revisions of this dashboard read a separate
> fabricated 847-host pile (`m_26_14-demo-hwam_assets`) and showed IT/OT/IoT and
> criticality breakdowns. That pile had no canonical backing and has been
> removed; the dashboard was repointed to `m_26_14-assets` so data, dashboards,
> and walkthrough screenshots all read the same scale. The OS-platform /
> OS-name / reporting-component breakdowns below replace the old
> class/criticality tiles, which had no field behind them.

### Who Uses This Dashboard

| Role | Primary Use |
|------|-------------|
| **ISSO** | Weekly inventory reconciliation; documents unmanaged assets as POA&M entries; assembles Element 1/2 evidence for AO packages |
| **CISO** | Tracks managed-coverage against agency maturity targets; prioritizes agent rollout |
| **Authorizing Official (AO)** | Reviews asset coverage posture during ATO milestones; the Daily Collection Coverage Trend is the primary Element 2 attestation artifact |
| **SOC Lead** | Investigates unmanaged hosts (potential rogue/shadow devices) via the unknown-device triage loop; identifies telemetry blind spots |

### Relationship to the Maturity Overview Hub

This dashboard is a **drill-down target** from **M-26-14 Maturity Overview** (`m_26_14-maturity-overview`). A **"← Back: M-26-14 Maturity Overview"** links panel sits at the top for round-trip navigation; it preserves your current time range and filters.

---

## 2. Dashboard Layout

One navigation panel and ten Lens visualizations, all ES|QL over `m_26_14-assets` (the trend panel reads the coverage-metrics store). Headline tiles are collapsed to a single number + subtitle.

![M-26-14 Asset Coverage dashboard — asset count tiles across the top, coverage tiles in the second row, OS and component composition charts in the third row, and the daily collection coverage trend across the bottom](../screenshots/02-asset-coverage.png)

### Navigation (top)

| Panel | Type | Behavior |
|-------|------|----------|
| **← Back: M-26-14 Maturity Overview** | Links | Returns to the hub dashboard in the same tab, carrying time range and filters |

### Row 1 — Asset Inventory (Element 1)

| Panel | ES\|QL Logic | What It Shows |
|-------|-------------|---------------|
| **Total Assets** | `STATS COUNT(*)` | Every discovered asset. The denominator for all coverage math. |
| **Managed Assets** | `WHERE asset.managed == true` | Assets with an enrolled Elastic Agent (teal) |
| **Unmanaged Assets** | `WHERE asset.managed == false` | Unrecognized-on-network devices (coral) — each one enters the triage loop |
| **Reporting Components** | `COUNT_DISTINCT(asset.component)` | Bureaus / enclaves represented in the inventory |

### Row 2 — Coverage (Element 1 / 2)

| Panel | ES\|QL Logic | What It Shows |
|-------|-------------|---------------|
| **Element 1 Covered** | `WHERE m_26_14.element1_covered == true` | Assets present in the hardware inventory (HWAM) |
| **Element 2 Covered** | `WHERE m_26_14.element2_covered == true` | Assets with software inventory / collection (SWAM) |
| **Config Drift** | `WHERE m_26_14.drift_detected == true` | Assets diverged from their certified baseline (coral) |

### Row 3 — Composition

| Panel | Type | What It Shows |
|-------|------|---------------|
| **Assets by OS Platform** | Pie | macOS / Windows / Linux split (managed assets; null-OS unmanaged devices excluded) |
| **Assets by OS** | Horizontal bar | Top `asset.os.name` values — drives SWAM baseline and patch-scope planning |
| **Assets by Reporting Component** | Horizontal bar | Distribution across `asset.component` — `unattributed` is the unmanaged cohort |

### Row 4 — Coverage Over Time

| Panel | Type | ES\|QL Source |
|-------|------|--------------|
| **Daily Collection Coverage Trend** | Area chart (full width) | `FROM m_26_14-metrics-asset-coverage \| ... STATS value = MAX(...) BY day \| SORT day ASC` |

This panel reads the pre-computed coverage metric, so it renders quickly and is the single most useful artifact for demonstrating Element 2 progress between assessment cycles.

---

## 3. How to Read It

### Coverage Interpretation

The core ratio is **Managed ÷ Total**. Read it alongside the trend panel:

| Observation | Interpretation |
|-------------|----------------|
| Managed ≈ Total, trend flat/high | Mature Element 2 posture — collection is established and stable |
| Managed < Total, trend rising | Active rollout — document the plan and projected completion |
| Trend declining | Agents unenrolling faster than added — investigate Fleet health |
| Total rising while Managed flat | Discovery is outpacing enrollment — the gap is growing |

### Identifying Gaps

1. **Unmanaged assets (Unmanaged > 0).** These hosts generate no logs in Appendix B categories. Each is fed to the **unknown-device triage loop**, which classifies it (rogue / decommissioned / new-but-uninventoried / shadow-IT / needs-review) and routes it to a Kibana Case. Do **not** triage from Discover by hand — read the `m_26_14-asset-triage` ledger (Section 7).
2. **Config drift (Config Drift > 0).** Assets whose live baseline hash diverged from the certified snapshot. Investigate via the Asset Drift dashboard.
3. **Component blind spots.** `unattributed` in the component chart is the unmanaged cohort (network-discovered devices with no bureau attribution) — a deliberate signal that these assets need identification, not a data error.

### Time Range Behavior

Metric and composition panels reflect the current snapshot within the selected range; the trend panel is the historical view. For attestation use a narrow recent window; for progress narratives widen to 90 days.

---

## 4. How to Use for AO Reporting

1. **Set the time range** — 90 days for trend context; note the exact range.
2. **Capture the dashboard** — **Share → Export → PDF**; include Total, Managed/Unmanaged, and trend tiles in one image.
3. **Record the coverage ratio** — e.g. "As of [date], 55 of 60 discovered assets (91.7%) are managed with active Elastic Agent collection."
4. **Explain every gap** — for each unmanaged cohort, attach the **triage disposition** and target date. Explained gaps read as managed risk; unexplained gaps read as findings.
5. **Attest to unmanaged/unauthorized assets** — attach the triage ledger disposition for each (rogue → IR case; decommissioned → retirement record; etc.) and the corresponding POA&M entry.
6. **Attach the trend** — demonstrates *continuous* monitoring for Element 2.
7. **Link, don't just print** — include the live dashboard URL.

---

## 5. Data Sources

| Stage | Component | Function |
|-------|-----------|----------|
| 1. Discovery | osquery pack + network discovery → `logs-m_26_14_osquery.*` / `logs-m_26_14_asset.inventory-*` | Enumerate hardware/software on managed endpoints; network-discovery rows for unmanaged devices |
| 2. Resolution | transform `m_26_14-asset-entity-resolution` | Merges all sources into one canonical doc per device (group by deterministic `asset.id`) |
| 3. Canonical store | `m_26_14-assets` | One doc per physical/virtual asset; the dashboard's tiles + charts read this |
| 4. Metrics refresh | coverage refresh job (hourly) | Writes per-element coverage values to `m_26_14-metrics-asset-coverage` (trend panel) |

**Key fields:** `asset.managed`, `asset.component`, `asset.status`, `asset.os.platform/name`, `asset.hardware.manufacturer/serial_number`, `m_26_14.element1_covered`, `m_26_14.element2_covered`, `m_26_14.drift_detected`, `m_26_14.hwam_source`.

---

## 6. Troubleshooting

### All panels show "No results found"

```
GET m_26_14-assets/_count
GET m_26_14-metrics-asset-coverage/_count
```

If zero, the seed/inventory load has not run or the entity-resolution transform is stopped. Widen the time range — tiles are time-filtered on `@timestamp`.

### Tiles populate but the trend panel is empty

The trend reads `m_26_14-metrics-asset-coverage`. If the latest metric doc is more than a couple of hours old, the hourly coverage refresh job is not running — check its scheduler and credentials.

### Managed + Unmanaged does not equal Total

Some asset docs lack `asset.managed`. Find them:

```
GET m_26_14-assets/_search
{ "size": 10, "query": { "bool": { "must_not": { "exists": { "field": "asset.managed" } } } } }
```

### Back-link does not navigate

The links panel targets `m_26_14-maturity-overview`. If that dashboard was re-imported with a new ID, re-import the pack's dashboard bundle so the reference resolves.

---

## 7. Entity Resolution & Unknown-Device Promotion

Every device on this dashboard has been through **identity resolution** before it
appears as one asset. Understanding that path explains what the Unmanaged tile
really means and how a device leaves it.

### How one asset identity is formed

The `m_26_14-asset-normalize` pipeline computes a deterministic `asset.id` from a
**priority-ordered key hierarchy** — hardware serial (highest trust) → BIOS UUID
→ Elastic agent ID → vendor device-id → MAC → hostname (lowest). That key is
SHA-256'd, so the same physical device collapses to **one** identity across
osquery, Intune, Tenable, CrowdStrike, and network discovery. The
`m_26_14-asset-entity-resolution` transform groups by `asset.id` and merges
observations (latest-wins on volatile fields, set-union on `m_26_14.hwam_source`).

### Expected vs observed

The scoring engine joins the **observed ledger** (`m_26_14-observed` — everything
emitting logs) against the canonical inventory by `host.name`, producing four cells:

| Cell | Meaning |
|------|---------|
| `expected_observed` | in inventory **and** logging — healthy |
| `expected_silent` | in inventory, **not** logging — coverage gap |
| `unexpected_observed` | logging, **not** in inventory — shadow / rogue (the triage queue) |
| `unexpected_silent` | neither — unobservable |

> **Phase-2 note:** IP-keyed observed-only entities (`observed-<ip>@<collector>`)
> are **not** auto-folded into a canonical asset yet. Until that spine IP-fold
> ships, they stay `unexpected_observed` and are resolved by an operator.

### The triage loop — what happens to an unmanaged device

An `asset.managed:false` device is **classified**, not left as a raw count. The
`m_26_14-asset-triage-classify` pipeline reads each unmanaged asset, folds in a
**computed** rogue signal (correlated Security alerts summarized per host by the
`m_26_14-host-alert-summary` transform), and writes a disposition to the
`m_26_14-asset-triage` ledger:

| Disposition | Signature | Next step (human-gated) |
|-------------|-----------|--------------------------|
| **rogue** | unmanaged + correlated high-severity alert | escalate to IR / isolate |
| **decommissioned** | retired/inactive or stale >45d | confirm offline → suppress |
| **new_uninventoried** | strong identity (serial + enterprise vendor), no alerts | enroll |
| **shadow_it** | consumer/BYOD vendor, no alerts | exception (policy) |
| **needs_review** | ambiguous signals | identify first |

Read the queue:

```
GET m_26_14-asset-triage/_search
{ "query": { "term": { "state": "proposed" } },
  "sort": [ { "m_26_14.triage.confidence": "desc" } ] }
```

### Promotion: unknown → known

A device leaves the Unmanaged tile only when it becomes **canonical**. On the
*enroll* path you add it to inventory; the entity-resolution transform mints its
`asset.id`, and the next classify pass marks it `inventoried`. Promotion is
deliberately **operator-driven** — the loop never auto-merges an identity it
isn't sure of.

Full procedure (decision tree + the four next-steps + where the human gate sits):
see `docs/runbooks/unknown-device-triage-playbook.md`. Reversible automation
(auto-suppress, auto-draft-enroll) is documented, opt-in, in
`docs/runbooks/unknown-device-automation-examples.md`.
