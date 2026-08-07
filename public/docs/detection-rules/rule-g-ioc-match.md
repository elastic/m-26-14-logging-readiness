# M-26-14 Appendix B Category (G): IoC Monitoring — Threat Intelligence Indicator Match Rules

## Overview

Category G is unique among the M-26-14 Appendix B categories: it is covered almost entirely by **five existing Elastic Security prebuilt rules**, plus **one custom pack rule** for the indicator type the prebuilt set does not yet cover. The bulk of the compliance work for Category G is operational — agencies must configure and activate the prebuilt rules, connect them to authoritative threat intelligence feeds, and apply M-26-14 tagging so the rules appear in compliance reports.

The five prebuilt rules collectively match network, endpoint, and email telemetry against most indicator types published in structured threat intelligence feeds: IP addresses, file hashes, URLs, email sender addresses, and Windows registry values. The pack's custom rule, `m_26_14-appendixb-g-ioc-domain-match`, closes the remaining gap: DNS/domain indicators matched against DNS query telemetry (earlier pack revisions also shipped custom hash, IP, and URL match rules; those were retired in favor of the prebuilts, which Elastic maintains through the prebuilt-rule update stream). When an indicator match fires, Elastic Security automatically attaches the full indicator document — including source feed, confidence score, MITRE ATT&CK mapping, and any attribution notes — to the generated alert, satisfying the M-26-14 requirement for threat-informed response context.

---

## M-26-14 Reference

**Appendix B, Category (G) — Indicators of Compromise (IoC) Monitoring**

> Agencies shall implement continuous monitoring for known Indicators of Compromise (IoCs) sourced from authoritative and agency-approved threat intelligence feeds. At minimum, agencies must detect and alert on network connections, file activity, and process behavior that match current IoC data for IP addresses, domain names, URLs, file hashes, and email indicators. IoC matching shall be performed in near-real-time against telemetry ingested by the agency's Security Information and Event Management (SIEM) system. Agencies shall integrate at minimum one CISA-approved threat intelligence feed and shall document their feed inventory, refresh cadence, and alert routing procedures in their Cyber Event Management (CEM) plan.

*Source: OMB Memorandum M-26-14, Appendix B §5(g), Minimum Viable Cyber Defense Posture — Element 3, Level 2.*

**Compliance Mapping:**

| Attribute | Value |
|---|---|
| **M-26-14 Element** | Element 3 — Continuous Monitoring |
| **Minimum Level** | Level 2 — Automated detection with alert generation and threat context |
| **Objectives** | CEM (Cyber Event Management), THIRF (Threat-Informed Response Framework) |
| **MITRE ATT&CK Tactics** | Multiple — dependent on indicator type and feed attribution |
| **CISA Directive Cross-Reference** | CISA BOD 23-01 (Asset Visibility and Vulnerability Detection) |

---

## The Five Prebuilt Rules That Cover Category G

All five rules ship with Elastic Security and are available in the Prebuilt Rules library under **Security > Rules > Add Elastic Rules**. None require custom query authoring. Each uses the same underlying mechanism: the Elastic Security **Indicator Match** rule type, which joins endpoint/network/email telemetry against indicators stored in a designated threat intelligence index.

### Rule 1: Threat Intel IP Address Indicator Match

| Field | Value |
|---|---|
| **Rule UUID** | `0c41e478-5263-4c69-8f9e-7dfd2c22da64` |
| **Rule Name** | Threat Intel IP Address Indicator Match |
| **Type** | Indicator Match |
| **Severity** | Critical |
| **Risk Score** | 99 |
| **Indicator Type** | IPv4/IPv6 addresses |
| **Source Index** | Network flow logs, endpoint network events |
| **Indicator Index** | `logs-ti_*`, `.lists-*` |
| **Indicator Field** | `threat.indicator.ip` |
| **Event Field Matched** | `source.ip`, `destination.ip` |
| **MITRE Tactic** | Multiple (depends on feed attribution) |

This rule is the highest-priority indicator match in a federal environment. CISA AIS, the primary required feed, publishes malicious IP addresses for active threat actor C2 infrastructure, scanning hosts, and exploit delivery nodes. A match on `destination.ip` means a workstation or server inside the agency perimeter attempted to contact a known-malicious host; a match on `source.ip` means a known-malicious host is reaching into the agency.

### Rule 2: Threat Intel Hash Indicator Match

| Field | Value |
|---|---|
| **Rule UUID** | `aab184d3-72b3-4639-b242-6597c99d8bca` |
| **Rule Name** | Threat Intel Hash Indicator Match |
| **Type** | Indicator Match |
| **Severity** | Critical |
| **Risk Score** | 99 |
| **Indicator Type** | MD5, SHA-1, SHA-256 file hashes |
| **Source Index** | `logs-endpoint.events.file*`, `logs-endpoint.events.process*` |
| **Indicator Index** | `logs-ti_*`, `.lists-*` |
| **Indicator Field** | `threat.indicator.file.hash.*` |
| **Event Field Matched** | `file.hash.md5`, `file.hash.sha1`, `file.hash.sha256`, `process.hash.*` |
| **MITRE Tactic** | TA0002 — Execution, TA0003 — Persistence |

Hash matching catches known malware, tools, and implants that have been previously analyzed and catalogued by threat intelligence providers. Unlike behavioral rules, hash matching requires zero tuning — a match is a high-confidence finding regardless of context. This rule fires on both file write events (a malicious file was dropped) and process start events (a malicious binary was executed).

### Rule 3: Threat Intel URL Indicator Match

| Field | Value |
|---|---|
| **Rule UUID** | `f3e22c8b-ea47-45d1-b502-b57b6de950b3` |
| **Rule Name** | Threat Intel URL Indicator Match |
| **Type** | Indicator Match |
| **Severity** | High |
| **Risk Score** | 73 |
| **Indicator Type** | Full URLs and URL fragments |
| **Source Index** | Proxy logs, network HTTP logs, endpoint browser events |
| **Indicator Index** | `logs-ti_*`, `.lists-*` |
| **Indicator Field** | `threat.indicator.url.full`, `threat.indicator.url.domain` |
| **Event Field Matched** | `url.full`, `url.domain`, `http.request.referrer` |
| **MITRE Tactic** | TA0001 — Initial Access, TA0011 — Command and Control |

URL matching covers phishing delivery infrastructure, malware distribution sites, and C2 callback paths that use HTTP(S). Many threat actor operations use domain fronting or URL path-based routing, making full-URL matching more precise than IP or domain matching alone. This rule is particularly effective when paired with proxy log ingestion (e.g., Zscaler, BlueCoat, or Squid via the Elastic Agent).

### Rule 4: Threat Intel Email Indicator Match

| Field | Value |
|---|---|
| **Rule UUID** | `fcf18de8-ad7d-4d01-b3f7-a11d5b3883af` |
| **Rule Name** | Threat Intel Email Indicator Match |
| **Type** | Indicator Match |
| **Severity** | High |
| **Risk Score** | 73 |
| **Indicator Type** | Email sender addresses, reply-to addresses |
| **Source Index** | `logs-o365.audit*`, `logs-google_workspace.gmail*`, email gateway logs |
| **Indicator Index** | `logs-ti_*`, `.lists-*` |
| **Indicator Field** | `threat.indicator.email.address` |
| **Event Field Matched** | `email.from.address`, `email.sender.address` |
| **MITRE Tactic** | TA0001 — Initial Access |
| **MITRE Technique** | T1566 — Phishing |

Email indicator matching is the detection layer for spear-phishing campaigns. When a threat intelligence feed publishes a sender address used in an active phishing campaign — a common CISA AIS publication type — this rule fires the moment a matching email is received by any agency mailbox, before a user clicks. Requires O365, Google Workspace, or email gateway log ingestion.

### Rule 5: Threat Intel Windows Registry Indicator Match

| Field | Value |
|---|---|
| **Rule UUID** | `a61809f3-fb5b-465c-8bff-23a8a068ac60` |
| **Rule Name** | Threat Intel Windows Registry Indicator Match |
| **Type** | Indicator Match |
| **Severity** | High |
| **Risk Score** | 73 |
| **Indicator Type** | Windows registry key paths and values |
| **Source Index** | `logs-endpoint.events.registry*` |
| **Indicator Index** | `logs-ti_*`, `.lists-*` |
| **Indicator Field** | `threat.indicator.registry.key`, `threat.indicator.registry.value.data` |
| **Event Field Matched** | `registry.key`, `registry.value` |
| **MITRE Tactic** | TA0003 — Persistence, TA0005 — Defense Evasion |
| **MITRE Technique** | T1547 — Boot or Logon Autostart Execution |

Registry indicator matching catches persistence mechanisms documented in threat intelligence. APT actors frequently use known registry run keys and value names across campaigns — these paths become IoCs once documented. This rule closes the gap between behavioral detection (which looks for unusual activity patterns) and IoC-based detection (which looks for exact signatures of previously-observed attacker tools).

---

## The Pack's Custom Rule: Domain Indicator Match

The prebuilt set does not yet include a domain-name indicator match against DNS query telemetry. The pack ships one custom rule to cover it:

| Field | Value |
|---|---|
| **Rule ID** | `m_26_14-appendixb-g-ioc-domain-match` |
| **Rule Name** | M-26-14 AppB-G: IoC — Malicious Domain in DNS Queries |
| **Type** | Indicator Match |
| **Severity** | High |
| **Risk Score** | 73 |
| **Indicator Type** | Domain names |
| **Source Index** | `logs-network_traffic.dns*`, `logs-zeek.dns*`, `logs-endpoint.events.network*`, `logs-aws.route53*`, `logs-azure.platformlogs*` |
| **Indicator Index** | `logs-ti_*` |
| **Indicator Field** | `threat.indicator.domain` |
| **Event Field Matched** | `dns.question.name`, `url.domain` |
| **MITRE Technique** | T1071.004 — Application Layer Protocol: DNS |

Domain matching catches C2 callbacks and malware distribution infrastructure at the DNS layer, before a connection to the resolved IP is even attempted. It complements the IP match rule: threat actors rotate IPs behind a stable malicious domain far more often than they rotate the domain itself. Earlier pack revisions also shipped custom hash, IP, and URL match rules; those were retired in favor of the prebuilt rules above, which Elastic maintains through the prebuilt-rule update stream. This rule will be retired the same way once an equivalent prebuilt domain rule ships.

---

## Applying M-26-14 Tags to Prebuilt Rules

The five prebuilt rules ship without M-26-14 compliance tags. Tags must be added manually so the rules appear correctly in compliance dashboards and exports. Elastic Security preserves custom tags through prebuilt rule upgrades — adding tags will not block future updates to the rule logic.

### Method 1: Kibana UI (recommended for initial setup)

1. Navigate to **Security > Rules > Detection Rules (SIEM)**.
2. In the search bar, search for `Threat Intel` to filter to the five rules.
3. Select all five rules using the checkbox in the table header.
4. Click **Bulk actions > Edit rule settings**.
5. Under **Tags**, add the following tags to all five rules:
   - `M-26-14`
   - `M-26-14:AppendixB`
   - `M-26-14:Category-G`
   - `Compliance`
   - `Threat-Intelligence`
6. Click **Save**.

Verify tags were applied: click any of the five rules and confirm the tags appear in the **About** section of the rule detail page.

### Method 2: Kibana API (recommended for automation and CI/CD pipelines)

Use the Rules API to add tags in bulk. First retrieve the current rule definitions, then PATCH each with the additional tags. The following pattern applies to all five rules — substitute each UUID:

```bash
# Retrieve current rule (to get current tags array before patching)
curl -s -X GET \
  "https://<kibana-host>/api/detection_engine/rules?rule_id=<RULE_UUID>" \
  -H "kbn-xsrf: true" \
  -H "Authorization: ApiKey <your_api_key>" | jq '.tags'

# Patch rule with M-26-14 tags appended to existing tags
curl -s -X PATCH \
  "https://<kibana-host>/api/detection_engine/rules" \
  -H "kbn-xsrf: true" \
  -H "Content-Type: application/json" \
  -H "Authorization: ApiKey <your_api_key>" \
  -d '{
    "rule_id": "<RULE_UUID>",
    "tags": [
      "<existing_tag_1>",
      "<existing_tag_2>",
      "M-26-14",
      "M-26-14:AppendixB",
      "M-26-14:Category-G",
      "Compliance",
      "Threat-Intelligence"
    ]
  }'
```

Apply to all five UUIDs:
- `0c41e478-5263-4c69-8f9e-7dfd2c22da64` (IP)
- `aab184d3-72b3-4639-b242-6597c99d8bca` (Hash)
- `f3e22c8b-ea47-45d1-b502-b57b6de950b3` (URL)
- `fcf18de8-ad7d-4d01-b3f7-a11d5b3883af` (Email)
- `a61809f3-fb5b-465c-8bff-23a8a068ac60` (Registry)

### Method 3: Terraform (for IaC environments)

If the agency manages Elastic Security rules via the `elasticstack` Terraform provider, add tags in the `kibana_security_rule` resource for each prebuilt rule. Note that managing prebuilt rules via Terraform requires importing them first (`terraform import`).

---

## Recommended Threat Intelligence Feeds for Federal Agencies

### Tier 1: Required for M-26-14 Compliance

| Feed | Provider | Indicator Types | Elastic Integration | Refresh Cadence |
|---|---|---|---|---|
| **CISA Automated Indicator Sharing (AIS)** | CISA | IP, domain, URL, hash, email | `ti_cisa` (via STIX/TAXII) | Near-real-time (TAXII push) |
| **CISA Known Exploited Vulnerabilities (KEV)** | CISA | CVE identifiers, vendor/product | Manual enrichment | Daily |
| **MS-ISAC TLP:WHITE feed** | MS-ISAC (CIS) | IP, domain, hash | STIX/TAXII | Hourly |

CISA AIS is the primary required feed. Agencies must register for AIS at `https://www.cisa.gov/ais`. Feed credentials are issued to the agency ISSO after registration. CISA AIS publishes STIX 2.1 bundles over TAXII 2.1 — the Elastic TAXII Threat Intelligence integration consumes this format natively.

### Tier 2: Highly Recommended Supplementary Feeds

| Feed | Provider | Indicator Types | Elastic Integration | Refresh Cadence |
|---|---|---|---|---|
| **abuse.ch URLhaus** | abuse.ch | Malware distribution URLs, domains | `ti_abusech` | Every 5 minutes |
| **abuse.ch MalwareBazaar** | abuse.ch | File hashes (MD5, SHA-1, SHA-256) | `ti_abusech` | Every 5 minutes |
| **abuse.ch Feodo Tracker** | abuse.ch | C2 IP addresses (banking trojans, Cobalt Strike) | `ti_abusech` | Every 5 minutes |
| **MISP Default Feeds** | Community / MISP Project | All indicator types | MISP Threat Intelligence integration | Configurable |
| **AlienVault OTX** | AT&T Cybersecurity | IP, domain, URL, hash, CVE | `ti_otx` | Hourly |
| **Emerging Threats Open** | Proofpoint | IP, domain, network signatures | `ti_emergingthreats` | Daily |

### Tier 3: Commercial Feeds (agency-specific)

| Feed Category | Examples | Notes |
|---|---|---|
| Premium government-focused | Recorded Future Gov, Mandiant Advantage Gov | Require contract vehicle (e.g., Schedule 70, NASA SEWP) |
| Sector-specific ISACs | FS-ISAC, H-ISAC, E-ISAC | Agency sector determines eligibility |
| Agency-specific classified feeds | IC feeds via classified Kibana deployment | Requires separate air-gapped or classified Elastic deployment |

### Feed Inventory Documentation Requirement

M-26-14 §5(g) requires agencies to document their feed inventory. Maintain a feed registry in your CEM plan with at minimum:

| Column | Purpose |
|---|---|
| Feed name and provider | Identity |
| Indicator types published | Scope |
| Elastic integration name and version | Technical reference |
| Refresh cadence | Data freshness SLA |
| TLP classification | Sharing restrictions |
| Date integrated | Change tracking |
| ISSO approval date | Governance |

---

## Setup Requirements

### 1. Threat Intelligence Index

All five indicator match rules query the threat intelligence index pattern `logs-ti_*`. This index is populated by Elastic's threat intelligence integrations. At minimum, enable the CISA AIS integration (TAXII client):

**Navigate to:** Fleet > Integrations > search "Threat Intelligence" > select the appropriate integration for your feed(s).

Verify the threat intel index is receiving data:

```json
GET logs-ti_*/_count
{
  "query": {
    "range": {
      "@timestamp": {
        "gte": "now-24h"
      }
    }
  }
}
```

A `count` of zero means no indicators have been ingested. The indicator match rules will generate no alerts until this index contains data.

Check which indicator types are present:

```json
GET logs-ti_*/_search
{
  "size": 0,
  "aggs": {
    "indicator_types": {
      "terms": {
        "field": "threat.indicator.type",
        "size": 20
      }
    }
  }
}
```

Expected output for a healthy multi-feed configuration:

```json
"buckets": [
  { "key": "ipv4-addr", "doc_count": 45231 },
  { "key": "file",      "doc_count": 12847 },
  { "key": "url",       "doc_count": 8903 },
  { "key": "email-addr","doc_count": 2114 },
  { "key": "windows-registry-key", "doc_count": 891 }
]
```

### 2. Value Lists (`.lists-*`)

The indicator match rules also support matching against Elastic Security **Value Lists** (stored in `.lists-*` indices). Value lists are appropriate for agency-curated IoC sets — for example, a list of IP addresses published in a TLP:RED advisory that cannot be stored in the shared threat intel index.

Create a value list:

1. Navigate to **Security > Manage > Value Lists**.
2. Click **Upload value list**.
3. Upload a newline-delimited file of indicators (one IP, hash, URL, or domain per line).
4. Set the list type to match the indicator type (`ip`, `keyword`, etc.).
5. Give the list a name that includes the source and date: e.g., `cisa-apt29-c2-ips-2026-05-30`.

Reference the value list in rule exceptions or as a match source.

### 3. Feed Configuration: CISA AIS via TAXII

The CISA AIS TAXII endpoint requires agency-specific credentials. After registering with CISA AIS:

1. Navigate to **Fleet > Integrations > TAXII Threat Intelligence**.
2. Add an integration with the following configuration:

| Parameter | Value |
|---|---|
| **TAXII server URL** | `https://ais-taxii.dhs.gov/taxii2/` (provided by CISA upon registration) |
| **Collection ID** | Provided by CISA upon registration |
| **Username** | Agency TAXII credential (from CISA AIS portal) |
| **Password** | Agency TAXII credential (from CISA AIS portal) |
| **Poll interval** | `60s` (recommended for near-real-time) |
| **Initial interval** | `720h` (30 days of backfill on first run) |
| **Target index** | `logs-ti_cisa.threat-default` |

### 4. Feed Configuration: abuse.ch (URLhaus, MalwareBazaar, Feodo Tracker)

abuse.ch feeds are free, require no credentials, and refresh every 5 minutes — making them the fastest supplementary feeds available.

Navigate to **Fleet > Integrations > AbuseCH** and enable all three sub-integrations:

| Sub-integration | Indicator Type | Index |
|---|---|---|
| URLhaus | URLs, domains | `logs-ti_abusech.url-default` |
| MalwareBazaar | File hashes | `logs-ti_abusech.malware-default` |
| Feodo Tracker | C2 IP addresses | `logs-ti_abusech.botnet-default` |

### 5. Enabling the Rules

After verifying the threat intel index is populated:

1. Navigate to **Security > Rules > Detection Rules (SIEM)**.
2. Search for `Threat Intel`.
3. Select all five rules.
4. Click **Bulk actions > Enable**.

Confirm all five rules show **Enabled** status. The first indicator match alerts will appear within one indicator match rule execution interval (typically 1 hour for indicator match rules by default — see tuning guidance below).

### 6. Required Data Streams by Rule

| Rule | Required Data Stream |
|---|---|
| IP Address Indicator Match | `logs-endpoint.events.network*`, `logs-zeek.*`, `logs-panw.*`, or other network telemetry |
| Hash Indicator Match | `logs-endpoint.events.file*`, `logs-endpoint.events.process*` |
| URL Indicator Match | `logs-proxy.*`, `logs-endpoint.events.network*`, `logs-o365.audit*` |
| Email Indicator Match | `logs-o365.audit*`, `logs-google_workspace.gmail*` |
| Windows Registry Indicator Match | `logs-endpoint.events.registry*` |

Run `GET <data-stream>/_count` with a 1-hour time filter to confirm each relevant stream is active before enabling the corresponding rule.

---

## Example Scenario: APT29 C2 IP Match via CISA AIS

**09:15 AM** — CISA AIS publishes a new STIX indicator bundle. The bundle contains a STIX `indicator` object of type `ipv4-addr` with value `198.51.100.47`. The indicator is attributed to APT29 (Cozy Bear), marked TLP:GREEN, and references MITRE technique T1071.001 (Application Layer Protocol: Web Protocols). The associated kill-chain phase is `command-and-control`. The CISA TAXII integration polling against `ais-taxii.dhs.gov` retrieves the bundle within 55 seconds of publication and writes the indicator document to `logs-ti_cisa.threat-default`.

**09:16 AM** — The indicator document is now queryable in `logs-ti_*`. Its key fields:

```json
{
  "threat.indicator.type": "ipv4-addr",
  "threat.indicator.ip": "198.51.100.47",
  "threat.indicator.confidence": "High",
  "threat.indicator.provider": "CISA AIS",
  "threat.indicator.marking.tlp": "GREEN",
  "threat.indicator.first_seen": "2026-05-30T09:15:00Z",
  "threat.indicator.reference": "https://www.us-cert.gov/...",
  "threat.group.alias": ["APT29", "Cozy Bear"],
  "threat.technique.id": ["T1071", "T1071.001"],
  "threat.tactic.name": "Command and Control"
}
```

**09:19 AM** — Workstation `WS-FIN-047` (a finance office endpoint) establishes an outbound HTTPS connection to `198.51.100.47:443`. Elastic Defend on the workstation generates a network event with `destination.ip: 198.51.100.47`. The event is indexed to `logs-endpoint.events.network-default`.

**09:19 AM + 4 minutes** — The Threat Intel IP Address Indicator Match rule executes its next scheduled run. The rule joins the endpoint network event against `logs-ti_*` on the `destination.ip` / `threat.indicator.ip` field pair. The join produces a match. The rule generates a **Critical** alert.

The alert document contains:

- The original network connection event (source, destination, process that opened the connection)
- The full indicator document from CISA AIS (TLP classification, APT29 attribution, MITRE T1071.001 mapping)
- `kibana.alert.rule.name: "Threat Intel IP Address Indicator Match"`
- `kibana.alert.risk_score: 99`
- Tags: `M-26-14`, `M-26-14:AppendixB`, `M-26-14:Category-G`, `Threat-Intelligence`

**09:23 AM** — The alert appears in **Security > Alerts**. The on-call SOC analyst receives a PagerDuty notification. The alert detail page shows:

- Process that initiated the connection: `mshta.exe` (HTML Application Host — a known living-off-the-land binary used by APT29)
- Parent process: `WINWORD.EXE` (Microsoft Word — consistent with a macro-enabled document execution chain)
- Indicator context panel: APT29 attribution, TLP:GREEN, first seen 8 minutes ago, reference link to CISA advisory

**09:23 AM** — An automated case is created (via the rule's case action, if configured) with the indicator context, the MITRE T1071.001 mapping, and the APT29 attribution note pre-populated in the case description. The case is assigned to the Tier 2 analyst queue with P1 priority.

**M-26-14 Category G satisfied.** The agency has:
- Ingested a CISA-published IoC within minutes of publication
- Detected a matching network event within the same hour
- Generated an alert with full threat context attached
- Created a case for response tracking

The total time from CISA indicator publication to analyst notification: **8 minutes**.

---

## Investigation Guide

### Step 1 — Identify the Indicator (0–5 minutes)

1. Open the alert in **Security > Alerts**. The alert detail panel includes an **Indicator** section — expand it.
2. Note the indicator type, value, provider, TLP classification, and any attribution fields (`threat.group.alias`, `threat.technique.id`).
3. Note `threat.indicator.confidence`. High-confidence indicators from CISA AIS warrant immediate escalation. Lower-confidence community feed indicators may warrant validation before host isolation.
4. Note `threat.indicator.first_seen` and `threat.indicator.last_seen`. A very recent first-seen time (minutes ago) indicates a newly-published IoC — the agency may be among the first to observe a match, which increases severity.

### Step 2 — Identify the Affected Asset (0–5 minutes)

5. From the alert, identify `host.name`, `host.id`, and `user.name` (if present).
6. Navigate to **Security > Hosts** and open the affected host. Review the host risk score — was this host already elevated before this alert?
7. For IP match rules: identify whether the match was on `source.ip` (inbound — a known-malicious host contacted the agency) or `destination.ip` (outbound — a workstation called out to a known-malicious host). Outbound is higher priority.
8. For hash match rules: identify whether the match was on a file write event or a process start event. A process start match means malware is executing.

### Step 3 — Assess Scope and Establish Timeline (5–15 minutes)

9. For IP matches: search `logs-endpoint.events.network*` for `destination.ip: <indicator_value>` across all hosts in the last 30 days. Has this IP been contacted by other hosts? How many? This establishes blast radius.
10. For hash matches: search for the file hash across all endpoints. How many hosts have this file? Is it executing on multiple hosts?
11. Review the process tree for the affected host at the time of the match event. What spawned the connection or wrote the file?
12. Search `.alerts-security.*` for other alerts on the same host in the 24 hours before this alert.

### Step 4 — Containment Decision (10–20 minutes)

13. If the indicator confidence is High (CISA AIS, MS-ISAC) and the event is a live process execution or active C2 connection: initiate **Fleet > Agents > Host Isolation** immediately.
14. If the indicator confidence is Medium or the event is a stale file artifact: consult with the ISSO before isolating. A false positive on a critical server can cause an outage.
15. For email indicator matches: work with the email security team to quarantine the email from all mailboxes and block the sender address at the gateway.
16. For URL matches: submit the URL to the web proxy for immediate block.

### Step 5 — Document and Report

17. Open an incident ticket citing M-26-14 §5(g) IoC Match.
18. Record: indicator value, source feed, indicator confidence, affected asset(s), first contact timestamp, containment action, and time-to-detect.
19. If the indicator is TLP:GREEN or TLP:WHITE and the match represents a new attacker behavior not previously observed in the agency environment: consider submitting a report back to CISA AIS to contribute to the shared indicator pool.

---

## Tuning Guidance

### Indicator Match Rule Interval

Indicator match rules default to a 1-hour execution interval in Elastic Security. For federal environments where CISA AIS publishes high-priority indicators and near-real-time detection is required by M-26-14, reduce the interval:

| Environment | Recommended Interval | Trade-off |
|---|---|---|
| Production SOC with 24/7 coverage | `15m` | Higher Elasticsearch query load; faster detection |
| Standard agency environment | `30m` | Balanced load and detection speed |
| Resource-constrained deployment | `1h` (default) | Acceptable for lower-criticality indicator types |

To change the interval, edit each rule (**Security > Rules > select rule > Edit rule settings > Schedule**) and set the execution interval and lookback window. Set lookback to interval + 5 minutes (e.g., for 15m interval, set `from: now-20m`).

### Indicator Expiry and Feed Hygiene

Stale indicators generate false positives. Configure indicator expiry in the threat intel integrations:

- CISA AIS TAXII integration: set `expiration_duration` to `90d` (indicators older than 90 days are removed from `logs-ti_*`).
- abuse.ch: feeds self-expire — indicators are removed from the feed when the provider marks them inactive. The Elastic integration honors this automatically.
- Manually-uploaded value lists: schedule a quarterly review to purge expired entries. Document the review date in the feed inventory.

### Indicator Confidence Filtering

To reduce noise from low-confidence community feed indicators, add a rule exception that excludes matches where `threat.indicator.confidence` is `Low` or `None`. This is particularly useful when running high-volume community feeds alongside high-fidelity government feeds:

1. Open the rule in Edit mode.
2. Navigate to **Add exceptions**.
3. Add condition: `threat.indicator.confidence IS ONE OF Low, None`.
4. Apply the exception.

High-confidence CISA AIS indicators will continue to generate alerts. Low-confidence community feed indicators will be silenced until confidence is raised by the feed provider.

### Excluding Known-Good Infrastructure

Federal agency networks frequently communicate with government-operated IP ranges that may appear in community threat feeds due to historical scanning activity or IP reuse. Add exceptions for:

| Scenario | Exception Filter |
|---|---|
| GSA/shared-services IP ranges | `destination.ip: <gsa_range_cidr>` |
| Agency-operated CDN or proxy egress IPs | `destination.ip: <agency_proxy_ip>` |
| Known government partner IPs that appear in community feeds | `destination.ip: <partner_ip> AND threat.indicator.provider: "<community_feed>"` |

Do not add blanket exceptions for CISA AIS indicators — if a CISA-published IP matches internal traffic, that warrants immediate investigation.

---

## Prerequisites Summary

### Required Integrations

| Integration | Version | Purpose |
|---|---|---|
| Elastic Defend | 8.10+ | Hash, URL (endpoint), and registry indicator matches |
| TAXII Threat Intelligence (for CISA AIS) | 8.10+ | Populates `logs-ti_*` with CISA AIS indicators |
| AbuseCH (optional but recommended) | 8.12+ | Populates `logs-ti_*` with abuse.ch feed indicators |
| O365 or Google Workspace | 8.10+ | Required for email indicator match rule |

### Elastic Security License

Indicator Match rules require an **Elastic Security Enterprise** license (or equivalent Elastic Cloud subscription tier that includes Security). The rules will not execute on Basic or Gold license deployments.

Verify license:

```
GET /_license
```

Confirm `type` is `enterprise` or `trial`.

### Index Mapping Verification

The indicator match rules join on specific ECS fields. Verify the `threat.indicator.ip` field is mapped as `ip` type (not `keyword`) in the threat intel index:

```json
GET logs-ti_*/_mapping/field/threat.indicator.ip
```

Expected: `"type": "ip"`. If mapped as `keyword`, the indicator match join will not function correctly for CIDR-range matching. This is handled automatically by the Elastic threat intel integrations but may require manual correction if indicators were ingested via a custom pipeline.
