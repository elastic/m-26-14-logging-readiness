# M-26-14 Readiness Attestation Dashboard — User Guide

## 1. Overview

The **M-26-14 Readiness Attestation Dashboard** is a live, continuously-updated view of your agency's detection coverage across all eleven Appendix B event categories required by OMB Memorandum M-26-14 §5. It reads from a continuously-running Elasticsearch Transform (`m_26_14-metrics-alert-coverage`) that aggregates alert activity across the ten threat-category rules (A–J) plus the meta-coverage Rule K. The result is a single-screen answer to the question every AO asks before an ATO renewal: "Is the detection layer actually working right now, and can you prove it?"

### Who Uses This Dashboard

| Role | Primary Use |
|------|-------------|
| **ISSO** | Daily health check; generates evidence package for AO submissions; documents gaps and POA&M entries |
| **CISO** | Executive posture view; confirms readiness posture before ATO milestones; escalation decision support |
| **Authorizing Official (AO)** | Receives dashboard link or exported PDF as primary M-26-14 evidence; can query live posture directly |
| **SOC Lead** | Monitors for category-level coverage degradation before it becomes an audit finding |

### Where It Fits in the Continuous Readiness Workflow

The dashboard is the final stage of a fully automated pipeline:

1. Fleet agents collect telemetry across the network and endpoints.
2. Detection rules A–J evaluate that telemetry continuously (every 1 hour to 24 hours depending on the category).
3. Each alert written to `.alerts-security.*` carries Appendix B category tags.
4. The Elasticsearch Transform aggregates those alerts into per-category coverage metrics, updated every hour.
5. The dashboard reads the transform output and displays current posture — no manual queries, no spreadsheets, no weekend report-generation cycles.

This architecture is identical to how Elastic's own Cloud Security Posture Management (CSPM) integration works. The attestation dashboard is CSPM applied to M-26-14 detection coverage.

---

## 2. Dashboard Layout

The dashboard (`m_26_14-readiness-attestation-dash`) contains three primary panel groups. All panels read from the `m_26_14-metrics-alert-coverage` index, not from the raw `.alerts-security.*` store, which keeps load times fast regardless of total alert volume.

![M-26-14 Readiness Attestation dashboard — three coverage KPI metrics at top, 11-category evidence table in the middle, and alert volume bar chart at the bottom](../screenshots/07-compliance-attestation.png)

### Panel Group 1 — Coverage KPI Metrics (top row)

Three large metric panels showing current posture at a glance:

| Panel | What It Shows |
|-------|---------------|
| **Active Categories (of 11)** | Count of categories with `coverage_status = "covered"` — active rules with recent alerts. Target: 11. |
| **Partial Coverage** | Count of categories with rules deployed but low/no recent alerts (`coverage_status = "partial"`). |
| **Coverage Gaps** | Count of categories with no active rules or no alerts (`coverage_status = "none"`). Target: 0. |

The three panels always sum to 11. Any non-zero Coverage Gaps value requires investigation before an AO submission.

### Panel Group 2 — Category Evidence Table

A data table showing one row per Appendix B category (A through K). This is the primary readiness evidence panel.

| Column | What It Shows |
|--------|---------------|
| **category** | Appendix B letter (a–k). |
| **label** | Human-readable category name (e.g., "Identity Events", "Network Sessions"). |
| **status** | `covered` / `partial` / `none` — see Section 3 for definitions. |
| **rules** | Count of active detection rules mapped to this category. |
| **alerts** | Total alerts from this category in the last 30 days. A non-zero count confirms the detection pipeline is active. |

**How to read it:** All eleven rows should show `covered` for a clean AO submission. Any `partial` or `none` requires investigation and a POA&M entry before the evidence package is generated.

### Panel Group 3 — Alert Volume by Category

A horizontal bar chart showing cumulative alert counts per category over the selected time range (default: last 30 days). Categories are sorted by alert volume descending.

**How to interpret results:**
- A category with no bar (zero) that shows `covered` in the table indicates very recent coverage (within the transform sync window). Verify by checking the underlying alerts in Security.
- A category with no bar and `none` status is a confirmed coverage gap. Follow the investigation guide in Section 6.
- A dominant bar in one category may indicate a noisy rule that warrants tuning. High alert volume alone is not a problem, but very high volume from a single category (e.g., 10,000+ alerts where others show < 100) suggests false-positive investigation is warranted.

**Coverage score interpretation:**

| Active count | Meaning |
|-------------|---------|
| 11 of 11 | All categories active — proceed with AO submission |
| 10 of 11 | One category degraded — investigate before submitting |
| 8–9 of 11 | Two or three categories degraded — document in POA&M |
| < 8 of 11 | Significant coverage gaps — do not submit without remediation plan |

---

## 3. Color Coding Guide

The status color for each category in the Coverage Table and Score Gauge is determined by a Painless script in the transform pipeline. The thresholds are fixed and align with the continuous monitoring intent of M-26-14 §5.

### GREEN — Actively Monitoring

**Condition:** At least one alert fired in the last 30 days.

**What it means:** The detection rule is enabled, the required integrations are delivering telemetry, and the rule evaluated that telemetry within the readiness window. This category satisfies the M-26-14 continuous monitoring requirement.

**Action required:** None. Document the GREEN status in the evidence package.

### YELLOW — Check Required

**Condition:** The most recent alert fired between 31 and 90 days ago.

**What it means:** The detection pipeline for this category was active recently but has not produced an alert in over a month. This could mean:
- The rule is disabled or was accidentally disabled during a rule update.
- The required data integration was removed from a Fleet policy.
- The data stream is healthy but normal activity has not crossed the detection threshold (possible for high-threshold rules like Category I Exfiltration Volume).
- A scheduled maintenance suppression is active.

**Action required:** Before submitting to the AO, investigate and document the finding. If the category is genuinely degraded, create a POA&M entry. If the silence is expected (e.g., a planned maintenance window), document the suppression context.

### RED — Coverage Gap

**Condition:** No alert has fired in 90 or more days, or the category has never produced an alert.

**What it means:** This category has no verified coverage. From an AO perspective, a RED category is equivalent to a missing control. The detection rule may be misconfigured, the required integration may be absent, or the data stream may have been offline for an extended period.

**Action required:** This requires urgent investigation before any AO submission. A RED status should generate an immediate POA&M entry. Do not submit an evidence package containing a RED category without a documented remediation plan and target date. See Section 6 for troubleshooting steps.

---

## 4. How to Use for AO Reporting

The following procedure produces a complete M-26-14 evidence package. Allow 30–60 minutes for the first package. Subsequent packages take 10–15 minutes once the workflow is familiar.

### Step 1 — Open the Dashboard and Verify Time Range

Navigate to **Kibana > Dashboards > M-26-14 Readiness Attestation — Appendix B Detection Coverage**.

Verify the time picker in the upper right is set to **Last 30 days**. The readiness score and category table use a 30-day window by convention. Changing this range will alter what is shown in the Alert Volume Trend but should not affect the Category Coverage Table (which uses absolute timestamps from the transform) or the Readiness Score (which is based on the 30-day status field).

### Step 2 — Review the Category Coverage Table

Inspect all eleven rows in the Category Coverage Table.

- All GREEN: proceed to Step 4.
- Any YELLOW or RED: proceed to Step 3.

### Step 3 — Investigate and Document Any Non-GREEN Categories

For each YELLOW or RED category:

1. Note the category letter, last fired date, and days since last alert.
2. Follow the investigation checklist in Section 6.
3. Determine whether the silence is a true coverage gap (data or rule issue) or a documented and expected condition (maintenance window, known low-activity period).
4. If a true gap: create a POA&M entry and attempt remediation before submission. If remediation is not possible before the submission deadline, document the gap in the evidence package with root cause, discovery date, and remediation timeline.
5. If an expected condition: attach documentation (Fleet change ticket, maintenance window record) to the evidence package.

### Step 4 — Take a Screenshot of the Coverage Table

Capture a screenshot of the Category Coverage Table showing all eleven categories and their current status. This screenshot is Exhibit A of your evidence package.

If any categories were YELLOW/RED and were remediated during Step 3, confirm the dashboard has refreshed (the transform syncs every hour) and capture the post-remediation screenshot.

### Step 5 — Export the Dashboard as a PDF

1. In the top navigation bar, select **Share**.
2. Select **PDF Reports**.
3. In the report dialog, confirm the time range matches your evidence period (typically the last 30 days or the current quarter).
4. Select **Generate PDF**.
5. When the report is ready (typically 1–3 minutes), download it from **Stack Management > Reporting**.

The PDF captures all three dashboard panels in a format suitable for attachment to formal submissions and audit files.

### Step 6 — Assemble and Submit the Evidence Package

Attach to your M-26-14 submission package:

- The exported PDF (readiness score, coverage table, alert volume trend).
- Any POA&M entries created or updated during the review.
- For YELLOW/RED categories: the investigation notes and remediation documentation.
- The Rule K attestation record (visible in the dashboard as the last Rule K fire timestamp), which confirms the meta-coverage health check ran successfully.

Submit the package to the AO per your agency's ATO submission process.

---

## 5. The "Wow" Scenario

It is 3:15 PM on a Friday. The Authorizing Official has just emailed requesting M-26-14 readiness evidence by end of business.

Two years ago, this email would have triggered a three-week cycle: the ISSO emails the security team lead, the security team lead pulls alert counts from the SIEM, the ISSO reformats the data into a spreadsheet, the security director reviews the spreadsheet, the CISO signs off, the package is emailed to the AO's office on week three — and sometimes the AO asks a follow-up question that restarts the cycle.

Today the ISSO opens a browser.

The M-26-14 Readiness Attestation Dashboard loads. The Readiness Score Gauge reads **82%**. Nine of eleven categories are GREEN. The ISSO checks the Category Coverage Table.

Category I (Exfiltration Volume) is YELLOW. Last alert: 34 days ago. Days since: 34.

The ISSO clicks through to the Alert Volume Trend for Category I. A clear dropoff is visible: Category I had steady daily alert volume for months, then went flat 35 days ago. Not a gradual decline. A cliff.

The ISSO navigates to Fleet > Agents and filters for the network monitoring group. The Zeek integration is missing from the Fleet policy. A check of the Fleet policy change log shows: 35 days ago, a network engineer updated the Fleet policy to adjust a different integration and accidentally removed the Zeek input.

The ISSO re-deploys the Zeek integration via Fleet. The Fleet policy update rolls out to the network monitoring agents in under two minutes.

The ISSO waits. The Zeek `logs-zeek.connection-*` data stream begins indexing within five minutes. Twenty minutes later, the Category I exfiltration volume rule completes its next hourly evaluation. It fires on the resumed network traffic — backup jobs running on the usual Friday afternoon schedule.

The ISSO refreshes the readiness dashboard. Category I is GREEN. Readiness Score: **100%**.

The ISSO clicks **Share > PDF Reports**, selects the last 30 days, and generates the export. Three minutes later, the PDF is downloaded: all eleven categories GREEN, score 100%, all three dashboard panels captured.

Total elapsed time: 47 minutes. Total active ISSO effort: approximately 12 minutes of investigation, 3 minutes of Zeek redeployment, 5 minutes of report generation.

The ISSO attaches the PDF to an email to the AO: "Please find the M-26-14 readiness evidence attached. All eleven Appendix B categories are actively monitored as of this afternoon. A brief gap in Category I (Exfiltration Volume) between April 25 and today was caused by an inadvertent Fleet policy change; Zeek has been redeployed and Category I is confirmed active. I am documenting the gap and root cause in a POA&M entry."

The AO responds in 20 minutes: evidence accepted, condition noted in the ATO renewal.

**The old process: 3 weeks. The new process: 47 minutes.** The difference is not heroic effort by the ISSO. The difference is that the readiness evidence was already assembled, continuously, by the pipeline — the ISSO just had to look at it and press Export.

---

## 6. Troubleshooting

### Dashboard Shows "No Data" on All Panels

The `m_26_14-metrics-alert-coverage` index has no documents, or the dashboard data view is pointing at the wrong index.

**Check:** Run the following in Dev Tools > Console:
```
GET m_26_14-metrics-alert-coverage/_count
```

If the count is zero, the transform has not run or no M-26-14-tagged alerts exist yet.

**Fix — seed test data:** Run the setup script with the test data flag:
```bash
python3 scripts/setup_ws7_dashboard.py --seed-test-data
```

This injects synthetic M-26-14 alerts with realistic timestamps and category tags into `.alerts-security.*` and waits for the transform to process them.

**Fix — verify the transform is running:** Open **Kibana > Stack Management > Transforms**. Find `m_26_14-metrics-alert-coverage`. Status should be `started`. If it shows `stopped` or `failed`, click Start. If it shows a health error, check the transform details for the specific failure message (common cause: the destination index mapping has a conflict with a previous version; delete and recreate the index, then restart the transform).

### Category Always Shows RED

The category has no alerts in 90+ days. This could be a first-install condition (rule was never enabled) or a persistent gap.

**Check 1 — Rule enabled:** Navigate to **Kibana Security > Rules**. Filter by the tag `Appendix-B-<LETTER>` (e.g., `Appendix-B-I`). Confirm the rule is **Enabled** and has a recent **Last run** timestamp. If the rule shows errors in the execution log, resolve the rule-level error first.

**Check 2 — Data stream exists:** In Dev Tools, run:
```
GET logs-zeek.connection-default/_stats/docs
```
Replace the index pattern with the relevant data stream for the category (see the Category K investigation guide for the category-to-data-stream mapping). If the index does not exist or has zero recent documents, the integration is not running.

**Check 3 — Tags are correct on alerts:** Run:
```
GET .alerts-security.*/_search
{
  "query": { "term": { "kibana.alert.rule.tags": "M-26-14" } },
  "size": 1
}
```
If this returns zero results, no M-26-14-tagged alerts exist. Confirm the detection rules were imported from the readiness pack and not manually recreated without the required tags.

### Transform Not Running or Showing Health Errors

Open **Kibana > Stack Management > Transforms**. Select `m_26_14-metrics-alert-coverage` and check the **Health** tab for error details.

Common causes:
- **Index privilege error:** The transform user (typically `elastic` or a dedicated service account) does not have read access to `.alerts-security.*`. Grant the `read` privilege on the `.alerts-security.*` index pattern to the transform's user context.
- **Destination index conflict:** A prior version of the transform created the `m_26_14-metrics-alert-coverage` index with an incompatible mapping. Stop the transform, delete the destination index, and restart the transform. The transform will recreate the index with the correct mapping.
- **Cluster disk watermark:** The cluster is at or near the high disk watermark. Elasticsearch blocks writes, including transform output. Free disk space and clear the read-only flag: `PUT m_26_14-metrics-alert-coverage/_settings { "index.blocks.read_only_allow_delete": null }`.

### Coverage Score Is Wrong (Not Matching Category Count)

The Readiness Score Gauge calculates `(GREEN categories) / 11 × 100%`. If the denominator appears wrong (e.g., the score shows 9/10 but ten categories are GREEN), the `m_26_14-rule-registry` index may be missing one or more category documents.

**Check:**
```
GET m_26_14-rule-registry/_count
```
Expected: 11 documents (one per category A through K).

If the count is less than 11, the registry is incomplete. Re-run the setup script:
```bash
python3 scripts/setup_ws7_dashboard.py --reload-registry
```

Or bulk-load the registry fixture directly:
```bash
curl -X POST "http://localhost:9200/_bulk" \
  -H "Content-Type: application/x-ndjson" \
  --data-binary @tests/ws5_detection/fixtures/fixture_k_registry.ndjson
```

---

## 7. Technical Architecture

Understanding the data flow helps diagnose problems at the right layer.

```
Fleet Agents (Elastic Defend, Zeek, Sysmon, Azure AD, Okta, Palo Alto)
    |
    v
Elasticsearch Data Streams
(logs-endpoint.events.*, logs-zeek.connection*, logs-azure.signinlogs*, ...)
    |
    v
Detection Rules A through J  [Kibana Security — runs every 1h to 24h]
    |  Each rule writes alerts to .alerts-security.*
    |  Each alert carries tags: ["M-26-14", "Appendix-B-<LETTER>"]
    |
    v
Rule K — Coverage Gap Monitor  [runs every 24h]
    |  Reads .alerts-security.*, confirms each category A-J produced alerts
    |  Writes health confirmation alerts with tag "Coverage-Health"
    |
    v
Alert Category Normalization Ingest Pipeline
    |  Promotes the Appendix-B tag from the tags array to a dedicated
    |  m_26_14.appendix_b_category keyword field on each incoming alert
    |
    v
ES Transform: m_26_14-metrics-alert-coverage  [syncs every 1 hour]
    |  Source:  .alerts-security.* (filtered to M-26-14 tagged alerts)
    |  Groups:  m_26_14.appendix_b_category + 1-day date bucket
    |  Metrics: alert_count, last_fired timestamp, derived days_since_last_fire
    |  Status:  Painless script computes GREEN/YELLOW/RED per row
    |  Dest:    m_26_14-metrics-alert-coverage index
    |
    v
Kibana Compliance Attestation Dashboard
    Panel 1:  Category Coverage Table (status per category)
    Panel 2:  Alert Volume Trend (area chart, 30-day window)
    Panel 3:  Compliance Score Gauge (pct of categories GREEN)
```

**Why the transform layer matters:** The dashboard reads the small, pre-aggregated `m_26_14-metrics-alert-coverage` index — not the full `.alerts-security.*` store, which can contain millions of records. This means dashboard load time is sub-second regardless of the cluster's total alert volume. The transform does the heavy aggregation once per hour in the background, not on every dashboard load.

**The normalization pipeline is the critical dependency.** The Appendix B category letter lives in a tags array on each alert. The transform cannot pivot on an array element directly; the ingest pipeline extracts it to a dedicated field at alert write time. If this pipeline is not installed and wired to the `.alerts-security.*` index template, the `m_26_14.appendix_b_category` field will not exist on alerts, and the transform will produce no useful output. Verifying this pipeline is present and active is the first diagnostic step when the dashboard shows no data.

---

## 8. Dashboard Navigation Drilldowns

The **M-26-14 Maturity Overview** dashboard serves as the hub. A horizontal navigation links panel at the top of that dashboard provides one-click access to every compliance dashboard. The time range and active KQL filters are inherited by each drilldown target.

![M-26-14 Maturity Overview — navigation links panel at top, six element score metrics, and 30-day trend charts](../screenshots/01-maturity-overview.png)

| Link Label | Target Dashboard | Purpose |
|---|---|---|
| Elements 1 & 2 — Asset Coverage | `m_26_14-asset-coverage` | HWAM enrollment gaps and log source coverage |
| Element 3 — Appendix B Matrix | `m_26_14-appendix-b-coverage` | MITRE-style coverage matrix for all 11 categories |
| Element 3 — Alert Coverage | `m_26_14-alert-coverage` | Per-category alert volume and rule activity |
| Element 4 — Retention Compliance | `m_26_14-retention-readiness` | ILM policy compliance per data stream |
| Element 5 — Log Integrity | `m_26_14-log-management` | SHA-256 hash coverage and integrity violations |
| Attestation Report | `m_26_14-readiness-attestation-dash` | Executive attestation scorecard |

---

## 9. Appendix B Coverage Matrix

The **M-26-14 Appendix B Coverage Matrix** (`m_26_14-appendix-b-coverage`) is a companion dashboard modeled after the Elastic MITRE ATT&CK Coverage view. It provides a heat-map-style view of all eleven mandatory log categories.

![M-26-14 Appendix B Coverage Matrix — color-coded 11-category tiles, KPI row, alert volume and detection rules bar charts, and full-detail coverage table](../screenshots/06-appendix-b-coverage.png)

### Layout

| Section | Content |
|---|---|
| KPI row (top) | Four counters: Fully Covered, Partial Coverage, No Coverage, Total Active Rules |
| Category cells | One cell per Appendix B category (A–K). Cell color = coverage status; cell value = alert count last 30 days |
| Alerts by Category bar chart | Horizontal bar chart — alert volume comparison across all 11 categories |
| Active Detection Rules by Category bar chart | Rule count per category — identifies categories where rules exist but haven't fired |
| Full Detail table (bottom) | All 11 rows: `category`, `label`, `status`, `rules`, `alerts` — audit-ready evidence export |

### Color Coding

| Color | Hex | Meaning |
|-------|-----|---------|
| Teal | `#00BFB3` | Fully covered — active rules with recent alerts |
| Yellow | `#FEC514` | Partial coverage — rules present, some categories sparse |
| Orange/Red | `#E7664C` | No coverage — no active rules or zero alerts |

### Data Source

Same source as the Compliance Attestation Dashboard: the `m_26_14-metrics-alert-coverage` index populated by the `m_26_14-alert-coverage-daily` transform. Coverage matrix data refreshes every hour.

---

*This guide covers the M-26-14 Compliance Attestation Dashboard and companion dashboards as shipped in the `m_26_14` pack. For detection rule documentation, see the individual rule guides in this directory. For architecture decisions and Phase 2 roadmap, see `wow-scenario-compliance-attestation.md`.*
