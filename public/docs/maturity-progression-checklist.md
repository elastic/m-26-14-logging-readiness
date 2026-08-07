# M-26-14 Maturity Level Progression Checklist

**Purpose:** Step-by-step guide for agencies using the Elastic M-26-14 Compliance Pack to achieve and maintain each maturity level across all five Appendix C elements.

**Scoring:** Overall maturity = lowest level across all five elements (lowest watermark). Advance the weakest element first.

**Timelines (from CISA LRA publication, ~August 2026):**
- Level 1 (Initial): LRA + 120 days
- Level 2 (Intermediate): LRA + 180 days
- Level 3 (Advanced): LRA + 320 days
- Level 4 (Optimal): No mandatory deadline

---

## Before You Begin: Prerequisites

Complete these before targeting any specific level:

- [ ] Elastic cluster deployed (Cloud or self-managed, Kibana ^8.16 or ^9.x)
- [ ] Fleet Server running and accessible to all agent-eligible hosts
- [ ] Snapshot repository configured (`m_26_14-readiness-snapshots`) pointing to S3/GCS/Azure Blob (GovCloud recommended)
- [ ] M-26-14 Compliance Pack installed (`elastic-package install` or Kibana Fleet → Integrations)
- [ ] At least one alert connector configured (email, Slack, ServiceNow, or PagerDuty) in Kibana → Stack Management → Connectors
- [ ] Agency Logging Plan drafted (template: `docs/agency-logging-plan-template.md`)
- [ ] HVAs and High Impact Systems identified per OMB M-19-03 and FIPS 199
- [ ] Elasticsearch audit logging enabled (`xpack.security.audit.enabled: true`) — required for Element 5 permission monitoring at L4, and far easier to enable on day 1 than to retrofit. On Elastic Cloud Hosted, enable via deployment user settings.

### Day-1 Retention Design (read before Element 4 anywhere below)

**Deploy the Hot/Frozen ILM architecture on day 1, regardless of your current maturity level.** The pack's recommended deployment design is Hot → Frozen (H/F), optionally Hot → Cold → Frozen (H/C/F) for cost/latency tuning. With searchable snapshots on the frozen tier, a single H/F policy delivers full searchability across the entire retention window from the first day — there is no reason to deploy a weaker retention design at L1/L2 and re-architect later.

What changes as you progress is **policy parameters and governance, never the tiering design**:

| Policy | Hot → Frozen at | Delete | Use when |
|---|---|---|---|
| `m_26_14-logs-l3-hot-frozen` | 90 days | 365 days (ILM auto) | L3 target, before two-gate retirement is deployed |
| `m_26_14-logs-l3-no-delete` | 90 days | none — two-gate workflow governs retirement | L3 target with WS6 two-gate retirement |
| `m_26_14-logs-l4-hot-frozen` | 180 days | 365 days (ILM auto) | L4 searchability target, before two-gate retirement |
| `m_26_14-logs-l4-no-delete` | 180 days | none — two-gate workflow governs retirement | **L4 / recommended end state** |

All four are the same H/F architecture (hot rollover at 1d/50GB, frozen via searchable snapshot on the snapshot repository). At L1/L2, deploying any of these policies already exceeds the 6-month/12-month *retrievable* requirements — the per-level Element 4 checklist items below verify thresholds, they do not require different architectures.

> **Snapshot repository note:** On Elastic Cloud Hosted, the built-in `found-snapshots` repository backs the frozen tier's searchable snapshots — no setup needed. Self-managed clusters must register an S3/GCS/Azure repository before the frozen phase can mount searchable snapshots.

---

## Level 0 → Level 1 (Initial)

**Deadline:** LRA + 120 days  
**Overall goal:** Basic logging infrastructure in place, logs retained 6 months, alerts generating for some threat categories

### Element 1 — Inventory Visibility: ≥70% of IT/OT/IoT assets in centralized inventory

- [ ] **Deploy Elastic Agent on all Windows endpoints**  
  Fleet → Enrollment Tokens → Create policy for Windows servers and workstations.  
  Include: Windows integration (Security + System + Application event logs), Elastic Endpoint (EPP mode at minimum)

- [ ] **Deploy Elastic Agent on all Linux endpoints**  
  Fleet → Enrollment Tokens → Create policy for Linux servers.  
  Include: System integration (auth + syslog), auditd_manager integration

- [ ] **Enable osquery M-26-14 inventory pack**  
  Fleet → Agent Policies → Add integration → Custom osquery → import `fleet_package_policy/m_26_14_asset_inventory_pack.yaml`  
  Schedules: hardware inventory every 6h, software inventory every 6h, ARP cache every 1h

- [ ] **Verify ≥70% of known assets enrolled**  
  WS1 Dashboard → Element 1 panel → "Inventory coverage %" ≥ 70  
  If below 70%: identify unenrolled hosts by comparing Fleet enrollment against existing asset inventory (AD, CMDB, CDM)

- [ ] **For agencies with CDM tools (Tenable, ForeScout, Qualys, CrowdStrike):**  
  Configure WS2 CDM integration policy for your tool (`fleet_package_policy/m_26_14-cdm-{tool}-defaults.json`)  
  This populates `m_26_14-hwam-assets` and `m_26_14-swam-software` indices as the authoritative inventory denominator

### Element 2 — Collection Coverage: ≥50% of inventoried assets producing logs, timely aggregation

- [ ] **Verify enrolled agents are producing logs**  
  Kibana → Discover → `logs-*` → filter `agent.status: online` → confirm recent events from ≥50% of enrolled hosts

- [ ] **Confirm ingestion latency within recommended SLA**  
  Run: `FROM logs-* | EVAL lag = DATE_DIFF("minutes", @timestamp, event.ingested) | STATS avg_lag = AVG(lag) BY data_stream.dataset`  
  Target: auth/EDR logs ≤2 min; network/infra logs ≤15 min

- [ ] **For network devices without agents:**  
  Configure syslog input (Logstash or Elastic Agent syslog integration) for firewalls, routers, switches.  
  OR enable NetFlow on network devices → configure `netflow` Logstash integration

### Element 3 — Collection Operations: Logs generating alerts for <50% of Appendix B categories (on track for L1)

At L1, you are not required to cover 50%+ — you are at L1 when alerts exist and are referenced in investigations, even ad hoc. Enable all 11 compliance pack detection rules and confirm at least some are firing.

- [ ] **Enable all Appendix B detection rules**  
  Kibana → Security → Rules → search "m_26_14" → enable all 11 `m_26_14-appendixb-*` rules  
  Rules: `a` (identity), `b` (network/C2), `c` (file access), `d` (privilege), `e` (infra changes), `f` (EDR tamper), `g` (IoC — when available), `h` (off-hours), `i` (exfil volume), `j` (APT chain), `k` (coverage gap meta-rule)

- [ ] **Verify at least one connector is assigned to each rule**  
  Rules without connectors produce alerts in the SIEM but don't notify anyone — this risks the "ad hoc" limitation. Assign at minimum the email connector to all 11 rules.

- [ ] **Confirm alert firing in SIEM**  
  Kibana → Security → Alerts → confirm alert events visible. If no alerts in 7 days: check data source availability per rule, verify time window and threshold settings.

### Element 4 — Data Retention: Logs retrievable for ≥6 months

- [ ] **Apply the Day-1 H/F ILM policy to all log data streams** (see "Day-1 Retention Design" above)  
  `PUT _index_template/logs-default-m_26_14 { "index_patterns": ["logs-*"], "template": { "settings": { "index.lifecycle.name": "m_26_14-logs-l3-hot-frozen" } }, "priority": 50 }`  
  This already exceeds the L1 6-month retrievable requirement — and the L2 12-month one. Do not deploy a shorter-lived interim policy.

- [ ] **Verify snapshot repository connectivity**  
  Elastic Cloud Hosted: `GET _snapshot/found-snapshots` (built in). Self-managed: `GET _snapshot/m_26_14-readiness-snapshots/_all` → confirm snapshots exist and repository is reachable

- [ ] **Confirm WS1 retention dashboard shows ≥6 months for all data streams**  
  WS1 Dashboard → Element 4 panel → "Retention compliance" → all streams green at 6-month threshold

### Element 5 — Log Management: Logs are stored

- [ ] **Verify data is flowing into Elasticsearch**  
  This is trivially satisfied by completing Elements 1-2 above. Any data in Elasticsearch satisfies L1.

---

## Level 1 → Level 2 (Intermediate)

**Deadline:** LRA + 180 days  
**Overall goal:** 80% asset coverage with daily inventory updates, 12-month retrieval, encrypted at rest, 50-70% alert category coverage with periodic tuning

### Element 1 — Inventory Visibility: ≥80%, updated daily

- [ ] **Identify remaining 20-30% unenrolled assets**  
  WS1 Dashboard → Element 1 → "Coverage gaps" list → categorize by type (server/network/OT/IoT/unknown)

- [ ] **For network devices:** confirm syslog/NetFlow data arriving and mapped to `host.name` in ECS  
  Add to denominator: mark as "log-covered" in `m_26_14-asset-ground-truth` index even without an agent

- [ ] **Confirm daily inventory updates**  
  osquery inventory pack is scheduled at 6h intervals — satisfies "daily" requirement automatically.  
  For CDM tools: confirm polling interval in WS2 integration policy is ≤24h.

- [ ] **For OT/IoT assets (where applicable):**  
  Deploy Zeek or Suricata on a network TAP/SPAN at the OT network perimeter → passive asset discovery via DHCP, DNS, ARP.  
  OR deploy OT security platform integration (Claroty, Dragos, Nozomi) if available.  
  See: `docs/reference-architecture/purdue-model-ot.md`

### Element 2 — Collection Coverage: ≥80%, timely aggregation

- [ ] **Audit log type completeness per asset**  
  Every enrolled agent must produce auth + process/command + network events to count as "covered."  
  Run coverage check: `FROM logs-* | STATS event_categories = COUNT_DISTINCT(event.category) BY host.name | WHERE event_categories < 3 | SORT event_categories ASC`  
  Hosts with <3 distinct event categories need additional integrations enabled.

- [ ] **Fill integration gaps:**
  - Windows: enable all three event log channels (Security + System + Application) + Endpoint Behavior enabled
  - Linux: confirm auditd rules are loaded (`service auditd status`; `auditctl -l`)
  - Cloud: enable cloud provider audit log integrations (AWS CloudTrail, Azure Activity Logs, GCP Audit Logs) for cloud assets

- [ ] **Confirm ingestion latency meets SLA**  
  If ingestion lag > recommended thresholds: check Elastic Agent pipeline queue depth, Fleet Server capacity, network path MTU issues

### Element 3 — Collection Operations: 50-70% of Appendix B categories covered, periodic tuning

50-70% = 6-8 of 11 categories generating actionable alerts. "Periodically evaluated and tuned" = quarterly minimum.

- [ ] **Verify alert coverage per category**  
  WS1 Dashboard → Element 3 → "Alert coverage by category" → identify categories with 0 alerts in 30 days

- [ ] **For each 0-alert category:**
  - Check: is the relevant data source flowing? (example: category `b` needs network session logs — is Zeek/NetFlow/firewall data present?)
  - If data present but rule not firing: review rule threshold/conditions; tune for agency baseline
  - If data not present: add the integration before tuning the rule

- [ ] **Establish quarterly tuning cadence**  
  Schedule a 2-hour recurring calendar block: review alert volume, false positive rate, and missed-detection indicators for all 11 rules. Document in the Agency Logging Plan.

- [ ] **Assign alert ownership per category**  
  Each Appendix B category rule should have a named SOC owner. Ownerless alerts go uninvestigated. Document ownership in Agency Logging Plan.

### Element 4 — Data Retention: Retrievable for ≥12 months

- [ ] **No policy change needed if you followed the Day-1 design**  
  The Day-1 `m_26_14-logs-l3-hot-frozen` policy already retains 365 days (frozen searchable snapshots) — the L2 12-month retrievable requirement is met. Verify it is still applied:  
  `GET logs-*/_settings?filter_path=**.lifecycle.name`

- [ ] **Confirm cost implications**  
  12 months via frozen tier adds minimal cost (frozen = ~10% of hot cost; data lives in object storage).  
  Run: `GET _cat/indices/logs-*?h=index,store.size&s=store.size:desc` to identify largest data streams for cost planning. If hot-tier latency/cost balance needs tuning, this is the point to consider the optional H/C/F variant — add a cold phase, keep the same frozen endpoint.

### Element 5 — Log Management: Encrypted at rest

- [ ] **Elastic Cloud deployments:**  
  Encryption at rest is enabled by default using the cloud provider's KMS. No action required.  
  Verify: Elastic Cloud Console → Deployment → Security → "Encrypted at rest: enabled ✓"

- [ ] **Self-managed deployments:**  
  Enable node-level disk encryption on all Elasticsearch nodes:
  - Linux: LUKS full-disk encryption on data volumes (`cryptsetup luksFormat /dev/sdb`)
  - Windows: BitLocker on data drives
  - Verify: `elasticsearch.yml` security features enabled (`xpack.security.enabled: true`)

- [ ] **Document encryption attestation**  
  Record encryption method and key management approach in Agency Logging Plan. Auditors will request this.

---

## Level 2 → Level 3 (Advanced)

**Deadline:** LRA + 320 days  
**Overall goal:** 90% asset coverage, 3-month searchable + 12-month retrievable, TLS + hashing, 70%+ alert categories with routine tuning

### Element 1 — Inventory Visibility: ≥90%, updated daily

- [ ] **Address the hard 10%** — typically: OT/IoT devices, legacy systems, printers, VoIP phones, thin clients
  - OT/IoT without agent: Zeek + Claroty/Dragos/Nozomi integration (see Gap 4 discussion)
  - Legacy systems: syslog output where available; document as exception where not
  - Printers/VoIP: low security value — document exceptions with ISSO sign-off

- [ ] **Validate daily update frequency for all asset classes**  
  WS1 Dashboard → Element 1 → "Last inventory update" column → all assets showing update within 24h

- [ ] **Document all exceptions**  
  Maintain `m_26_14-asset-exceptions` index (or CSV register) listing assets excluded from coverage, with reason, ISSO approval, and compensating control. Exception list is required for auditor review.

### Element 2 — Collection Coverage: ≥90%, timely aggregation

- [ ] **Achieve per-asset log type completeness for 90% of inventory**  
  Each enrolled asset produces: auth events, process/command events, network connection events, file access events (servers), security alert events (endpoints with Elastic Endpoint).

- [ ] **Enable Elastic Endpoint behavioral protection** on all agent-eligible endpoints  
  Fleet → Agent Policies → Elastic Endpoint → Protection: "Detect" or "Prevent" mode.  
  This adds behavior-based events (process injection, memory anomaly, network behavior) that satisfy §5(f) and §5(j) without additional integrations.

- [ ] **Configure ingestion latency monitoring rule**  
  Enable `m_26_14-e2-ingestion-lag.ndjson` rule → fires when log category exceeds SLA threshold.  
  Assign connector for immediate ISSO notification.

### Element 3 — Collection Operations: ≥70% of Appendix B categories, routinely evaluated and tuned

70%+ = 8 or more of 11 categories generating actionable alerts. "Routinely" = monthly tuning reviews.

- [ ] **Achieve ≥8 of 11 categories with active, tuned alerts**  
  WS1 Dashboard → Element 3 → confirm ≥8 categories showing green (alerts in last 30 days, false positive rate ≤20%)

- [ ] **Move from quarterly to monthly tuning**  
  Upgrade the quarterly tuning cadence to monthly. Each monthly review: check new false positives, adjust thresholds, review MITRE ATT&CK coverage for new TTPs.

- [ ] **Enable threat intelligence integrations for category (g)**  
  Install at minimum: abuse.ch integration (MalwareBazaar + URLhaus + Feodo Tracker — free)  
  AND CISA KEV integration → `m_26_14-appendixb-g-ioc-monitoring` rule can now fire on active IoC matches

- [ ] **Configure ES|QL behavioral rules** for categories where ML is not yet enabled  
  Category (h) off-hours rule is in pack. Add ES|QL anomaly approximations:  
  - Unusual country login: `COUNT_DISTINCT(source.geo.country_iso_code) > 3 BY user.name`
  - Lateral movement: EQL sequence rule for RDP/SMB to non-standard destinations

- [ ] **Document tuning decisions**  
  For each rule modification (threshold change, exclusion added, field filter added): record in the Agency Logging Plan "rule tuning log." Required for auditor review of "routinely evaluated and tuned."

### Element 4 — Data Retention: ≥3 months searchable + ≥12 months retrievable

- [ ] **Confirm the L3 policy variant**  
  Same H/F architecture as Day 1 — hot 0-90d, frozen 90d+ (searchable snapshot). If two-gate retirement (WS6) is deployed, switch to the no-delete variant so the workflow, not ILM, governs deletion:  
  `PUT _index_template/logs-default-m_26_14 { "template": { "settings": { "index.lifecycle.name": "m_26_14-logs-l3-no-delete" } } }`

- [ ] **Verify searchable coverage ≥3 months**  
  With searchable snapshots, frozen data is searchable too — the L3 "3-month searchable" requirement is met by the H/F design itself, with the most recent 90 days on hot for lowest latency.  
  WS1 Dashboard → Element 4 → "Searchable months" column should show ≥3 for all streams.

### Element 5 — Log Management: Encrypted in transit + at rest, regularly hashed

- [ ] **Enable TLS for all Elastic Agent communication**  
  Elastic Agent → Fleet Server communication uses TLS by default. Verify:  
  Fleet → Settings → Fleet Server hosts → confirm `https://` prefix.  
  For Logstash inputs: configure SSL certificate on Logstash input and Beats output.

- [ ] **Enable Elasticsearch inter-node TLS**  
  Self-managed: `xpack.security.transport.ssl.enabled: true` in `elasticsearch.yml`.  
  Verify: `GET _cluster/settings?filter_path=**.ssl`

- [ ] **Deploy WS4 log integrity hashing pipeline**  
  Apply `m_26_14-log-integrity-hash.json` as a final pipeline on all `logs-*` data streams:  
  `PUT _index_template/logs-default-m_26_14 { "template": { "settings": { "final_pipeline": "m_26_14-log-integrity-hash" } } }`

- [ ] **Verify hashing coverage ≥99%**  
  ```esql
  FROM logs-*
  | STATS total = COUNT(*), hashed = COUNT(*) WHERE event.integrity.hashed == true
  | EVAL pct = ROUND(hashed / total * 100, 2)
  ```
  Target: ≥99%. Unhashed events indicate pipeline bypass or failure — investigate `tags: m_26_14-hash-failure`.

- [ ] **Schedule daily integrity verification**  
  `tools/integrity_verify.py` re-computes SHA-256 hashes externally and reports tampered/unhashed documents. Run nightly (cron or CI). The `m_26_14-ml-element5-hash-coverage` ML job additionally alerts on hash coverage degradation in near-real-time.

---

## Level 3 → Level 4 (Optimal)

**Deadline:** No mandatory deadline — aspirational/ongoing  
**Overall goal:** 95% coverage, 6-month searchable + 12-month retrievable, JIT access, two-gate retirement, ML/AI detection

### Element 1 — Inventory Visibility: ≥95%, updated daily

- [ ] **Close remaining exceptions where possible**  
  Review the exceptions list. Any asset added 90+ days ago: re-evaluate — is there now a way to cover it?  
  Common resolution paths: vendor-provided syslog support released, OT platform integration matured, device EOL'd and decommissioned.

- [ ] **Deploy OT security platform if applicable**  
  Claroty, Dragos, or Nozomi provides deep OT/ICS asset inventory (including Levels 0-1 Purdue model assets that can't run agents). Configure the OT platform integration to feed `m_26_14-hwam-assets`.

- [ ] **Validate 95% threshold**  
  WS1 Dashboard → Element 1 → "Inventory coverage %" ≥ 95. Denominator = all known IT/OT/IoT assets per Agency Logging Plan scope.

### Element 2 — Collection Coverage: ≥95%, timely aggregation

- [ ] **Remaining 5% coverage gaps**  
  These are typically the same assets as the 5% inventory exceptions. Coverage follows inventory — if an asset is in inventory but unmanageable, document both inventory exception AND collection exception.

- [ ] **Confirm all cloud assets covered**  
  AWS: CloudTrail + VPC Flow Logs + GuardDuty → all three integrations enabled  
  Azure: Activity Logs + NSG Flow Logs + Defender alerts → integrations enabled  
  GCP: Cloud Audit Logs + VPC Flow Logs → integrations enabled

### Element 3 — Collection Operations: ≥95% of Appendix B categories, ML/AI tuning

95% of 11 = at least 10-11 categories with active, ML/AI-tuned alerts.

- [ ] **Enable Elastic ML anomaly detection suite** (requires Platinum/Enterprise subscription)  
  Kibana → Machine Learning → Anomaly Detection → import `m_26_14-ml-element3-rule-silence.json`  
  Behavioral jobs (Security ML modules, prefix-installed): `m_26_14_v3_rare_process_by_host_windows_ea`, `m_26_14_v3_rare_process_by_host_linux_ea`, `m_26_14_suspicious_login_activity_ea`, `m_26_14_auth_rare_source_ip_for_a_user_ea`, `m_26_14_auth_high_count_logon_fails_ea`, `m_26_14_low_count_events_for_a_host_name_ea`, `m_26_14_rare_destination_country`  
  Wait for initialization period (minimum 2 weeks of data for baseline to establish)

- [ ] **Connect ML anomaly scores to SIEM detection rules**  
  Create threshold-type detection rules that fire when ML anomaly score > 75 for Element 3 job results.  
  This satisfies the "ML or AI" tuning requirement for L4.

- [ ] **Enable Elastic AI Assistant for SOC** (requires Elastic AI Assistant feature, Enterprise subscription)  
  Kibana → Stack Management → AI Assistant → configure LLM connector (Elastic-hosted or OpenAI/Azure OpenAI endpoint)  
  Configure: Attack Discovery enabled, alert sources include all `.alerts-security.*` indices  
  See `docs/ai-ml-configuration-guide.md` for full configuration.

- [ ] **Enable Attack Discovery**  
  Kibana → Security → Attack Discovery → confirm data sources configured → run first discovery session  
  Review surfaced attack chains; assign to cases for investigation

- [ ] **Achieve 11/11 Appendix B category coverage**  
  WS1 Dashboard → Element 3 → all 11 categories green.  
  If category (g) IoC rule still missing: install from compliance pack update or WS5 separate workstream output.

### Element 4 — Data Retention: ≥6 months searchable + ≥12 months retrievable

- [ ] **Apply L4 no-delete ILM policy**  
  `m_26_14-logs-l4-no-delete.json`: same H/F architecture, hot 0-180d, frozen 180d+, no auto-delete.  
  `PUT _index_template/logs-default-m_26_14 { "template": { "settings": { "index.lifecycle.name": "m_26_14-logs-l4-no-delete" } } }`

- [ ] **Extended retention for HVA/HIS data streams** (recommended)  
  The pack ships `elasticsearch/ilm_policy/m_26_14-logs-hva-extended.json`: same Day-1 H/F architecture, hot 0-365d (12-month searchable window), frozen 365d+ (retrievable through 24 months and beyond), no auto-delete — retirement governed exclusively by the WS6 two-gate workflow. Apply selectively to HVA datasets:  
  `PUT logs-{hva-dataset}-*/_settings { "index.lifecycle.name": "m_26_14-logs-hva-extended" }`  
  Adjust the 365d hot timing to your agency records schedule if it differs.

- [ ] **Verify WS6 retirement workflow is deployed** (see Element 5 below)  
  L4 retention compliance requires that all future retirements go through the two-gate workflow. No ILM auto-delete phases may be active on any L4-targeted data stream.

### Element 5 — Log Management: JIT access + permission monitoring + two-gate retirement

This is the most complex element. Deploy WS6 in full.

**Part A: JIT Access + Permission Monitoring**

The pack ships a JIT access kit built on native Elasticsearch role mappings — a grant is a role mapping, not a user edit, so revocation is a single idempotent DELETE and never touches passwords:

| Asset | Purpose |
|---|---|
| `elasticsearch/index_template/m_26_14-jit-grants.json` | Grant register: one document per grant (`grant_id`, `username`, `role`, `expires_at`, `status`, `case_id`, `justification`, …) |
| `elasticsearch/watcher/m_26_14-jit-expiry.json` | Every 15 min: finds `status:active` grants past `expires_at`, deletes the backing role mapping `m_26_14-jit-{grant_id}` (instant revocation), writes a `status:expired` audit record |
| `elasticsearch/watcher/m_26_14-jit-audit.json` | Daily 13:00 UTC: inventories all active grants, appends a report to `m_26_14-jit-audit-reports` flagging grants active >72h (stale = violates just-in-time principle) |

- [ ] **Deploy the JIT kit**  
  `python scripts/deploy.py --only templates,watchers`

- [ ] **Establish JIT provisioning procedure**  
  ISSO opens a Kibana Case, then grants access in two steps:  
  1. `PUT _security/role_mapping/m_26_14-jit-{grant_id}` with `roles: [scoped-role]` and `rules: { field: { username: "{analyst}" } }`  
  2. Index a grant document into `m_26_14-jit-grants` with `status: active` and `expires_at`  
  Revocation (manual or by the expiry watcher) deletes the role mapping. Document the procedure in the Agency Logging Plan; each ISSO must be able to execute it.

- [ ] **Configure permission monitoring**  
  Enable Elasticsearch audit logging (`xpack.security.audit.enabled: true` — see Prerequisites; on Elastic Cloud Hosted, via deployment user settings).  
  Audit log destination: `logs-elasticsearch.audit-*` (Elastic Agent Elasticsearch integration).  
  Enable detection rules for unusual data access patterns (analyst accessing outside normal scope, bulk export).  
  Pair a detection rule or connector with `m_26_14-jit-audit-reports` for ISSO notification on stale grants.

**Part B: Two-Gate Retirement**

The pack ships the two-gate retirement workflow in two interchangeable implementations:

| Implementation | Assets | Character |
|---|---|---|
| **Elastic Workflows (primary, recommended)** | `kibana/workflow/m_26_14-data-retirement-gate1-detect.yaml`, `m_26_14-data-retirement-gate1-approval.yaml`, `m_26_14-data-retirement-gate2-execute.yaml`, `m_26_14-legal-hold-selective-copy.yaml`, `m_26_14-data-classification-intake.yaml` | Human-in-the-loop: visible run history in Kibana → Workflows, explicit step-through, easiest to audit and demo |
| **Watcher (autonomous variant)** | `elasticsearch/watcher/m_26_14-gate1-detect-frozen-aged.json`, `m_26_14-gate1-approval-advance.json`, `m_26_14-gate2-execute-deletion.json`, `m_26_14-selective-copy-legal-hold.json` | Scheduled, runs unattended; the legal-hold watch is registered **inactive** (its input performs a reindex — execute manually per hold) |

Deploy one (Workflows recommended); both write the same `m_26_14-retirement-requests` audit trail. Deploy via `python scripts/deploy.py --only workflows` or `--only watchers`.

- [ ] **Deploy retirement requests index template**  
  `elasticsearch/index_template/m_26_14-retirement-requests.json` (deployed by `scripts/deploy.py --only templates`)

- [ ] **Deploy the two-gate workflow set** (table above)  
  Gate 1 detects frozen indices reaching retirement age and opens an approval request; Gate 2 executes deletion only after both approvals are recorded.

- [ ] **Designate two-gate approvers**  
  Minimum two individuals in the approver pool:
  - Approver 1: ISSO (information system security officer)
  - Approver 2: Records Officer or Senior ISSO
  Neither approver may be the same individual. Document in Agency Logging Plan.

- [ ] **Run retirement workflow dry run**  
  Trigger Gate 1 manually (Kibana → Workflows → run), confirm both approval gates required, confirm deletion only executes after both approvals, confirm the audit record lands in `m_26_14-retirement-requests`.

- [ ] **Switch to no-delete ILM and disable any remaining auto-delete phases**  
  `GET _ilm/policy` → review all policies → confirm no `"delete"` phase on any policy applied to `logs-*`.  
  The `m_26_14-logs-l4-hot-frozen` and `m_26_14-logs-l3-hot-frozen` policies have auto-delete at 365d — these must NOT be active on any data stream once WS6 is deployed; use the `-no-delete` variants so retirement is governed exclusively by the two-gate workflow.

---

## Maintaining Level 4

Level 4 is not a destination — it requires ongoing operational discipline. Recurring tasks:

**Monthly:**
- [ ] Review WS1 maturity dashboard — confirm all five elements still at L4
- [ ] Review active JIT grants (`m_26_14-jit-grants` where `status:active` + daily `m_26_14-jit-audit-reports`) — revoke any stale grants
- [ ] Review element 3 alert coverage — all 11 categories still actively firing?
- [ ] Check ML anomaly job health — jobs running, no spooling errors

**Quarterly:**
- [ ] Full rule tuning review — adjust thresholds, exclusions, MITRE coverage gaps
- [ ] Review asset exceptions list — close any exceptions where coverage is now achievable
- [ ] Test retirement workflow — submit a dry-run retirement case, confirm both approvers respond within SLA
- [ ] Review JIT access grant log (`m_26_14-jit-grants`) — all past grants properly expired/revoked by the `m_26_14-jit-expiry` watcher?

**Annually:**
- [ ] Update Agency Logging Plan
- [ ] Review CISA LRA for updates — CISA re-evaluates the LRA at least annually
- [ ] Review NARA GRS records schedules for any changes affecting log retention requirements
- [ ] Conduct full self-assessment using WS1 dashboard + export CISA report for OMB submission
- [ ] Review and rotate ISSO/approver designations for two-gate retirement

---

## Quick Reference: Element Level Thresholds

| Element | L1 | L2 | L3 | L4 |
|---|---|---|---|---|
| **Inventory Visibility** | ≥70% | ≥80%, daily update | ≥90%, daily update | ≥95%, daily update |
| **Collection Coverage** | ≥50% with logs | ≥80% with logs | ≥90% with logs | ≥95% with logs |
| **Collection Operations** | <50% categories alerting (ad hoc) | 50-70% categories, periodic tuning | ≥70% categories, routine tuning | ≥95% categories, ML/AI tuning |
| **Data Retention** | ≥6 months retrievable | ≥12 months retrievable | ≥3 months searchable + ≥12mo retrievable | ≥6 months searchable + ≥12mo retrievable |
| **Log Management** | Logs stored | Encrypted at rest | Encrypted transit + at rest + hashed | + JIT access + permission monitoring + two-gate retirement |

**Remember:** Overall maturity = minimum level across all five elements.
