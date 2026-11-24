# M-26-14 Maturity Overview Dashboard: User Guide

## 1. Overview

The **M-26-14 Maturity Overview** dashboard (`m_26_14-maturity-overview`) is the executive hub of the Elastic M-26-14 Readiness Pack. It answers the question the memo's "Measuring Maturity" section asks an agency to report: *what share of our information systems is at each Appendix C level, and what holds each system back?*

Appendix C scores maturity **per information system**. Each system gets a level from 0 to 4 on five elements, and its overall level is the **lowest** of the five (memo footnote 8, the "lowest watermark"):

| Element | What the pack measures |
|---------|------------------------|
| Inventory Visibility | Share of a system's assets captured in the inventory (unexpected devices count against it); from Level 2, the share whose inventory record was updated in the last day |
| Collection Coverage | Share of inventoried assets with a log, other than the inventory feed itself, in the last day |
| Collection Operations | Appendix B categories with an alert in the last 30 days, of eleven (enterprise-wide, inherited by every system) |
| Data Retention | Shortest configured searchable and retrievable retention across the system's assets |
| Log Management | Hash coverage plus the operator's attestations (enterprise-wide, inherited by every system) |

Levels: 0 Ineffective, 1 Initial, 2 Intermediate, 3 Advanced, 4 Optimal. The thresholds are the memo's, held in the `default` document of `m_26_14-config`.

Scores are evidence for the agency's self-assessment, not an official maturity determination.

### Who uses this dashboard

| Role | Primary use |
|------|-------------|
| **CISO** | The share of systems at each level, the trend, and how many systems sit below their target; the briefing figure for OMB and CISA reporting |
| **System owner / ISSO** | Their system's row in the per-system table: its level, its target, and the limiting element to fix first |
| **Authorizing Official** | Confirmation of the system's level before signing; launch point to the Readiness Attestation dashboard |
| **SOC lead** | The Element 3 and Element 5 tiles in the lower section, which move between reporting cycles |

---

## 2. Dashboard layout

![M-26-14 Maturity Overview: per-system section at the top (share of systems at Level 1 and 2 or higher, systems below target, unassigned assets, systems by level, daily trend, per-system table), enterprise element tiles and trends below](../screenshots/m_26_14-maturity-overview.png)

The dashboard has two sections under a navigation bar.

### Per-system section (top): the memo's measure

All seven panels read the output of the daily **M-26-14 Maturity Report** workflow.

| Panel | Source | What it shows | Drilldown |
|-------|--------|---------------|-----------|
| **Systems at Level 1 or higher** | `m_26_14-maturity-reports` | `at_least_pct.l1` from the latest daily report: the percentage of registered systems whose overall level is 1 or more | Per-day history of the figure |
| **Systems at Level 2 or higher** | same | `at_least_pct.l2` | Per-day history |
| **Systems below target level** | same | `systems_below_target`: systems whose overall level is under the `target_level` in the registry | Per-day history |
| **Assets not attributed to a system** | same | `unassigned_assets`: inventoried assets and unexpected devices that neither the source nor the agency's attribution rules placed in a system | Per-day history |
| **Information systems by overall level (latest day)** | `m_26_14-scores-system` | Bar per level, count of systems on the most recent day | The latest system rows with level, target and limiting element |
| **Systems per level, daily report trend** | `m_26_14-maturity-reports` | Stacked bar per day, `level_count.l0` to `l4` | The daily report history |
| **Per-system maturity (latest day)** | `m_26_14-scores-system` | One row per system: id, name, FIPS 199 impact, assets, target, overall level, target met, limiting element, and the five element levels | Every system's daily history |

The unassigned pseudo-system is never part of the distribution; its asset count sits beside it so an attribution gap stays visible.

### Enterprise section (below): element tiles and trends

These panels give the whole-estate view of each element. They are context for the per-system figure, not a substitute for it.

| Panel | Source | What it computes |
|-------|--------|------------------|
| **Element 1: Inventory Coverage %** | `m_26_14-scores-rollup-ent` | Latest `inventory_pct`: assets whose inventory record was updated in the last day |
| **Element 2: Collection Coverage %** | `m_26_14-scores-rollup-ent` | Latest `coverage_pct`: inventoried assets with a non-inventory log in the last day |
| **Element 3: Appendix B Categories Covered** | `m_26_14-metrics-alert-coverage-latest` | Categories whose newest tagged alert is within 30 days |
| **Element 4: L3-Compliant Data Streams** | `m_26_14-scores` | Datasets whose retention score is 3 or more on the configured basis |
| **Element 5: Hash Coverage %** | `m_26_14-hash-coverage` | Hashed share of `logs-*` documents in the hourly rollup |
| **Element 5: Hash Coverage Drop Alert** | `m_26_14-metrics-alert-coverage-latest` | 1 when the hash-coverage-drop ML rule has alerted |
| **Element 1 / Element 2 trend** | `m_26_14-scores-rollup-ent` | One point per daily enterprise rollup |

---

## 3. Navigation and drilldowns

The links bar at the top opens the detail dashboards (Asset Coverage, Appendix B Matrix, Alert Coverage, Retention Readiness, Log Integrity, Readiness Attestation) and carries the time range and filters with it. Every metric tile has a value-click drilldown into Discover on the rows behind the number; each per-system tile drills into the per-day history of that figure.

---

## 4. How to read it

1. **Start with the distribution.** The two percentage tiles and the bar chart give the figure the memo asks for. The Level 1 deadline is 18 December 2026, so a system at Level 0 is the first thing to explain.
2. **Read the per-system table by its limiting element.** A system's level is its weakest element, so raising any other element does not move it. The limiting column names where the work goes.
3. **Check the unassigned count.** A non-zero value means some assets are not in any system's denominator. Fix attribution (the inventory's system id, or the agency's attribution rules) before trusting the distribution.
4. **A registered system with no assets shows at Level 0.** That is deliberate: the system exists and nothing proves it is logged.
5. **Use the trend to separate stalled from improving.** A flat count at Level 1 after a remediation sprint belongs in the POA&M with a revised date.

---

## 5. Data sources and refresh

| Index | Written by | Refresh |
|-------|-----------|---------|
| `m_26_14-maturity-reports` | `m_26_14-maturity-report` workflow, one document per UTC day (`report::<day>`) | Daily at 06:00 UTC once the workflow is enabled; it ships disabled |
| `m_26_14-scores-system` | `m_26_14-score-system` batch transform, one row per system per day | Re-run by the workflow each day |
| `m_26_14-scores-rollup-ent` | `m_26_14-score-rollup-enterprise` batch transform | Re-run by the workflow each day |
| `m_26_14-scores` | Continuous scoring transforms (per-asset facts, per-dataset retention, Elements 3 and 5) | Hourly |
| `m_26_14-information-systems` | The agency: one registry document per system (name, FIPS 199 impact, target level) | On edit |

Every clock test ("updated daily", "a log in the last day") is evaluated when the workflow runs, so a host that stops logging lowers its system's level at the next daily run instead of keeping its last score.

---

## 6. Troubleshooting

### The per-system tiles are empty

The workflow has not written a report yet. Check that it is enabled (Kibana, Workflows, **M-26-14 Maturity Report**), run it manually once, then:

```
GET m_26_14-maturity-reports/_search?size=1&sort=@timestamp:desc
GET m_26_14-scores-system/_count
```

### Every system is at Level 0, or there are no systems

The registry is empty or attribution placed no assets in it.

```
GET m_26_14-information-systems/_count
POST m_26_14-scores/_search
{ "size": 0, "query": { "term": { "element": "asset" } },
  "aggs": { "by": { "terms": { "field": "asset.information_system.attribution" } } } }
```

Mostly `unassigned` means the inventory carries no system id and no agency hook (`m_26_14-information-system@custom`) is installed. The pack's `docs/maturity-measurement.md` shows hook examples for network ranges and hostname conventions.

### A system's level looks incomplete

`waterline_complete: false` on a system row means an inherited level (operations or log management) was missing at scoring time; `missing_elements` names it. Check that `m_26_14-score-operations` and `m_26_14-score-log-management` are running, then re-run the workflow.

### Coverage reads near zero right after a reseed

`m_26_14-score-entity` syncs with a 120-second delay. If it was reset sooner than that after the `m_26_14-observed-assets` checkpoint, it skipped the freshest hosts. Wait, reset it again, then re-run the workflow.
