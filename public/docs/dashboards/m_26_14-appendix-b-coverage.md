# M-26-14 Appendix B Coverage Matrix — User Guide

## 1. Overview

The **M-26-14 Appendix B Coverage Matrix** (`m_26_14-appendix-b-coverage`) is a MITRE ATT&CK-style detection coverage grid for all eleven mandatory log categories defined in Appendix B of OMB Memorandum M-26-14. Modeled after Elastic Security's MITRE ATT&CK Coverage view, it answers a single question at a glance: *for each of the eleven required event categories (A–K), do we have active detection rules, and are those rules actually producing alerts?*

Each category is rendered as a color-coded tile — teal for fully covered, yellow for partial, orange/red for no coverage — so a coverage gap is visible from across the room, not buried in a spreadsheet. All panels read from the pre-aggregated `m_26_14-metrics-alert-coverage` index (populated hourly by the `m_26_14-alert-coverage-daily` transform), so the dashboard loads fast regardless of raw alert volume.

### Who Uses This Dashboard

| Role | Primary Use |
|------|-------------|
| **ISSO** | Daily gap check; identifies categories needing rule deployment or data-source onboarding; drives POA&M entries |
| **CISO** | Heat-map posture view for leadership briefings; tracks gap closure trend across reporting periods |
| **Authorizing Official (AO)** | Visual evidence of Appendix B coverage attached to ATO packages; the full-detail table is the audit artifact |
| **SOC Lead** | Spots categories where rules exist but have stopped firing (silent detection failure) before it becomes a finding |

### Where It Fits Among the Companion Dashboards

This dashboard is **Element 3** of the M-26-14 readiness pack and is reached as a drill-down from the **M-26-14 Maturity Overview** hub (`m_26_14-maturity-overview`). A links panel at the top of the matrix ("← Back: M-26-14 Maturity Overview") returns you to the hub, preserving your time range and filters.

It is a companion to:

- **Readiness Attestation Dashboard** (`m_26_14-compliance-attestation-dash`) — same data source, oriented toward evidence-package generation. See `../detection-rules/compliance-dashboard-guide.md`.
- **Alert Coverage** views in Elastic Security — raw alert investigation once the matrix identifies which category needs attention.

Use the matrix for *visual gap identification*; use the Attestation Dashboard for *evidence export*.

---

## 2. Dashboard Layout

The dashboard contains nineteen panels in five rows.

![M-26-14 Appendix B Coverage Matrix — color-coded 11-category tiles, KPI row, alert volume and detection rules bar charts, and full-detail coverage table](../screenshots/06-appendix-b-coverage.png)

### Row 0 — Navigation

| Panel | Type | Behavior |
|-------|------|----------|
| **← Back: M-26-14 Maturity Overview** | Links panel | Returns to the hub dashboard in the same tab, carrying the current time range and filters |

### Row 1 — KPI Metrics

Four metric panels summarizing posture. The first three always sum to 11.

| Panel | Color | What It Computes |
|-------|-------|------------------|
| **Fully Covered Categories** | Teal `#00BFB3` | `COUNT_DISTINCT(m_26_14.category)` where `coverage_status == "covered"` — active rules with alerts firing |
| **Partial Coverage** | Yellow `#FEC514` | Distinct categories where `coverage_status == "partial"` — rules deployed, low or no alerts |
| **No Coverage** | Orange `#E7664C` | Distinct categories where `coverage_status == "none"` — missing rules or missing data source |
| **Active Detection Rules** | Blue `#006BB4` | `MAX(m_26_14.rules_active)` per category, summed — total active rules across all 11 categories |

### Rows 2–3 — The 11 Category Tiles (A–K)

Eleven metric tiles, one per Appendix B category, arranged six across (A–F) and five across (G–K). Each tile shows:

- **Title** — category letter and name (e.g., "A: Identity Events")
- **Large value** — alert count for that category over the last 30 days (`MAX(m_26_14.alerts_30d)`)
- **Subtitle** — active rule count and coverage status (e.g., "4 rules | fully covered")
- **Tile color** — coverage status (see Section 3)

### Row 4 — Bar Charts

| Panel | Type | What It Shows |
|-------|------|---------------|
| **Alerts by Category — Last 30d** | Horizontal bar | Alert volume per category label, sorted descending — compares detection activity across all 11 categories |
| **Active Detection Rules by Category** | Horizontal bar | Rule count per category, sorted descending — identifies categories where rules exist but have not fired |

### Row 5 — Full-Detail Table

| Panel | Type | Columns |
|-------|------|---------|
| **Appendix B Coverage — Full Detail** | Data table | `category` (a–k, sorted ascending), `label`, `status`, `rules`, `alerts` — one row per category; this is the audit-ready evidence export |

---

## 3. Color Coding & Status Definitions

| Color | Hex | Status | Definition |
|-------|-----|--------|------------|
| Teal | `#00BFB3` | `covered` | One or more active detection rules mapped to the category **and** alerts produced in the last 30 days. The detection pipeline is demonstrably working. |
| Yellow | `#FEC514` | `partial` | Rules are deployed but alert evidence is sparse or absent — e.g., a threat-intel feed not yet connected, or a rule that only fires under rare conditions. Functional but not fully evidenced. |
| Orange/Red | `#E7664C` | `none` | No active rules mapped to the category, or rules exist with zero alerts and no corroborating signal. A confirmed coverage gap requiring a POA&M entry. |

The status value is computed by the `m_26_14-alert-coverage-daily` transform and stored in `m_26_14.coverage_status`; the dashboard renders it, it does not recompute it.

---

## 4. The 11 Appendix B Categories

OMB M-26-14 Appendix B defines eleven mandatory log categories. The matrix maps each to a tile:

| Cat | Tile Label | Telemetry Represented |
|-----|-----------|------------------------|
| **A** | Identity Events | Authentication, logon/logoff, MFA, identity-provider events |
| **B** | Network Sessions | Network flow, session establishment/teardown, VPN and remote-access sessions |
| **C** | Object/Resource Access | File, database, and object-store access; resource read/write operations |
| **D** | Privilege Changes | Privilege escalation, role/group membership changes, sudo and admin grants |
| **E** | Infrastructure Changes | Configuration changes to servers, cloud resources, and network devices |
| **F** | Security Tool Alerts | Native alerts from EDR, AV, IDS/IPS, and other deployed security tooling |
| **G** | IoC Monitoring | Indicator-of-compromise matching against threat-intelligence feeds |
| **H** | Anomalous Activity | Behavioral/ML anomaly detection (unusual logins, deviations from baseline) |
| **I** | Data Volume / Exfil | Outbound data-volume monitoring and exfiltration indicators |
| **J** | Attack Vectors | Known attack-chain and exploitation patterns (e.g., APT kill-chain sequences) |
| **K** | Automated Alerts | Meta-coverage: automated alerting on the alerting pipeline itself (Rule K) |

Categories A–J each map to one or more dedicated detection rules; Category K is satisfied by the meta-coverage rule that verifies rules A–J are alerting.

---

## 5. How to Use for AO Reporting

1. **Set the time range** to the reporting period (default: last 30 days, matching the `alerts_30d` window).
2. **Read the KPI row first.** A clean submission shows Fully Covered = 11, Partial = 0, No Coverage = 0. Any non-zero "No Coverage" value blocks submission until remediated or documented.
3. **Scan the tile grid for non-teal tiles.** Each yellow or orange tile is a finding. The subtitle tells you whether the issue is missing rules (e.g., "0 rules | no coverage") or rules without evidence (e.g., "1 rule | no alerts yet").
4. **Use the two bar charts to distinguish gap types.** A category present in the *Rules* chart but absent from the *Alerts* chart means rules are deployed but silent — verify the data source is flowing before concluding the rule is broken.
5. **Export the Full Detail table** (panel menu → *Download as CSV*) as the per-category evidence artifact. Its five columns (`category`, `label`, `status`, `rules`, `alerts`) map directly to an Appendix B readiness worksheet.
6. **Document residual gaps.** Any `partial` or `none` row requires a POA&M entry with a remediation date; attach the exported CSV and a dashboard screenshot to the AO package.
7. **Return to the Maturity Overview** via the back link to capture the agency-wide maturity score in the same evidence package.

---

## 6. Data Sources & Refresh

| Component | Detail |
|-----------|--------|
| Index | `m_26_14-metrics-alert-coverage` |
| Key fields | `m_26_14.category`, `m_26_14.category_label`, `m_26_14.rules_active`, `m_26_14.alerts_30d`, `m_26_14.coverage_status`, `@timestamp` |
| Fed by | Transform `m_26_14-alert-coverage-daily`, which aggregates Appendix B-tagged alerts from `.alerts-security.*` |
| Refresh cadence | Transform syncs hourly; dashboard reflects the latest transform checkpoint |
| Query language | All panels use ES|QL against the metrics index — none query raw alert indices directly |

Because every panel reads the same pre-aggregated index, the matrix and the Readiness Attestation Dashboard always agree; discrepancies between them indicate a stale transform, not a data problem.

---

## 7. Troubleshooting

**All tiles show "No results" or dashes.** The metrics index is empty or the transform has not run. In Dev Tools:

```
GET m_26_14-metrics-alert-coverage/_count

GET _transform/m_26_14-alert-coverage-daily/_stats
```

If the count is 0, check the transform state — it should be `started` with a recent checkpoint. Restart if needed:

```
POST _transform/m_26_14-alert-coverage-daily/_start
```

**A category shows fewer than 11 rows / a tile is missing data.** Confirm all 11 categories exist in the index:

```
POST m_26_14-metrics-alert-coverage/_search
{
  "size": 0,
  "aggs": {
    "cats": { "terms": { "field": "m_26_14.category", "size": 11 } }
  }
}
```

A missing bucket means no alerts (and no seed document) exist for that category — verify the corresponding detection rule is enabled in **Security → Rules**.

**Tile values look stale.** Compare the newest document timestamp against the transform checkpoint:

```
POST m_26_14-metrics-alert-coverage/_search
{
  "size": 1,
  "sort": [{ "@timestamp": "desc" }]
}
```

If the latest document is more than ~2 hours old, the transform has stalled; check `_transform/.../_stats` for failure reasons.

**KPI counters don't sum to 11.** A category is emitting more than one `coverage_status` value within the time range (transform overlap) or the time range excludes the latest checkpoint. Widen the time range to at least 24 hours, or reset the transform:

```
POST _transform/m_26_14-alert-coverage-daily/_reset
POST _transform/m_26_14-alert-coverage-daily/_start
```

**Back link does not navigate.** The hub dashboard `m_26_14-maturity-overview` must be installed in the same space; re-import the readiness pack saved objects if it is missing.

---

*This guide covers the M-26-14 Appendix B Coverage Matrix as shipped in the `m_26_14` pack. For the companion Readiness Attestation Dashboard and detection rule documentation, see `../detection-rules/compliance-dashboard-guide.md`.*
