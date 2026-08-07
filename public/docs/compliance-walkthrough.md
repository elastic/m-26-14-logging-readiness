# M-26-14 Federal Logging Compliance — Technical Walkthrough

**OMB Memorandum M-26-14**: "Ensuring Effective and Efficient Agency Logging and Network Visibility to Defend Against Evolving Cyber Threats"
**Issued**: May 22, 2026
**Supersedes**: M-21-31

**Document scope**: This reference maps every M-26-14 requirement to the specific Elastic capability that addresses it, with implementation guidance for architects and engineers deploying this compliance pack. It is organized by memo section. For rule-level query detail and tuning guidance, follow the links to the per-rule documentation in `docs/detection-rules/`.

---

## Table of Contents

1. [Background and Objectives](#1-background-and-objectives)
2. [CEM Objective — Comprehensive Enterprise Monitoring](#2-cem-objective--comprehensive-enterprise-monitoring)
3. [THIRF Objective — Threat Hunt / Intelligence / Risk / Forensics](#3-thirf-objective--threat-hunt--intelligence--risk--forensics)
4. [Appendix B §5 — Eleven Required Log Categories](#4-appendix-b-5--eleven-required-log-categories)
5. [Appendix C — Five-Element Maturity Model](#5-appendix-c--five-element-maturity-model)
6. [Retention and Data Lifecycle](#6-retention-and-data-lifecycle)
7. [HWAM / SWAM / CDM Integration](#7-hwam--swam--cdm-integration)
8. [Quick-Start Deployment Sequence](#8-quick-start-deployment-sequence)
9. [License and Version Requirements](#9-license-and-version-requirements)

---

## 1. Background and Objectives

M-26-14 replaces M-21-31 and establishes a two-part framework for federal civilian executive branch (FCEB) agencies:

- **CEM (Comprehensive Enterprise Monitoring)**: Full-coverage log collection from all asset types — endpoints, servers, identity providers, network perimeter, cloud, and OT/ICS.
- **THIRF (Threat Hunt / Intelligence / Risk / Forensics)**: Active detection, hunting, and forensics capabilities built on the collected telemetry.

The memo defines a maturity model (Appendix C) with five elements and multiple levels per element. Agencies must self-assess, report their current level to CISA, and maintain a Plan of Action and Milestones (POA&M) for gaps.

**Elastic's role in this compliance pack**: Elastic provides the full-stack data platform (collection via Fleet/Agent, storage via Elasticsearch, detection via Kibana Security, analytics via ML) that implements both the CEM collection requirements and the THIRF detection requirements in a single deployment.

> **Note:** This document references requirements from OMB M-26-14 as implemented in this compliance pack. Where a specific Appendix B or Appendix C requirement text is quoted, it is drawn from the per-rule documentation in `docs/detection-rules/`. Engineers should consult the official memo text directly for authoritative regulatory language.

---

## 2. CEM Objective — Comprehensive Enterprise Monitoring

The CEM objective requires agencies to achieve full-coverage log collection across all asset types before any detection capability can be meaningful.

### 2.1 Asset Type Coverage Requirements

| Asset Type | Required Log Categories | Elastic Collection Method | Key Integrations | Documentation |
|---|---|---|---|---|
| Windows endpoints and servers | Auth, process, file, registry, network | Elastic Agent + Elastic Defend | `windows` integration, Sysmon via Elastic Agent | [Fleet docs](https://www.elastic.co/guide/en/fleet/current/fleet-overview.html) |
| Linux servers | Auth (SSH/PAM), audit syscalls, process | Elastic Agent + Auditd integration | `system` integration, `auditd` integration | [Auditbeat docs](https://www.elastic.co/guide/en/beats/auditbeat/current/auditbeat-overview.html) |
| Cloud identity (Okta, Azure/Entra ID) | Sign-in events, MFA activity, admin actions | Elastic Agent central integration | `okta` integration, `azure` integration | [Integrations catalog](https://www.elastic.co/integrations/) |
| Network perimeter / firewall | Flow records, deny/allow events, DNS | Palo Alto Networks, Cisco ASA, Zeek, Packetbeat | `palo_alto_networks`, `zeek`, Elastic Network Packet Capture | [Integrations catalog](https://www.elastic.co/integrations/) |
| OT / ICS / unmanaged devices | Enrollment events, network presence | Elastic Fleet enrollment telemetry + Passive Network Discovery | Fleet Server logs, Zeek DHCP/ARP | [Fleet enrollment docs](https://www.elastic.co/guide/en/fleet/current/add-fleet-server-on-prem.html) |
| Cloud workloads (AWS, Azure, GCP) | CloudTrail/CloudWatch, audit logs | Cloud provider integrations | `aws`, `azure`, `gcp` integrations | [Integrations catalog](https://www.elastic.co/integrations/) |
| Email platforms | Message delivery, forwarding rules, authentication | O365 / Google Workspace integrations | `o365`, `google_workspace` integrations | [Integrations catalog](https://www.elastic.co/integrations/) |

### 2.2 Centralized Collection Architecture

All telemetry flows through **Elastic Fleet**, which manages agent enrollment, policy distribution, and integration configuration from a central control plane. The collection architecture in this pack follows the ECS (Elastic Common Schema) model — all events are normalized to consistent field names regardless of source, enabling cross-platform correlation rules.

**Fleet deployment pattern for FCEB agencies:**

```
[Endpoints / Servers / Network Sensors]
        |
        v
[Elastic Agent] ---> [Fleet Server] ---> [Elasticsearch]
                          |
                          v
                    [Fleet Policy: M-26-14 Baseline]
                    - Elastic Defend (endpoint)
                    - System integration (auth, metrics)
                    - Auditd integration (Linux)
                    - Integration-specific modules
```

**Verification query — confirm all required data streams are active:**

```
GET /_cat/indices/logs-*?v&h=index,docs.count,store.size&s=index
```

Review this output against the integration requirements table in `docs/detection-rules/README.md`. Every required data stream must show a non-zero `docs.count` with a recent write timestamp before enabling detection rules.

> **Note:** CEM requires collection from *all* asset types. An agency that has deployed Elastic Defend on Windows endpoints but has not yet integrated Okta or Azure AD has a partial CEM posture. The Element 1 ML job (`m_26_14-ml-element1-asset-coverage`) monitors coverage ratios and fires when a whole asset type stops reporting. See [Section 5.1](#51-element-1--asset-coverage).

---

## 3. THIRF Objective — Threat Hunt / Intelligence / Risk / Forensics

THIRF requires that collected telemetry be actively analyzed for threat indicators, not merely stored. Elastic addresses THIRF through four capability layers:

| THIRF Capability | Elastic Capability | Where Configured |
|---|---|---|
| **Threat detection** — automated, rules-based | Kibana Security Detection Engine — EQL, ES\|QL, Indicator Match, ML-backed rules | Security → Rules |
| **Threat hunting** — analyst-driven investigation | Kibana Discover, Timeline, ES\|QL console, Osquery live queries | Security → Timelines, Discover |
| **Intelligence integration** — IoC matching against feeds | Indicator Match rules + TAXII/STIX threat intel integrations | Fleet → Integrations → Threat Intel |
| **Forensics** — tamper-evident log retention | SHA-256 integrity hash pipeline + ILM retention policies | Ingest Pipelines + Index Lifecycle |

### 3.1 Detection Engine

The Kibana Security Detection Engine executes detection rules against indexed data on a schedule. This pack deploys rules using four rule types:

| Rule Type | When Used | M-26-14 Categories |
|---|---|---|
| **EQL (sequence)** | Ordered multi-event correlation on same host | §5(a) identity, §5(d) privilege escalation, §5(f) EDR tamper, §5(j) APT chain |
| **ES\|QL (aggregation)** | Volume and behavioral threshold detection | §5(b) C2 beaconing, §5(c) mass file access, §5(h) off-hours execution, §5(i) exfiltration |
| **Indicator Match** | IoC feed cross-reference | §5(g) IoC matching |
| **New Terms** | First-seen entity detection | §5(e) rogue device |
| **Machine Learning** | Behavioral anomaly from baselines | §5(a), §5(b), §5(h) — Level 4 coverage |

### 3.2 Threat Hunting with ES|QL

For analyst-driven hunting, Kibana's ES|QL console (Discover → ES|QL mode) supports ad-hoc aggregation, join-like operations, and time-series analysis against all indexed data. Example THIRF hunting query:

```esql
FROM logs-endpoint.events.process*
| WHERE user.name != null
  AND @timestamp >= NOW() - 7 days
  AND process.parent.name IN ("winword.exe","excel.exe","outlook.exe","mshta.exe")
| STATS procs = COUNT(*), hosts = COUNT_DISTINCT(host.name) BY process.name
| SORT procs DESC
| LIMIT 20
```

### 3.3 Forensic Integrity (THIRF §3)

M-26-14 requires that logs be tamper-evident to support forensic use. This pack addresses that requirement through the `m_26_14-log-integrity-hash` ingest pipeline, which appends a SHA-256 hash of each event's canonical fields (`@timestamp + host.name + message`) to the `event.hash` field at ingest time. The pipeline also sets `event.integrity.hashed: true` on each processed document.

**Verification**: Post-incident, investigators can re-hash a document's canonical fields and compare against `event.hash`. A mismatch indicates post-ingest modification. The Element 5 ML job (`m_26_14-ml-element5-hash-coverage`) monitors the ratio of hashed documents per data stream and fires when coverage drops.

> **Note:** The integrity hash is computed at ingest, not at the agent. Tampering at the agent or in transit before ingestion would not be detected by hash comparison alone. Agencies requiring end-to-end tamper detection should also implement TLS certificate pinning on Fleet-to-Elasticsearch connections.

---

## 4. Appendix B §5 — Eleven Required Log Categories

M-26-14 Appendix B §5 specifies eleven categories of events that all FCEB agencies must collect and detect. The table below provides a summary mapping; detailed rule documentation is linked for each category.

### 4.1 Category Coverage Matrix

| §5 Category | Description | Rule ID(s) | Rule Type | Severity | Detection Logic | Rule Doc |
|---|---|---|---|---|---|---|
| **(a)** Identity events | Credential stuffing / auth-failure sequences across AD, Okta, Azure/Entra, SSH | `m_26_14-appendixb-a-*` (4 variants) | EQL sequence, ES\|QL | High | ≥5 auth failures then success within 10m on same (user, source IP) | [rule-a-identity-events.md](detection-rules/rule-a-identity-events.md) |
| **(b)** C2 / beaconing | Repeated periodic outbound to single external IP on non-standard port | `m_26_14-appendixb-b-c2-beaconing` | ES\|QL | High | ≥20 connections, ≥25-min span, same (src, dst, port, host) in 30m window | [rule-b-c2-beaconing.md](detection-rules/rule-b-c2-beaconing.md) |
| **(c)** Mass file access | 500+ file accesses by one user/process in 5 min — ransomware staging or bulk collection | `m_26_14-appendixb-c-mass-file-access` | ES\|QL | High | `COUNT(*) >= 500` per (user, host, process) in 5m; sourced from `logs-endpoint.events.file*` | [rule-c-mass-file-access.md](detection-rules/rule-c-mass-file-access.md) |
| **(d)** Privilege escalation | New account created then used within 1 hour — backdoor account pattern | `m_26_14-appendixb-d-privilege-escalation-sequence` | EQL sequence | High | EQL `sequence with maxspan=1h`: IAM account-create event then auth success for same username | [rule-d-privilege-escalation.md](detection-rules/rule-d-privilege-escalation.md) |
| **(e)** OT / ICS / rogue device | First-seen Fleet enrollment — unmanaged or unauthorized device | `m_26_14-appendixb-e-rogue-device-fleet-enrollment` | New Terms | High | `new_terms` on `host.name` with 7-day history window; fires once per new hostname | [rule-e-rogue-device.md](detection-rules/rule-e-rogue-device.md) |
| **(f)** EDR tamper | High/critical Elastic Defend alert followed by security tool process kill within 10 min | `m_26_14-appendixb-f-edr-tamper` | EQL sequence | Critical | EQL sequence: endpoint critical alert → process termination of named EDR process on same host | [rule-f-edr-tamper.md](detection-rules/rule-f-edr-tamper.md) |
| **(g)** IoC match / DNS | Network/endpoint/email telemetry matched against threat intelligence indicators | 5 prebuilt Elastic Security rules (tagged `M-26-14:Category-G`) + `m_26_14-appendixb-g-ioc-domain-match` (custom) | Indicator Match | Critical / High | Join `logs-ti_*` against endpoint network, file, process, registry, email, and DNS events | [rule-g-ioc-match.md](detection-rules/rule-g-ioc-match.md) |
| **(h)** Off-hours execution | Non-system user launches ≥50 processes during 22:00–05:00 UTC in 1 hour | `m_26_14-appendixb-h-offhours-bulk-process-execution` | ES\|QL | High | `DATE_EXTRACT("hour")` filter + `COUNT(*) >= 50` per (user, host) in 1h window | [rule-h-offhours-execution.md](detection-rules/rule-h-offhours-execution.md) |
| **(i)** Exfiltration | Anomalous outbound data volume — ≥500 MB to non-RFC1918 destination in 1 hour | `m_26_14-appendixb-i-exfiltration-volume` | ES\|QL | High | `SUM(network.bytes) >= 524,288,000` per (src IP, host, process) in 1h window | [rule-i-exfiltration-volume.md](detection-rules/rule-i-exfiltration-volume.md) |
| **(j)** APT chain | Three-stage correlated intrusion: inbound connection → LOLBin/script execution → lateral movement to SMB/RDP/SSH | `m_26_14-appendixb-j-apt-chain-2h`, `m_26_14-appendixb-j-apt-chain-4h` | EQL sequence | Critical | EQL 3-event sequence on same `host.id`: external inbound network → scripting engine spawn → lateral movement egress | [rule-j-apt-chain.md](detection-rules/rule-j-apt-chain.md) |
| **(k)** Coverage gap | Meta-detection: monitors whether categories A–J have fired recently; alerts on silence | `m_26_14-appendixb-k-alert-presence`, `m_26_14-appendixb-k-silent-category` | ES\|QL | Medium | Aggregates `.alerts-security.*` by M-26-14 tag; fires when a category shows zero alerts over 24h (Rule 1) or 30 days (Rule 2 / companion Watcher) | [rule-k-coverage-gap.md](detection-rules/rule-k-coverage-gap.md) |

### 4.2 Detailed Category Implementations

The following subsections provide per-category implementation notes, prerequisites, and key integration requirements.

---

#### §5(a) — Identity Events

**Requirement**: Automated detection of anomalous authentication patterns across all identity platforms, covering the "failures then success" credential stuffing pattern at minimum.

**Elastic implementation**: Four platform-specific rule variants, each adapted to that platform's event schema:

| Platform | Rule ID | Rule Type | Index Pattern | Key ECS Fields |
|---|---|---|---|---|
| Windows Active Directory | `m_26_14-appendixb-a-windows-credential-stuffing` | EQL sequence | `logs-system.security*`, `winlogbeat-*` | `winlog.event_id` (4625/4771 fail; 4624/4648 success), `user.name`, `source.ip` |
| Okta | `m_26_14-appendixb-a-okta-credential-stuffing` | EQL sequence | `logs-okta.*` | `event.outcome`, `user.name`, `source.ip` |
| Azure / Entra ID | `m_26_14-appendixb-a-azure-credential-stuffing` | ES\|QL aggregation | `logs-azure.signinlogs*` | `event.outcome`, `azure.signinlogs.properties.status.error_code` |
| Linux SSH | `m_26_14-appendixb-a-linux-ssh-credential-stuffing` | ES\|QL aggregation | `logs-system.auth*` | `event.outcome` (PAM), `user.name`, `source.ip` |

**Prerequisites**:
- Windows: GPO audit policy must enable `Logon` and `Credential Validation` subcategories for Success and Failure. Verify with `auditpol /get /subcategory:"Logon"`.
- Okta: `okta` Fleet integration pointed at the Okta System Log API. Verify `logs-okta.system*` contains recent events.
- Azure/Entra: `azure` Fleet integration with Sign-In Logs enabled. Requires Azure AD P1/P2 license for sign-in log API access.
- Linux SSH: `system` Fleet integration with Auth module enabled on all SSH-accessible servers.

**M-26-14 compliance note**: The "failure then success" pattern satisfies the §5(a) automated detection requirement at Element 3, Level 2. Level 4 ML coverage is provided by Elastic Security `security_auth` module jobs installed with the `m_26_14_` prefix (`m_26_14_auth_rare_source_ip_for_a_user_ea`, `m_26_14_auth_high_count_logon_fails_ea`, `m_26_14_suspicious_login_activity_ea`) wrapped by rules `m_26_14-ml-cata-rare-auth-ip`, `m_26_14-ml-cata-high-auth-failures`, and `m_26_14-ml-cata-ueba-login`.

**Key documentation links**:
- [Elastic Defend endpoint policy](https://www.elastic.co/guide/en/security/current/configure-endpoint-integration-policy.html)
- [Okta integration](https://www.elastic.co/integrations/okta)
- [Azure integration](https://www.elastic.co/integrations/azure)
- [EQL rule type reference](https://www.elastic.co/guide/en/security/current/rules-ui-create.html#create-eql-rule)

---

#### §5(b) — C2 / Beaconing Detection

**Requirement**: Detect repeated outbound connections consistent with C2 heartbeat behavior. Report confirmed C2 activity to CISA within 1 hour.

**Elastic implementation**: ES|QL aggregation rule (`m_26_14-appendixb-b-c2-beaconing`) that counts egress connections per `(source.ip, destination.ip, destination.port, host.name)` tuple in a 30-minute window and fires when `connection_count >= 20` and `beacon_window_minutes >= 25`. The rule uses deterministic threshold logic (not ML) so it fires consistently on day one without a baseline warm-up period.

**Network telemetry sources** (at least one required):

| Integration | Index Pattern | Notes |
|---|---|---|
| Elastic Network Packet Capture (Packetbeat) | `logs-network_traffic.*` | Deploy on network TAP/SPAN for full visibility |
| Zeek | `logs-zeek.connection*` | Preferred for high-throughput environments; requires Zeek sensor on egress path |
| Palo Alto Networks | `logs-palo_alto_networks.*` | Use if PA firewalls are already deployed; enables policy correlation |

**CISA reporting**: Per M-26-14 §5(b), FCEB agencies must notify CISA within 1 hour of confirmed C2 detection. Configure a Kibana Connector (Security → Rules → [rule] → Actions) to notify the SOC ticket queue and chain a SOAR playbook for the CISA notification workflow.

**Level 4 ML coverage**: `m_26_14-ml-catb-dns-entropy` job detects high-entropy domain names (DGA activity) in Zeek DNS logs. `m_26_14-ml-catb-rare-country` detects connections to geographically unusual destinations.

**Key documentation links**:
- [Network Packet Capture integration](https://www.elastic.co/guide/en/fleet/current/elastic-agent-installation.html)
- [Zeek integration](https://www.elastic.co/integrations/zeek)
- [ES|QL rule type](https://www.elastic.co/guide/en/security/current/rules-ui-create.html#create-esql-rule)

---

#### §5(c) — Mass File Access

**Requirement**: Log object and resource access events with sufficient metadata to detect bulk data access indicative of staging or exfiltration. Required at Element 3, Level 2.

**Elastic implementation**: ES|QL aggregation rule (`m_26_14-appendixb-c-mass-file-access`) that counts file access events per `(user.name, host.name, process.name)` in a 5-minute window. Threshold is 500 events. The rule also computes `distinct_paths` (path diversity indicates sweeping) and `access_rate` (files/minute). The `alert_reason` field provides a human-readable one-line summary for SOC triage.

**Key data source**: `logs-endpoint.events.file*` (Elastic Defend, file access events enabled in endpoint policy). Secondary: `logs-auditd.*` (Linux, requires auditd syscall rules for `open`, `openat`, `read`).

**Before enabling**: Elastic Defend file access monitoring must be explicitly enabled in the endpoint policy (Fleet → Agent Policy → Elastic Defend → Event Collection → File). It is disabled by default. Also add process-based exceptions for backup agents, AV scanners, and search indexers before activation.

**Key documentation links**:
- [Elastic Defend event collection configuration](https://www.elastic.co/guide/en/security/current/configure-endpoint-integration-policy.html#event-collection)
- [Auditd integration](https://www.elastic.co/guide/en/beats/auditbeat/current/auditbeat-module-auditd.html)

---

#### §5(d) — Privilege Escalation

**Requirement**: Detect creation of unauthorized user accounts and correlate with subsequent authentication activity, especially on High-Value Assets (HVAs).

**Elastic implementation**: EQL sequence rule (`m_26_14-appendixb-d-privilege-escalation-sequence`) with `maxspan=1h`. The rule joins `user.target.name` in the IAM creation event (Windows Event ID 4720) to `user.name` in the subsequent authentication success event (Event IDs 4624 or 4648). This correlation surface — account created then immediately used — is the behavioral indicator that distinguishes attacker backdoor accounts from legitimate provisioning.

**HVA targeting**: For maximum M-26-14 compliance value, the Windows integration must be deployed on all Domain Controllers, file servers designated as HVAs, Privileged Access Workstations (PAWs), and jump hosts.

**GPO prerequisites**:
- `Audit Account Management > User Account Management`: Success and Failure
- `Audit Logon/Logoff > Audit Logon`: Success and Failure

**Key documentation links**:
- [Windows Security integration](https://www.elastic.co/integrations/windows)
- [EQL sequence syntax](https://www.elastic.co/guide/en/elasticsearch/reference/current/eql-syntax.html#eql-sequences)
- [Kibana Detection Rules](https://www.elastic.co/guide/en/security/current/detection-engine-overview.html)

---

#### §5(e) — OT / ICS / Rogue Device

**Requirement**: Log infrastructure changes, including enrollment of new endpoints, and detect unauthorized hardware additions.

**Elastic implementation**: New Terms rule (`m_26_14-appendixb-e-rogue-device-fleet-enrollment`) that uses a 7-day history window on `host.name`. The rule fires exactly once when a new hostname enrolls in Elastic Fleet — providing a reliable, low-noise signal for unauthorized device introduction. It is sourced from `logs-elastic_agent.*` and `logs-fleet_server.*`.

**HWAM cross-reference workflow**: When this rule fires, the investigation guide instructs analysts to query `m_26_14-osquery-hardware-inventory-*` by `host.mac` and `host.serial_number` to determine whether the device exists in the authorized hardware inventory. An unenrolled match is a compliance gap; no match at all is an immediate incident.

**OT/ICS scope**: For operational technology environments without Elastic Agent installed on devices, passive network discovery (Zeek DHCP/ARP logs) provides coverage for new MAC addresses appearing on monitored segments. This is a complementary, not equivalent, control.

**Key documentation links**:
- [Fleet Server setup](https://www.elastic.co/guide/en/fleet/current/add-fleet-server-on-prem.html)
- [New Terms rule type](https://www.elastic.co/guide/en/security/current/rules-ui-create.html#create-new-terms-rule)
- [Osquery Fleet integration](https://www.elastic.co/guide/en/fleet/current/osquery-manager-integration.html)

---

#### §5(f) — EDR Tamper

**Requirement**: Deploy EDR to all managed endpoints and continuously monitor for tampering with, disabling of, or circumvention of that tooling. Alert within minutes.

**Elastic implementation**: EQL sequence rule (`m_26_14-appendixb-f-edr-tamper`) with `maxspan=10m`. The sequence matches: (1) a high or critical Elastic Defend alert on a host, followed by (2) termination of a named EDR/AV process on the same host. The monitored process list includes `elastic-agent.exe`, `MsMpEng.exe`, `falcon-sensor.exe`, `SentinelOne.exe`, `cb.exe`, `CylanceSvc.exe`, and others. This fires earlier than waiting for agent heartbeat loss — providing actionable signal while the attack is still in progress.

**Severity**: Critical (risk score 87). This is the highest-severity rule in the pack. EDR tamper means the attacker has detected and is actively countering the agency's monitoring capability.

**Complementary rule**: Elastic prebuilt rule `fc552f49` (Elastic Defend Alert Followed by Telemetry Loss) catches the downstream heartbeat-loss signal for cases where agent termination does not generate a process event (e.g., kernel-level kill, VM suspension). Deploy both.

**Key documentation links**:
- [Elastic Defend overview](https://www.elastic.co/guide/en/security/current/install-endpoint.html)
- [Fleet remote actions (host isolation)](https://www.elastic.co/guide/en/security/current/response-actions.html)
- [EQL rule type](https://www.elastic.co/guide/en/security/current/rules-ui-create.html#create-eql-rule)

---

#### §5(g) — IoC Match / DNS

**Requirement**: Continuous monitoring for known Indicators of Compromise from authoritative feeds. At minimum, integrate one CISA-approved threat intelligence feed. Perform IoC matching in near-real-time against network, file, process, registry, and email telemetry.

**Elastic implementation**: Category G is satisfied by five existing Elastic Security prebuilt Indicator Match rules plus one custom pack rule. The prebuilts cover IP, hash, URL, email, and registry indicators; the pack ships `m_26_14-appendixb-g-ioc-domain-match` for DNS/domain indicators, which the prebuilt set does not yet cover (earlier pack revisions also shipped custom hash, IP, and URL match rules; those were retired in favor of the prebuilts below). The remaining compliance work is operational:

| Prebuilt Rule UUID | Rule Name | Indicator Type | Event Source |
|---|---|---|---|
| `0c41e478-5263-4c69-8f9e-7dfd2c22da64` | Threat Intel IP Address Indicator Match | IPv4/IPv6 | Network flow / endpoint network events |
| `aab184d3-72b3-4639-b242-6597c99d8bca` | Threat Intel Hash Indicator Match | MD5, SHA-1, SHA-256 | `logs-endpoint.events.file*`, `logs-endpoint.events.process*` |
| `f3e22c8b-ea47-45d1-b502-b57b6de950b3` | Threat Intel URL Indicator Match | URLs, URL fragments | Proxy logs, endpoint browser events |
| `fcf18de8-ad7d-4d01-b3f7-a11d5b3883af` | Threat Intel Email Indicator Match | Email sender addresses | `logs-o365.audit*`, `logs-google_workspace.gmail*` |
| `a61809f3-fb5b-465c-8bff-23a8a068ac60` | Threat Intel Windows Registry Indicator Match | Registry keys/values | `logs-endpoint.events.registry*` |

**Applying M-26-14 tags**: The prebuilt rules must be tagged with `M-26-14`, `M-26-14:AppendixB`, `M-26-14:Category-G`, `Compliance`, and `Threat-Intelligence` to appear in compliance dashboards. Use Kibana bulk edit or the Rules API (see `docs/detection-rules/rule-g-ioc-match.md` for the exact API call pattern).

**Required threat intelligence feeds** (Tier 1 — required for M-26-14 compliance):

| Feed | Provider | Integration | Refresh Cadence |
|---|---|---|---|
| CISA Automated Indicator Sharing (AIS) | CISA | TAXII Threat Intelligence integration | Near-real-time (TAXII push) |
| CISA Known Exploited Vulnerabilities (KEV) | CISA | Manual enrichment | Daily |
| MS-ISAC TLP:WHITE feed | MS-ISAC (CIS) | STIX/TAXII | Hourly |

Register for CISA AIS at `https://www.cisa.gov/ais`. Agency credentials are issued to the ISSO after registration.

**Feed configuration** (CISA AIS via TAXII): Fleet → Integrations → TAXII Threat Intelligence → configure with TAXII server URL `https://ais-taxii.dhs.gov/taxii2/`, agency collection ID and credentials, poll interval `60s`.

**License requirement**: Indicator Match rules require an Elastic Security Enterprise license. Verify with `GET /_license`.

**Key documentation links**:
- [Indicator Match rule type](https://www.elastic.co/guide/en/security/current/rules-ui-create.html#create-indicator-rule)
- [Threat Intelligence integrations](https://www.elastic.co/integrations/?solution=security&category=threat_intel)
- [CISA AIS registration](https://www.cisa.gov/ais)

---

#### §5(h) — Off-Hours Execution

**Requirement**: Behavioral detection controls capable of identifying non-interactive and interactive user sessions that generate anomalous process execution volumes during non-business hours (22:00–05:00). Alert within 60 minutes of threshold crossing.

**Elastic implementation**: ES|QL aggregation rule (`m_26_14-appendixb-h-offhours-bulk-process-execution`) with a 1-hour evaluation window. Uses `DATE_EXTRACT("hour", @timestamp)` to filter to off-hours, then aggregates process starts per `(user.name, host.name)`. Threshold is 50 processes. The rule also computes `distinct_processes` (unique binary names) — high diversity combined with high count is a strong indicator of malicious activity (recon + staging tool execution).

**Why ES|QL is required here**: Threshold rule types cannot apply post-aggregation time-of-day filters. ES|QL is the only rule type that supports `DATE_EXTRACT` filtering within the same pipeline as the aggregation, making it the correct technical choice for this detection pattern.

**Off-hours window adjustment**: The default 22:00–05:00 UTC is appropriate for US East Coast deployments. Agencies with operations in other time zones should modify the `HOUR_OF_DAY` filter to match their defined off-hours policy. This requires editing the rule query.

**M-26-14 quarterly review requirement**: §5(h) explicitly requires agencies to review and re-certify off-hours exception lists at least annually. Build this into the agency's standard audit calendar.

**Level 4 ML coverage**: `m_26_14-ml-cath-rare-process-windows` and `m_26_14-ml-cath-rare-process-linux` rules wrap Elastic Security prebuilt ML jobs that establish per-host process baselines and fire when unusual processes appear — providing behavioral complement to the threshold rule.

**Key documentation links**:
- [Elastic Defend process events](https://www.elastic.co/guide/en/security/current/configure-endpoint-integration-policy.html#event-collection)
- [ES|QL reference](https://www.elastic.co/guide/en/elasticsearch/reference/current/esql.html)

---

#### §5(i) — Exfiltration

**Requirement**: Continuous monitoring for anomalous outbound data transfers. Alert within 15 minutes of threshold breach. FISMA note: transfers to cloud services lacking US data residency may independently violate FISMA data localization requirements for CUI/PII/SBU.

**Elastic implementation**: ES|QL aggregation rule (`m_26_14-appendixb-i-exfiltration-volume`) that sums `network.bytes` per `(source.ip, host.name, process.name)` in a 1-hour rolling window and fires when the sum exceeds 524,288,000 bytes (500 MB) to non-RFC1918 destinations. Using `SUM()` (not per-event threshold) is essential for detecting tools like `rclone`, `s3cmd`, or custom upload scripts that chunk transfers into many parallel small connections.

**Network telemetry sources**: At least one of `logs-network_traffic.*` (Packetbeat), `logs-zeek.connection*` (Zeek), or `logs-endpoint.events.network*` (Elastic Defend) must be actively ingesting. Verify `network.direction` is populated as `egress` (not blank) before enabling.

**Threshold calibration by environment**:

| Environment | Recommended Threshold |
|---|---|
| Classified / air-gapped with strict DLP | 10 MB |
| Standard federal office, no authorized cloud sync | 100 MB |
| Default (this pack) | 500 MB |
| Environments with authorized video uploads | 2 GB |

**Key documentation links**:
- [Network Packet Capture](https://www.elastic.co/guide/en/fleet/current/elastic-agent-installation.html)
- [Elastic Defend network events](https://www.elastic.co/guide/en/security/current/configure-endpoint-integration-policy.html#event-collection)

---

#### §5(j) — APT Chain

**Requirement**: Automated detection of multi-stage intrusion activity consistent with APT tradecraft: internet-facing exploitation, execution of native OS interpreters, and lateral movement via standard administrative protocols. Escalate confirmed APT to CISO and ISSO within 1 hour. Open a THIRF ticket within 72 hours.

**Elastic implementation**: Two EQL sequence rules with different time windows to catch both fast-moving commodity malware and deliberately slow APT actors:

| Rule ID | Sequence Window | MITRE Coverage |
|---|---|---|
| `m_26_14-appendixb-j-apt-chain-2h` | 2 hours | TA0001, TA0002, TA0008 |
| `m_26_14-appendixb-j-apt-chain-4h` | 4 hours | TA0001, TA0002, TA0008 |

Both rules enforce a three-step sequence on the same `host.id`:
1. Inbound network connection from a non-RFC1918 source IP
2. Spawn of a scripting engine or LOLBin: `cmd.exe`, `powershell.exe`, `wscript.exe`, `cscript.exe`, `mshta.exe`, `regsvr32.exe`, `rundll32.exe`, or `certutil.exe`
3. Outbound connection to a lateral movement port: SMB (445), RPC (135/139), RDP (3389), SSH (22), WinRM (5985/5986)

**Severity**: Critical (risk score 91). When this rule fires, the CISO and ISSO notification SLA is 1 hour per M-26-14 §5(j).

**Deduplication note**: Both the 2h and 4h rules fire when a chain completes within 2 hours. In the SOAR platform, deduplicate using `host.id` + the `@timestamp` of the inbound network event as a correlation key.

**Key documentation links**:
- [EQL sequence rules](https://www.elastic.co/guide/en/security/current/rules-ui-create.html#create-eql-rule)
- [Elastic Security MITRE ATT&CK framework](https://www.elastic.co/guide/en/security/current/attack-discovery.html)
- [Kibana Cases for incident tracking](https://www.elastic.co/guide/en/security/current/cases-overview.html)

---

#### §5(k) — Coverage Gap

**Requirement**: Demonstrate that detection capabilities are continuously operational across all required event categories. Document gaps with root cause and remediation timeline in the POA&M.

**Elastic implementation**: Two complementary rules that treat coverage gaps as first-class alerts:

| Rule ID | Detection Logic | Fire Condition | Use |
|---|---|---|---|
| `m_26_14-appendixb-k-alert-presence` | Aggregates M-26-14-tagged alerts from last 25h by category letter | Each result row is one active category — a missing row is the gap | Daily health attestation |
| `m_26_14-appendixb-k-silent-category` | Counts M-26-14 alerts by category over 30 days | Companion Watcher (`m_26_14-watcher-registry-zero-count`) fires when a category has zero alerts for 30 days | POA&M evidence generation |

**Companion Watcher**: The Elasticsearch Watcher `m_26_14-watcher-registry-zero-count` runs daily at 06:00 UTC, compares alert counts per category against the `m_26_14-rule-registry` reference index, and fires notifications for missing categories via webhook (Kibana alert) and email to the ISSO.

**Required custom index**: `m_26_14-rule-registry` — must be created and seeded before Category K is meaningful. Fixture: `tests/ws5_detection/fixtures/fixture_k_registry.ndjson`.

**Audit value**: When a Category K alert fires before an AO audit, the agency can present a documented self-identified gap with root cause, discovery date, and remediation date — which is substantially better than a gap discovered during the audit itself.

---

### 4.3 Deployment Sequence for Appendix B Rules

Deploy rules in this order to ensure telemetry is available before dependent rules are enabled. Enabling a rule against empty indexes wastes compute and produces false silence.

| Phase | Rules | Rationale |
|---|---|---|
| **Phase 0 — Prerequisites** | Install integrations; verify data streams; confirm Elastic Security enabled | Rules require underlying telemetry |
| **Phase 1 — Day-1 Coverage** | §5(f) EDR tamper, §5(g) IoC (prebuilt), §5(d) privilege escalation, §5(a) identity | Highest severity; broadest applicability; address most common M-26-14 audit findings |
| **Phase 2 — Network Visibility** | §5(j) APT chain, §5(k) coverage gap | Requires network telemetry and all A–J rules deployed before K is meaningful |
| **Phase 3 — Behavioral Coverage** | §5(b) C2 beaconing, §5(c) mass file access, §5(e) rogue device | Threshold and new_terms rules; tune exception lists before enabling |
| **Phase 4 — ES\|QL Analytics** | §5(h) off-hours execution, §5(i) exfiltration volume | Require Elasticsearch 8.16+; benefit from higher data volume for aggregation windows |

**Import command** (all custom rules at once):
```bash
python tools/setup_ws5.py
```
Rules are imported in disabled state by default. Enable them after verifying the underlying data streams are sending data.

---

## 5. Appendix C — Five-Element Maturity Model

M-26-14 Appendix C defines a five-element maturity model. Each element has multiple levels (L1 through L4+). Agencies self-assess and must progress toward full coverage over time.

### Appendix C Maturity Coverage Matrix

| Element | Description | M-26-14 Requirement | Elastic ML Job | Kibana Alert Rule | Maturity Level |
|---|---|---|---|---|---|
| **1** | Asset Coverage — all asset types logging | HWAM/SWAM enrollment tracking | `m_26_14-ml-element1-asset-coverage` | `m_26_14-ml-e1-coverage-drop` | L2+ |
| **2** | Ingestion Rate — log pipeline health | Data stream ingestion rate monitoring | `m_26_14-ml-element2-ingestion-rate` | `m_26_14-ml-e2-ingestion-drop` | L2+ |
| **3** | Rule Coverage — all log categories have active detection rules | Appendix B category silence detection | `m_26_14-ml-element3-rule-silence` | `m_26_14-ml-e3-rule-silence` | L4 |
| **4** | Privileged Operations — monitoring privileged/admin actions | ILM lifecycle anomaly (retention integrity) | `m_26_14-ml-element4-ilm-anomaly` | `m_26_14-ml-e4-retention-anomaly` | L3+ |
| **5** | Log Integrity — cryptographic tamper detection | Hash coverage ratio per data stream | `m_26_14-ml-element5-hash-coverage` | `m_26_14-ml-e5-hash-drop` | L3+ |

> **Note:** All Appendix C ML jobs are custom anomaly detection jobs specific to this compliance pack. They are not Elastic Security prebuilt jobs and must be deployed and managed by the agency. All require a Platinum or Enterprise Elasticsearch license. See `docs/ml-jobs-guide.md` for the full deployment procedure.

---

### 5.1 Element 1 — Asset Coverage

**M-26-14 requirement**: All agency hardware assets must be enrolled and reporting telemetry. HWAM coverage must meet the level-specific threshold (e.g., Level 3 requires ≥95% of known hardware enrolled in Elastic Agent).

**Elastic implementation**: The `m_26_14-ml-element1-asset-coverage` anomaly detection job monitors coverage ratios from HWAM/SWAM tracking indices. It uses a `low_count by agent.type` detector with a 1-hour bucket span. A sustained drop in the fraction of expected assets reporting to Fleet — regardless of which asset type — fires an anomaly. The corresponding alert rule `m_26_14-ml-e1-coverage-drop` fires when the anomaly score exceeds 75.

**Job details**:
- Job ID: `m_26_14-ml-element1-asset-coverage`
- Job file: `public/assets/elasticsearch/ml_job/m_26_14-ml-element1-asset-coverage.json`
- Bucket span: 1 hour
- Model memory: 128 MB

**Data source**: HWAM asset data from `m_26_14-osquery-hardware-inventory-*` (Osquery hardware inventory pack) and `m_26_14-hwam_assets-*` (CDM HWAM integration, if deployed). Agents must be enrolled in Fleet and reporting to these indices.

**Dashboard**: `m_26_14-asset-coverage` — shows hardware inventory table, per-agent-type coverage treemap, and last-seen heatmap.

**Key documentation links**:
- [Osquery Fleet integration](https://www.elastic.co/guide/en/fleet/current/osquery-manager-integration.html)
- [ML anomaly detection](https://www.elastic.co/guide/en/machine-learning/current/ml-ad-overview.html)

---

### 5.2 Element 2 — Ingestion Rate

**M-26-14 requirement**: Log ingestion pipelines must be healthy and producing data continuously. A data stream going silent is a compliance gap, not just an operational issue.

**Elastic implementation**: The `m_26_14-ml-element2-ingestion-rate` job monitors document counts per `data_stream.dataset` per hour using dual detectors: `low_count` (detects a data stream going completely silent) and `low_non_zero_count` (detects a significant drop even if some documents are still arriving). Fires when ingestion falls below the ML-learned historical baseline.

**Job details**:
- Job ID: `m_26_14-ml-element2-ingestion-rate`
- Job file: `public/assets/elasticsearch/ml_job/m_26_14-ml-element2-ingestion-rate.json`
- Bucket span: 1 hour
- Model memory: 512 MB (reflects per-partition cardinality of multiple data streams)

**Baseline period**: 14 days minimum before anomaly scores are reliable. Monitor job status in Kibana → Machine Learning → Anomaly Detection during the warm-up period.

**Dashboard**: `m_26_14-retention-readiness` — shows ILM policy matrix with per-data-stream retention status. The element2 anomaly data feeds into the retention compliance view.

**Key documentation links**:
- [ML anomaly detection jobs](https://www.elastic.co/guide/en/machine-learning/current/ml-ad-run-jobs.html)

---

### 5.3 Element 3 — Rule Coverage

**M-26-14 requirement**: All Appendix B categories (A through K) must have active detection rules producing alerts on an ongoing basis. Agencies at Level 3 must demonstrate 11/11 categories active.

**Elastic implementation**: The `m_26_14-ml-element3-rule-silence` job uses a 6-hour bucket span to detect Appendix B detection categories that have gone silent. It uses a `low_count by m_26_14.category` detector — the ML complement to the threshold-based Category K coverage-gap rule. The ML job catches gradual degradation where alert rates slowly decline before reaching zero, while Category K catches binary silence.

**Job details**:
- Job ID: `m_26_14-ml-element3-rule-silence`
- Job file: `public/assets/elasticsearch/ml_job/m_26_14-ml-element3-rule-silence.json`
- Bucket span: 6 hours
- Model memory: 64 MB

> **Prerequisite:** The `m_26_14.category` field must be present on alert documents. It is written by the `m_26_14-alert-category-pipeline` ingest pipeline, which is **deployed** and set as the `final_pipeline` on the security alerts data stream (`.internal.alerts-security.alerts-default-*`). The element3 job reads `m_26_14.category` from those enriched alerts. The job produces useful anomaly scores only once each Appendix B category has accrued enough alert history for the 6-hour buckets to form a baseline (allow ~14 days). On a fresh or low-volume cluster the datafeed may return few buckets until detection rules have been firing for a while.

**Key documentation links**:
- [Ingest pipelines](https://www.elastic.co/guide/en/elasticsearch/reference/current/ingest.html)
- [ML anomaly detection](https://www.elastic.co/guide/en/machine-learning/current/ml-ad-overview.html)

---

### 5.4 Element 4 — Privileged Operations

**M-26-14 requirement**: Monitor privileged and administrative actions. Detect anomalous ILM lifecycle activity that could indicate retention tampering or evidence destruction (MITRE T1485, T1070.004).

**Elastic implementation**: The `m_26_14-ml-element4-ilm-anomaly` job monitors Elasticsearch ILM rollover and transition events using dual detectors: `high_count by action` (unusual volume of lifecycle operations) and `rare by action` (unusual operation types). Fires on: indices rolling over faster than expected (potential log injection), indices skipping lifecycle phases (retention tampering), or unexpected index deletions.

**Job details**:
- Job ID: `m_26_14-ml-element4-ilm-anomaly`
- Job file: `public/assets/elasticsearch/ml_job/m_26_14-ml-element4-ilm-anomaly.json`
- Bucket span: 1 hour
- Model memory: 64 MB
- Anomaly score threshold: 85 (higher than other jobs due to natural ILM variability)

> **Note:** This job requires Elasticsearch audit logging, which is **not enabled by default**. Enable with:
> ```yaml
> # elasticsearch.yml
> xpack.security.audit.enabled: true
> xpack.security.audit.logfile.events.include: ["ACCESS_GRANTED", "ACCESS_DENIED", "AUTHENTICATION_SUCCESS"]
> ```
> Agencies should review audit log volume impact before enabling. Ensure the audit log index is covered by the `m_26_14-logs-l4-no-delete.json` ILM policy. This is documented as a Critical RA Flag in the compliance attestation dashboard.

---

### 5.5 Element 5 — Log Integrity

**M-26-14 requirement**: Implement tamper-evident log management. Hashing for tamper detection is required at Level 3 and above under the THIRF objective.

**Elastic implementation**: Two-part implementation:
1. **Ingest pipeline** (`m_26_14-log-integrity-hash` / `m_26_14-integrity-hash-pipeline`): Appends SHA-256 hash of canonical fields to `event.hash` on every ingested document. Sets `event.integrity.hashed: true`. Applied at the index template level — no agent changes required.
2. **ML job** (`m_26_14-ml-element5-hash-coverage`): Counts integrity-hashed documents per data stream. Fires when the hashed-document count drops below the ML-learned baseline for that stream, indicating the ingest pipeline was bypassed, removed, or is failing.

**Job details**:
- Job ID: `m_26_14-ml-element5-hash-coverage`
- Job file: `public/assets/elasticsearch/ml_job/m_26_14-ml-element5-hash-coverage.json`
- Bucket span: 1 hour
- Model memory: 128 MB
- Detector: `low_count` partitioned by `data_stream.dataset`

**Scalability note**: The element5 datafeed is a plain term-query search with no aggregation, so it scales with data stream count without special handling. Because the detector counts hashed documents rather than computing a ratio, a stream whose overall volume drops will also lower its hashed count; the element2 ingestion-rate job separates volume drops from hash-pipeline failures.

**Dashboard**: `m_26_14-log-management` — shows hash coverage gauge, integrity violation timeline, and per-dataset coverage breakdown.

**Key documentation links**:
- [Elasticsearch ingest pipelines](https://www.elastic.co/guide/en/elasticsearch/reference/current/ingest.html)
- [Fingerprint processor](https://www.elastic.co/guide/en/elasticsearch/reference/current/fingerprint-processor.html)
- [ML anomaly detection](https://www.elastic.co/guide/en/machine-learning/current/ml-ad-overview.html)

---

### 5.6 ML Deployment Procedure

All seven custom ML jobs (five element jobs, the new-network-device discovery job, and the DNS-entropy job) must be deployed before the corresponding Kibana alert rules can reference them. Follow this sequence:

1. Verify Platinum or Enterprise license: `GET /_license`
2. Create all 7 job definitions via `PUT /_ml/anomaly_detectors/{job_id}`
3. Create all 7 datafeeds via `PUT /_ml/datafeeds/{datafeed_id}`
4. Open all 7 jobs: `POST /_ml/anomaly_detectors/{job_id}/_open`
5. Start all 7 datafeeds: `POST /_ml/datafeeds/{datafeed_id}/_start`
6. Wait for baseline period: minimum 14 days for all jobs except `m_26_14-ml-catb-dns-entropy` (7 days for 15-minute bucket span)
7. Enable the 7 Kibana rules bound to the custom jobs (five element rules, the meta compliance-degradation rule, and the DNS-entropy rule) after baseline is established
8. Prefix-install the five Elastic Security ML modules (`security_auth`, `security_host`, `security_network`, `security_linux_v3`, `security_windows_v3`) with job-id prefix `m_26_14_` — see `docs/ml-jobs-guide.md` Section 6 step 8 and `assets/elasticsearch/ml_job/prebuilt/README.md`
9. After 14-day module-job baseline, enable the 7 behavioral Kibana rules

**Full procedure with commands**: See `docs/ml-jobs-guide.md` Section 6.

---

## 6. Retention and Data Lifecycle

M-26-14 establishes minimum retention requirements by maturity level. All Appendix B log categories must meet the applicable retention threshold for the agency's claimed maturity level.

### 6.1 Retention Requirements by Level

| Maturity Level | Minimum Retention | This Pack's ILM Policy |
|---|---|---|
| Level 2 | 6 months searchable | `m_26_14-logs-l3-hot-frozen` (hot 30d, warm 6mo, cold 12mo) — meets L2 and L3 |
| Level 3 | 12 months | `m_26_14-logs-l3-hot-frozen` — same policy; 12-month cold phase satisfies L3 |
| Level 4 | 24 months | `m_26_14-logs-l4-hot-frozen` (hot 7d, warm 1mo, cold 24mo) |
| Audit logs (all levels) | No deletion | `m_26_14-logs-l3-no-delete` / `m_26_14-logs-l4-no-delete` — cold phase: indefinite |
| HWAM/SWAM asset inventory | 90 days | `m_26_14-asset-inventory` (90d, no archive) |

### 6.2 ILM Policy Definitions

This pack deploys five ILM policies:

| Policy Name | Hot | Warm | Cold / Frozen | Delete | Applicable To |
|---|---|---|---|---|---|
| `m_26_14-logs-l3-hot-frozen` | 30 days | 6 months, read-only, forcemerge | 12 months (searchable) | None | General L3 log streams — all Appendix B categories |
| `m_26_14-logs-l3-no-delete` | 30 days | 6 months | Indefinite | None | Audit logs, investigation-grade evidence, legal hold |
| `m_26_14-logs-l4-hot-frozen` | 7 days | 1 month | 24 months | None | L4 enhanced retention environments |
| `m_26_14-logs-l4-no-delete` | 7 days | 1 month | Indefinite | None | L4 + FIPS audit log permanence |
| `m_26_14-asset-inventory` | 90 days | — | — | 90 days | HWAM/SWAM asset inventory indices |

**Frozen tier note**: The production frozen tier uses Elasticsearch searchable snapshots — stored in a snapshot repository (S3, GCS, Azure Blob, or on-prem NFS) at dramatically reduced storage cost while maintaining full query capability. The demo cluster uses hot/warm/cold (no frozen tier) because a snapshot repository is not configured. For production deployments, configure a snapshot repository and update the ILM policies to use the frozen phase.

**Frozen tier setup**:
```
PUT /_snapshot/m_26_14-compliance-repo
{
  "type": "s3",
  "settings": {
    "bucket": "<your-bucket>",
    "region": "<aws-region>",
    "base_path": "m_26_14-snapshots"
  }
}
```

For GovCloud deployments, use `region: "us-gov-west-1"` and verify FedRAMP authorization of the S3 bucket.

### 6.3 Assigning ILM Policies to Data Streams

Apply the appropriate ILM policy to each data stream via its index template component. Example for endpoint logs:

```
PUT /_component_template/m_26_14-endpoint-settings
{
  "template": {
    "settings": {
      "index.lifecycle.name": "m_26_14-logs-l3-hot-frozen"
    }
  }
}
```

Then include this component template in the data stream's composed index template.

**Verify compliance**:
```
GET /_data_stream/logs-endpoint.events.process-default/_settings?filter_path=*.settings.index.lifecycle
```

### 6.4 Retention Compliance Dashboard

The `m_26_14-retention-readiness` Kibana dashboard (ID: `m_26_14-retention-readiness`) provides a visual ILM policy matrix:
- Green: meets L3 target (12 months)
- Yellow: meets L2 (6 months), needs upgrade for L3
- Red: non-compliant

The ML rule `m_26_14-ml-e4-retention-anomaly` detects anomalous ILM phase transitions — indices rolling over unexpectedly fast or skipping phases — which would compromise the retention guarantee.

**Key documentation links**:
- [ILM overview](https://www.elastic.co/guide/en/elasticsearch/reference/current/index-lifecycle-management.html)
- [Searchable snapshots](https://www.elastic.co/guide/en/elasticsearch/reference/current/searchable-snapshots.html)
- [Data stream lifecycle management](https://www.elastic.co/guide/en/elasticsearch/reference/current/data-stream-lifecycle.html)
- [Frozen tier](https://www.elastic.co/guide/en/elasticsearch/reference/current/data-tiers.html)

---

## 7. HWAM / SWAM / CDM Integration

### 7.1 Hardware Asset Management (HWAM)

M-26-14 requires agencies to maintain an up-to-date hardware asset inventory as the authoritative baseline for Element 1 asset coverage scoring. This pack integrates hardware asset data through two complementary mechanisms:

**Mechanism 1 — Elastic Osquery (active inventory)**

The `m_26_14-osquery-hardware-inventory` integration deploys hardware inventory queries to all Fleet-enrolled endpoints via Osquery. Queries collect `host.hardware.model`, `host.ip`, `host.mac`, `host.serial_number`, and OS details. Results are normalized to ECS by the `m_26_14-osquery-normalize` ingest pipeline and stored in `m_26_14-osquery-hardware-inventory-*`.

```sql
-- Osquery hardware query (runs on schedule via Fleet)
SELECT hardware_model, board_serial, cpu_brand, physical_memory FROM system_info;
SELECT address, mac, interface FROM interface_details WHERE interface != 'lo';
```

**Mechanism 2 — CDM HWAM API integration (authoritative inventory)**

For agencies with an existing CDM HWAM system, the mock HWAM API integration (`tools/fake-hwam-api/`) provides a reference implementation for ingesting the authoritative hardware inventory from the CDM dashboard API into `m_26_14-hwam_assets-*`. Replace the mock API endpoint with the production CDM API endpoint in the integration configuration.

**HWAM cross-reference in rule investigation**: When a rogue device alert (Category E / §5(e)) fires, the SOC playbook queries `m_26_14-osquery-hardware-inventory-*` by `host.mac` and `host.serial_number` to determine authorization status. See [rule-e-rogue-device.md](detection-rules/rule-e-rogue-device.md) Investigation Guide Step 2.

**Mechanism 3 — Canonical entity store (the resolved truth SAs demo)**

Raw inventory from osquery and Intune lands as multiple per-source documents in the `logs-m_26_14_asset.inventory-*` data stream (one device can report from several sources). Two Transforms resolve and certify it:

- **`m_26_14-asset-entity-resolution`** (continuous, `group_by asset.id`) merges every source record per device into one canonical entity in **`m_26_14-assets`**, latest-wins per field (`top_metrics` sorted by `@timestamp`). Its dest pipeline `m_26_14-asset-canonical-enrich` unwraps `top_metrics` maps, normalizes null/boolean strings, stamps a lowercased `host.name` (so Entity Store v2 can mint the host entity), derives `asset.component`, evaluates the Element 1/Element 2 coverage flags, and computes the `m_26_14.baseline_hash` configuration fingerprint.
- **`m_26_14-asset-baseline-snapshot`** captures each canonical entity's fingerprint into **`m_26_14-asset-baselines`** as the certified point-in-time baseline. This transform is run **once and then stopped** so the baseline is frozen — it is the certification reference, not a moving target.

**Representative live fleet** (deterministic seed): **60** canonical assets — **55 managed** (25 macOS laptops, 20 Windows workstations, 10 Linux servers) and **5 unmanaged** network-discovered devices (`UNKNOWN-001…005`). Posture gaps are pinned to named devices for a stable demo: **5 unencrypted** managed devices and **4 not enrolled in MDM** (`WKSTN-004`, `WKSTN-016`, `LAPTOP-022`, `SERVER-006`). **55** certified baselines (one per managed asset).

**Config drift (derived, stable)**: `m_26_14.drift_detected` (the field the drift dashboard counts; also mirrored to `asset.compliance.drift_detected`) is **not** a manually stamped flag and is **not** written by a watcher (an earlier design referenced a "WS3 drift watcher" that was never built). It is derived in `m_26_14-asset-canonical-enrich`: after computing the live `baseline_hash`, an `enrich` processor (policy `m_26_14-asset-baseline-lookup`, keyed on `asset.id`) fetches the certified hash from the frozen `m_26_14-asset-baselines`, and a script sets `drift_detected = (live_hash != certified_hash)`. Because it runs on **every** transform checkpoint, the count is stable across re-enrichment. The demo fleet has **2 drifted assets** — `WKSTN-003` and `WKSTN-013` (OS-version drift from their certified baseline). The `m_26_14-ws7-r1-os-version-changed` and `m_26_14-ws7-r2-encryption-disabled` detection rules provide the real-time alerting complement on the same fields.

> **Operational note for SAs:** drift stability depends on the `m_26_14-asset-baseline-snapshot` transform staying **stopped**. If it is restarted it will re-snapshot current (drifted) state, the baselines move to match, and the drift count collapses to 0. To re-establish a drift story: stop the snapshot transform, re-execute the `m_26_14-asset-baseline-lookup` enrich policy, change a fingerprint field (OS version or encryption) on a few devices in the inventory stream, then let the entity-resolution transform re-checkpoint.

**Key documentation links**:
- [Osquery Fleet integration](https://www.elastic.co/guide/en/fleet/current/osquery-manager-integration.html)
- [CISA CDM Program](https://www.cisa.gov/cdm)
- [Enrich processor](https://www.elastic.co/guide/en/elasticsearch/reference/current/enrich-processor.html)
- [Transforms](https://www.elastic.co/guide/en/elasticsearch/reference/current/transforms.html)

### 7.2 Software Asset Management (SWAM)

SWAM data is collected by the Osquery software inventory pack, storing installed software details in `m_26_14-osquery-software-inventory-*`. Software authorization status (`software.authorized: true/false`) is enriched by comparing against an agency-maintained authorized software list.

**Usage in exfiltration investigation**: When a Category I (exfiltration) alert fires, the investigation guide queries `m_26_14-osquery-software-*` to cross-reference the exfiltrating process name against the authorized software list. An unauthorized process (`software.authorized == false` or absent from inventory) escalates the severity of the alert immediately.

```esql
FROM m_26_14-osquery-software-*
| WHERE host.name == "<HOST_NAME>"
  AND software.name LIKE "*<PROCESS_BASE_NAME>*"
| KEEP host.name, software.name, software.authorized, software.version
```

### 7.3 CDM Program Integration

The CDM (Continuous Diagnostics and Mitigation) program integration connects this Elastic deployment to CISA's agency-wide visibility platform. Key integration points:

| CDM Capability | Elastic Integration Method | Data Flow |
|---|---|---|
| HWAM asset inventory | CDM API → Elastic Agent custom integration → `m_26_14-hwam_assets-*` | CDM → Elastic |
| Alerting to CDM dashboard | Kibana Connector → CDM webhook | Elastic → CDM |
| AIS threat indicators | CISA AIS TAXII → `logs-ti_cisa.*` | CDM/CISA → Elastic |

> **Note:** CDM integration specifics vary by agency CDM deployment configuration. The `tools/fake-hwam-api/` mock provides a test harness for the HWAM integration. Agencies should work with their CDM integrator to map the production CDM API endpoints to the integration configuration.

---

## 8. Quick-Start Deployment Sequence

The following sequence represents the minimum path from zero to M-26-14 Level 2 compliance. Each step includes a verification command.

> **Two delivery paths.** The M-26-14 assets ship two ways:
> 1. **EPR integration package** (`m_26_14`, format_version 3.x, Enterprise, **Kibana/Elasticsearch 9.4+**) — install from Fleet → Integrations. This carries every EPR-packageable asset (ingest pipelines, transforms, data-stream templates, dashboards, ML modules, security rules, osquery pack). Recommended for new deployments.
> 2. **Bootstrap + web app** for assets EPR cannot carry. A Dev Console / REST bootstrap runbook loads ES-level assets (ILM policies, enrich policies, standalone index templates, watchers, SLM); agents, agent tools, and workflows load via the reference-architecture web app or the Kibana API.
>
> The deployment scripts referenced below (`setup-kibana/setup.py`, `setup_ws5.py`, the `seed-demo-data/` seeders) live in the **`elastic-m2614-compliance`** companion repo, not in this reference-architecture repo. Run them from that repo's root with a populated `.env`. They are the scripted equivalent of the package + bootstrap install and are used to stand up the live demo cluster.

### Step 1 — Deploy Elastic Fleet and Enroll Endpoints

```bash
# Verify Fleet Server is reachable
GET https://<fleet-server>:8220/api/status

# Verify agents are enrolled and healthy
GET https://<kibana>:5601/api/fleet/agents?kuery=status:healthy
```

Minimum agent policy for M-26-14: Elastic Defend (process, network, file events enabled) + System integration (auth module) + Auditd (Linux hosts only).

### Step 2 — Install Required Integrations

Navigate to Fleet → Integrations and install:
- `windows` (Security event logs)
- `okta` (Okta System Log)
- `azure` (Sign-In Logs)
- `elastic_agent` + `fleet_server` (enrollment events)
- `zeek` or Elastic Network Packet Capture (network flow)
- TAXII Threat Intelligence (CISA AIS)

### Step 3 — Deploy Ingest Pipelines and Index Templates

```bash
python tools/setup-kibana/setup.py
```

This deploys:
- `m_26_14-log-integrity-hash` ingest pipeline (Element 5)
- `m_26_14-osquery-normalize` ingest pipeline (HWAM/SWAM ECS normalization)
- All M-26-14 index templates with ILM policy assignments

### Step 4 — Deploy ILM Policies

All five ILM policies are deployed by `setup.py`. Verify:
```
GET /_ilm/policy/m_26_14-logs-l3-hot-frozen
```

### Step 5 — Import and Enable Detection Rules

```bash
python tools/setup_ws5.py
```

Import order per deployment phases (see Section 4.3):
1. Phase 1: §5(f), §5(g), §5(d), §5(a)
2. Phase 2: §5(j), §5(k)
3. Phase 3: §5(b), §5(c), §5(e)
4. Phase 4: §5(h), §5(i)

Enable each rule only after confirming the underlying data streams contain recent events.

### Step 6 — Deploy ML Jobs

Follow the procedure in `docs/ml-jobs-guide.md` Section 6. Allow 14-day baseline period before enabling alert rules.

### Step 7 — Configure Dashboards and Validate

Open Kibana → Dashboards → search "M-26-14". Validate:
- `m_26_14-maturity-overview`: Element score gauges showing coverage percentages
- `m_26_14-alert-coverage`: All 11 categories showing at least yellow status
- `m_26_14-retention-readiness`: All Appendix B data streams meeting L3 retention (green)

---

## 9. License and Version Requirements

| Requirement | Minimum Version / Tier | Notes |
|---|---|---|
| Elasticsearch | 8.16+ (recommended: 9.4.x) | ES\|QL `DATE_DIFF`, `CIDR_MATCH`, `COUNT_DISTINCT` required |
| Kibana | 8.16+ (recommended: 9.4.x) | ES\|QL rule type, EQL sequence rules |
| Elastic Security | 8.16+ | Detection Engine, EQL `with runs=` syntax |
| Elastic License | Enterprise (for full feature set) | Indicator Match rules require Enterprise; ML requires Platinum+ |
| Elastic Defend | 8.10+ | Process, network, file events; memory acquisition |
| Fleet Server | 8.14+ | Enrollment events for Category E (rogue device) |
| `m_26_14` EPR package | **Kibana / Elasticsearch 9.4+** | Integration package format_version 3.x; Entity Store v2 scoring requires 9.4+ and Enterprise |

> **Version split.** The detection rules, ML jobs, and ingest pipelines run on 8.16+. The **EPR integration package** and the **Entity Store v2 scoring engine** (canonical entity store, observed-ledger retention, expected/observed quadrant) require **9.4+ and Enterprise**. Deploy on 9.4.x to get both the rule set and the packaged + scored experience. The live demo cluster runs 9.4.2.

**License verification**:
```
GET /_license
```
The `type` field must be `enterprise` for Indicator Match rules (Category G). `platinum` or `enterprise` for ML anomaly detection (Appendix C elements).

**Tested against**: Elastic Security 9.4.2.

---

## Appendix — Rule-to-Requirement Cross-Reference

| Rule ID | M-26-14 Section | Objective | MITRE ATT&CK | Severity |
|---|---|---|---|---|
| `m_26_14-appendixb-a-windows-credential-stuffing` | §5(a) | CEM, THIRF | T1110.003 | High |
| `m_26_14-appendixb-a-okta-credential-stuffing` | §5(a) | CEM, THIRF | T1110.003 | High |
| `m_26_14-appendixb-a-azure-credential-stuffing` | §5(a) | CEM, THIRF | T1110.003 | High |
| `m_26_14-appendixb-a-linux-ssh-credential-stuffing` | §5(a) | CEM, THIRF | T1110.003 | High |
| `m_26_14-appendixb-b-c2-beaconing` | §5(b) | CEM, THIRF | T1071, T1071.001 | High |
| `m_26_14-appendixb-c-mass-file-access` | §5(c) | CEM, THIRF | T1005 | High |
| `m_26_14-appendixb-d-privilege-escalation-sequence` | §5(d) | CEM, THIRF | T1136.001, T1078.002 | High |
| `m_26_14-appendixb-e-rogue-device-fleet-enrollment` | §5(e) | CEM, THIRF | T1200 | High |
| `m_26_14-appendixb-f-edr-tamper` | §5(f) | CEM, THIRF | T1562.001 | Critical |
| 5 prebuilt Threat Intel rules (tagged M-26-14:Category-G) | §5(g) | CEM, THIRF | Multiple | Critical/High |
| `m_26_14-appendixb-g-ioc-domain-match` | §5(g) | CEM, THIRF | T1071.004 | High |
| `m_26_14-appendixb-h-offhours-bulk-process-execution` | §5(h) | CEM, THIRF | T1059.001, T1059.003 | High |
| `m_26_14-appendixb-i-exfiltration-volume` | §5(i) | CEM, THIRF | T1048.002, T1041 | High |
| `m_26_14-appendixb-j-apt-chain-2h` | §5(j) | CEM, THIRF | T1190, T1059, T1021 | Critical |
| `m_26_14-appendixb-j-apt-chain-4h` | §5(j) | CEM, THIRF | T1190, T1059, T1021 | Critical |
| `m_26_14-appendixb-k-alert-presence` | §5(k) | CEM | — | Medium |
| `m_26_14-appendixb-k-silent-category` | §5(k) | CEM | — | Medium |
| `m_26_14-ml-element1-asset-coverage` (ML job) | Appendix C, Element 1 | CEM | — | — |
| `m_26_14-ml-element2-ingestion-rate` (ML job) | Appendix C, Element 2 | CEM | — | — |
| `m_26_14-ml-element3-rule-silence` (ML job) | Appendix C, Element 3 | CEM | — | — |
| `m_26_14-ml-element4-ilm-anomaly` (ML job) | Appendix C, Element 4 | THIRF | T1485, T1070.004 | — |
| `m_26_14-ml-element5-hash-coverage` (ML job) | Appendix C, Element 5 | THIRF | T1565.001, T1070 | — |
| `m_26_14-ml-catb-dns-entropy` (ML job) | §5(b), §5(g) | THIRF | T1568.002, T1071.004 | — |
| `m_26_14-ml-element1-new-network-device` (ML job) | Appendix A HWAM, §5(e) | CEM | T1200 | — |
