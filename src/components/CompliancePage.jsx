import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ASSET_TYPE_META, ASSET_FILE_MAP } from '../data/assets.js'
import { OverviewContent } from './Overview.jsx'
import AssetViewer from './AssetViewer.jsx'

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS = [
  { label: 'Requirements' },
  { label: 'Achieve Compliance in Days' },
  { label: 'Compliance Coverage Matrix' },
  { label: "What's Not Covered?" },
]

const CheckIcon = ({ size = 16, className = '' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 16 16" className={className} aria-hidden="true" fill="currentColor">
    <path fillRule="evenodd" d="M15.354 4.354 6.5 13.207 1.646 8.354l.708-.708L6.5 11.793l8.146-8.147.708.708Z" clipRule="evenodd"/>
  </svg>
)

const InspectIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
    <path d="M2 2h11v4c.379.284.716.62 1 1V2a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h5a5.029 5.029 0 0 1-1-1H2V2Z"/>
    <path d="M3.5 4a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1Zm0 2a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1ZM4 7.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0ZM3.5 10a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1Zm.5 1.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0ZM5.5 4a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1ZM6 5.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0ZM7.5 4a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1Zm2.5-.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Zm1.5.5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1Z"/>
    <path fillRule="evenodd" d="M6 10a4 4 0 1 1 7.16 2.453l2.194 2.193-.707.707-2.194-2.193A4 4 0 0 1 6 10Zm4-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" clipRule="evenodd"/>
  </svg>
)

// EUI Borealis vis color pairs — [active, light] per tab
const TAB_COLORS = [
  { active: '#7B5EA7', light: '#C9B9E3' },
  { active: '#16C5C0', light: '#A6EDEA' },
  { active: '#61A2FF', light: '#BFDBFF' },
  { active: '#F6726A', light: '#FFC9C2' },
]

// Colors for the 4 compliance-in-days phase columns (decoupled from tab count)
const PHASE_COLORS = [
  { active: '#16C5C0', light: '#A6EDEA' },
  { active: '#61A2FF', light: '#BFDBFF' },
  { active: '#EE72A6', light: '#FFC7DB' },
  { active: '#F6726A', light: '#FFC9C2' },
]

const PHASE_LABELS = [
  { label: 'Day 1',      title: 'Deploy Elastic'        },
  { label: 'Days 2–7',   title: 'Deploy Fleet & Agent'  },
  { label: 'Days 7–30',  title: 'Expand Coverage'       },
  { label: 'Ongoing',    title: 'Maintain & Extend'     },
]

const LEVEL_COLORS = {
  1: { text: 'text-accent-teal',   bg: 'bg-accent-teal/10 border-accent-teal/30'   },
  2: { text: 'text-accent-blue',   bg: 'bg-accent-blue/10 border-accent-blue/30'   },
  3: { text: 'text-accent-purple', bg: 'bg-accent-purple/10 border-accent-purple/30' },
  4: { text: 'text-accent-coral',  bg: 'bg-accent-coral/10 border-accent-coral/30' },
}

// ─── ACID phase content (Tab 1) ───────────────────────────────────────────────

const ACID_PHASES = [
  {
    label: 'Day 1',
    title: 'Deploy Elastic',
    desc: 'Deploy Elasticsearch, Kibana, and Fleet Server, then load the M-26-14 Compliance Pack. ILM retention policies are configured from day one, satisfying data retention requirements across all maturity levels.',
    items: [
      'Configure ILM policies for hot/cold/frozen tiering and snapshot-based retrievable retention — data retention compliance achieved ✓',
      'Install compliance pack assets: index templates, ingest pipelines, and data stream policies',
      'Enable Kibana with the SIEM app and Fleet Server — platform ready to begin collecting',
    ],
  },
  {
    label: 'Days 2–7',
    title: 'Deploy Fleet & Agent',
    desc: 'Enroll endpoints and systems with Elastic Agent via Fleet, covering all Appendix B log categories. Adding the Osquery integration immediately begins building the asset inventory required by the Agency Logging Plan.',
    items: [
      'Enroll endpoints with Elastic Agent via Fleet — Appendix B log collection begins immediately across all 11 required categories',
      'Add the Osquery integration from the compliance pack to begin hardware, software, and network asset inventory (HWAM/SWAM)',
      'Install and enable Appendix B detection rules, ML anomaly jobs, and compliance attestation dashboards',
    ],
  },
  {
    label: 'Days 7–30',
    title: 'Expand Coverage',
    desc: 'With collection and detection foundations in place, focus shifts to broadening coverage and validating compliance posture. Attestation dashboards surface remaining gaps against each maturity level.',
    items: [
      'Add Threat Intelligence integrations (STIX/TAXII, CISA KEV) for real-time IoC matching across all log streams',
      'Monitor ML anomaly detection jobs and tune detection rules against your environment\'s baseline',
      'Expand collection and detection coverage across all Appendix B categories; use the Asset Coverage dashboard to identify enrollment gaps',
      'Review maturity attestation dashboards to validate current compliance level and track progress toward the next',
    ],
  },
  {
    label: 'Ongoing',
    title: 'Maintain & Extend',
    desc: 'Sustain and continuously improve coverage as the environment evolves. Level 4 requirements — federated architecture, advanced encryption, and CISA/FBI log sharing — are built out and exercised during this phase.',
    items: [
      'Monitor and maintain inventory, collection, and detection coverage as systems and data sources change',
      'Build out cross-cluster search and federated architecture components to meet Level 4 requirements',
      'Establish and test external log-sharing connections required for CISA and FBI investigation requests',
      'Conduct annual log-sharing drills and keep the Agency Logging Plan current with the latest environment changes',
    ],
  },
]

// ─── Coverage matrix data (Tab 2) ─────────────────────────────────────────────
// Ordered by ACID phase: phase 1 = Day 1, phase 2 = Days 2-7, phase 3 = Days 7-30, phase 4 = Ongoing

const MATRIX_ROWS = [

  // ── Phase 1: Day 1 ─────────────────────────────────────────────────────────
  {
    phase: 1,
    firstLevel: 1,
    req: '6-month retrievable log retention',
    reqDesc: 'All collected logs must be retrievable — not necessarily immediately searchable — for a minimum of 6 months from collection, satisfying the THIRF floor at Level 1.',
    cap: 'ILM policies + S3 snapshots',
    capDesc: 'Pre-configured ILM policies roll data from hot to frozen, then snapshot to S3-compatible object storage with a configurable retention floor.',
    modalHow: 'Elastic ILM (Index Lifecycle Management) is configured at platform deployment, automatically rolling log data from hot through frozen tier, then snapshotting to S3-compatible object storage. The Level 1 ILM variant maintains snapshots for 180 days before expiry. Frozen-tier data is recoverable on demand via Elasticsearch Searchable Snapshots, satisfying the M-26-14 definition of "retrievable" — accessible after one or more intermediary steps. Because ILM is configured on Day 1, this requirement is addressed before any data is collected.',
    modalAssetIds: ['ilm-logs-l3-hot-frozen', 'ilm-logs-l3-no-delete', 'dash-log-management', 'dash-retention-compliance'],
    modalCapabilities: [
      { name: 'Index Lifecycle Management (ILM)', type: 'platform', desc: 'Automated hot → cold → frozen tier transitions and snapshot scheduling.', href: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/index-lifecycle-management.html' },
      { name: 'Elasticsearch Snapshot & Restore', type: 'platform', desc: 'Point-in-time backups to S3-compatible storage. Frozen-tier snapshots satisfy THIRF retrievable retention.', href: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/snapshot-restore.html' },
      { name: 'Searchable Snapshots', type: 'platform', desc: 'Mount snapshot data as read-only indices for ad-hoc search without full restoration — satisfies on-demand THIRF retrieval.', href: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/searchable-snapshots.html' },
    ],
  },
  {
    phase: 1,
    firstLevel: 2,
    req: '12-month retrievable log retention',
    reqDesc: 'The retrievable window expands to 12 months at Level 2, supporting longer-horizon incident investigations and forensic reviews.',
    cap: 'ILM policies + S3 snapshots (L2+ variant)',
    capDesc: 'L2/L3/L4 ILM variants extend the frozen/snapshot tier to 12 months before deletion. No-delete variants available for NARA-scoped agencies.',
    modalHow: 'The same ILM + snapshot architecture used for Level 1 satisfies Levels 2 through 4 by adjusting the snapshot retention window. The L2/L3/L4 policy variants extend frozen-tier snapshots to 365 days before deletion. For agencies with NARA obligations, no-delete policy variants disable automatic expiry entirely, maintaining an indefinite retrievable window without changing the underlying ILM mechanism. Configured on Day 1 — no follow-on action needed when the agency achieves Level 2.',
    modalAssetIds: ['ilm-logs-l3-no-delete', 'ilm-logs-l4-hot-frozen', 'ilm-logs-l4-no-delete'],
    modalCapabilities: [
      { name: 'ILM Snapshot Retention Policies', type: 'platform', desc: 'Configurable retention schedules on snapshot repositories — L2+ variants extend to 12 months, no-delete variants for NARA-scoped agencies.', href: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/snapshot-lifecycle-management.html' },
    ],
  },
  {
    phase: 1,
    firstLevel: 3,
    req: '3-month searchable retention (CEM)',
    reqDesc: 'Level 3 introduces the first CEM requirement: 3 months of immediately searchable log data, queryable without retrieval delays, across all Appendix B categories.',
    cap: 'Hot/frozen ILM policy — L3 variant',
    capDesc: 'The L3 ILM policy keeps data on hot nodes for 90+ days before tiering, maintaining a 3-month search-available window.',
    modalHow: 'The Level 3 ILM policy variant delays the hot → frozen tier transition until day 90+, keeping 3 months of data on high-performance hot nodes where it is immediately queryable with no restore latency. This satisfies the M-26-14 "searchable" definition and enables real-time CEM alerting and dashboard queries across the full 90-day window. The policy is configured on Day 1 and automatically satisfies the searchable retention requirement once the agency reaches Level 3 attestation — no reconfiguration needed.',
    modalAssetIds: ['ilm-logs-l3-hot-frozen', 'ilm-logs-l3-no-delete'],
    modalCapabilities: [
      { name: 'Elasticsearch Hot Tier', type: 'platform', desc: 'High-performance, immediately queryable storage — no restore step. Used for the CEM searchable retention window.', href: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/data-tiers.html' },
    ],
  },
  {
    phase: 1,
    firstLevel: 4,
    req: '6-month searchable retention (CEM)',
    reqDesc: 'Level 4 doubles the searchable window to 6 months, enabling cross-event correlation and threat hunting across longer timeframes.',
    cap: 'Hot/frozen ILM policy — L4 variant',
    capDesc: 'The L4 ILM policy extends the hot retention to 180+ days. The extended frozen-tier window satisfies the full L4 THIRF requirement simultaneously.',
    modalHow: 'The Level 4 ILM variant extends the hot tier retention floor to 180 days, doubling the searchable window from Level 3. This enables 6-month behavioral correlation, cross-event investigation, and threat hunting — all without snapshot restore latency. The same policy simultaneously satisfies the L4 THIRF requirement by keeping the frozen snapshot window at 12+ months, ensuring both CEM and THIRF obligations are met by a single ILM policy configuration already deployed on Day 1.',
    modalAssetIds: ['ilm-logs-l4-hot-frozen', 'ilm-logs-l4-no-delete'],
    modalCapabilities: [
      { name: 'ILM — L4 Hot Tier Floor', type: 'platform', desc: 'Hot retention extended to 180 days — satisfies both L4 CEM searchable and THIRF retrievable requirements from a single policy.', href: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/index-lifecycle-management.html' },
    ],
  },
  {
    phase: 1,
    firstLevel: 1,
    req: 'Two-gate data retirement with snapshot audit trail',
    reqDesc: 'Before compliance log data can be permanently deleted, agencies must ensure a durable snapshot exists and obtain documented approvals — satisfying chain-of-custody requirements across all maturity levels.',
    cap: 'Kibana Workflows + SLM policy + Kibana Cases + Audit Index',
    capDesc: 'Automated two-gate workflow: daily scan identifies aged frozen indices → Gate 1 Kibana Case for human approval → ILM wait_for_snapshot ensures backup exists → Gate 2 Case for final deletion authorization. Manual Kibana Workflows execute each gate transition with full audit trail.',
    modalHow: 'The M-26-14 compliance pack deploys a complete two-gate data retirement system built on Kibana Workflows, Kibana Cases, SLM, and an append-only audit index (m_26_14-retirement-requests). Detection alerts (Kibana Rules) fire when frozen indices exceed the configurable age threshold and open a Gate 1 Kibana Case for human review — no data is touched until a human approves. Once approved, the Gate 1 Kibana Workflow switches the index to a deletion-enabled ILM policy. ILM wait_for_snapshot then acts as a technical safeguard: deletion is blocked until the SLM policy confirms a durable snapshot exists in S3. Gate 2 requires a second explicit human approval before the Gate 2 Execution Workflow advances ILM past the snapshot gate to execute deletion. Every state transition — detect, approve, snapshot, delete — is recorded in the append-only m_26_14-retirement-requests audit index. The Legal Hold Workflow enables selective data preservation to a permanent no-delete retained index before retirement begins.',
    modalAssetIds: ['slm-compliance-snapshots', 'template-retirement-requests', 'watcher-gate1-detect', 'watcher-gate1-approve', 'watcher-gate2-execute', 'watcher-legal-hold-copy', 'rule-dm-gate1-pending', 'rule-dm-gate2-pending', 'workflow-gate1-detect', 'workflow-gate1-approval', 'workflow-gate2-execute', 'workflow-legal-hold'],
    modalCapabilities: [
      { name: 'Kibana Workflows', type: 'platform', desc: 'YAML-defined automation engine executing each gate transition: Gate 1 approval switches ILM policy; Gate 2 execution advances ILM past the snapshot gate; Legal Hold workflow reindexes data to a no-delete retained index. Each workflow records a full audit trail in the retirement audit index and opens a Kibana Case.', href: 'https://www.elastic.co/guide/en/kibana/current/workflows.html' },
      { name: 'Elasticsearch Snapshot Lifecycle Management (SLM)', type: 'platform', desc: 'Automated daily snapshots of all m_26_14-* indices to S3. Used as the technical gate before deletion — ILM wait_for_snapshot blocks deletion until SLM confirms a durable backup exists.', href: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/snapshot-lifecycle-management.html' },
      { name: 'ILM wait_for_snapshot', type: 'platform', desc: 'Technical enforcement gate in the ILM delete phase — deletion is blocked until the named SLM policy confirms a successful snapshot. Cannot be bypassed without an explicit human ILM move action.', href: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/ilm-wait-for-snapshot.html' },
      { name: 'Kibana Cases', type: 'platform', desc: 'Human-in-the-loop approval interface for each retirement gate. Each gate creates a traceable case with full context (index name, age, policy, approver) for the authorizing official.', href: 'https://www.elastic.co/guide/en/kibana/current/cases-overview.html' },
      { name: 'Elasticsearch Watchers', type: 'platform', desc: 'Event-driven automation engine running gate detection and audit record creation. Works alongside Kibana Workflows — Watchers detect conditions, Workflows execute human-approved transitions.', href: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/xpack-alerting.html' },
    ],
  },

  {
    phase: 1,
    firstLevel: 2,
    req: 'Data classification intake for new indices and data streams',
    reqDesc: 'M-26-14 Data pillar requires agencies to categorize data and limit access based on that categorization. New indices and data streams must be classified for sensitivity before retention policies and access controls are applied.',
    cap: 'Kibana Workflow — Data Classification Intake',
    capDesc: 'Manual Kibana Workflow opens a Kibana Case for data steward review when a new unclassified data stream is discovered, records classification_pending in audit index, and notifies the responsible team.',
    modalHow: 'The M-26-14 compliance pack includes a Data Classification Intake Kibana Workflow that initiates a formal classification review whenever a new index or data stream is discovered without an assigned sensitivity label. The workflow opens a Kibana Case assigned to the data steward with M-26-14 sensitivity tier guidance (public → restricted), instructions for inspecting the index and applying the appropriate ILM policy, and records a classification_pending state in the m_26_14-data-classification-requests audit index. The M-26-14 POA&M Drafting Agent can query this index to surface unclassified data streams as open compliance findings. Classification must be completed before default retention policies or broad access roles are applied to the new data stream.',
    modalAssetIds: ['workflow-data-classification', 'agent-poam-drafting', 'agent-tool-compliance-posture'],
    modalCapabilities: [
      { name: 'Kibana Workflows', type: 'platform', desc: 'YAML-defined automation that opens a classification review Case, records audit state, and notifies the data steward team. No code required — operators update consts before running.', href: 'https://www.elastic.co/guide/en/kibana/current/workflows.html' },
      { name: 'Kibana Cases', type: 'platform', desc: 'Traceable review interface for data steward classification decisions. Each case includes M-26-14 sensitivity tier matrix and step-by-step classification instructions.', href: 'https://www.elastic.co/guide/en/kibana/current/cases-overview.html' },
    ],
  },

  // ── Phase 2: Days 2–7 ──────────────────────────────────────────────────────
  {
    phase: 2,
    firstLevel: 1,
    req: 'Appendix B — complete event collection',
    reqDesc: 'All 11 required event categories must be actively collected from every applicable system in scope, with no coverage gaps.',
    cap: 'Fleet + Agent + Beats + Logstash',
    capDesc: 'Collection for A–F, J, K: 20+ Agent integrations and Beats modules. Categories G–I require Threat Intel, Detection Engine, and ML assets respectively.',
    subsLabel: 'Appendix B Log Categories',
    subs: [
      { id: 'A', name: 'Category A — Identity Events',         desc: 'Auth successes/failures, MFA, SSO federation, account lifecycle (create/disable/delete)',          cap: 'Windows Event Log · Okta · Microsoft Entra ID · Elastic Defend',      capDesc: 'Windows Security event IDs (4624/4625/4688), Okta and Azure AD integrations, Elastic Defend process telemetry.' },
      { id: 'B', name: 'Category B — Network Sessions',        desc: 'IP flow records, VPN session logs, proxy logs, DNS query/response',                                 cap: 'Zeek · Packetbeat · Filebeat Cisco/PANW',                              capDesc: 'Full network session metadata via Zeek, wire-level protocol analysis via Packetbeat, Cisco ASA/FTD and Palo Alto NGFW logs via Filebeat modules.' },
      { id: 'C', name: 'Category C — Object/Resource Access',  desc: 'File access, cloud storage objects, database queries, API calls to sensitive resources',            cap: 'Auditbeat · Linux auditd · AWS/Azure/GCP · Logstash JDBC',            capDesc: 'Linux kernel file and syscall events via Auditbeat, cloud resource access via AWS CloudTrail/Azure Monitor/GCP Audit, database audit via Logstash JDBC input.' },
      { id: 'D', name: 'Category D — Privilege Changes',       desc: 'sudo/su, role assignment changes, group membership changes, permission escalation',                 cap: 'Windows Event Log · Auditbeat · Elastic Defend',                      capDesc: 'Windows privilege escalation events (4672/4673/4728), Linux sudoers and PAM events via Auditbeat, Elastic Defend process and token telemetry.' },
      { id: 'E', name: 'Category E — Infrastructure Changes',  desc: 'Cloud config changes, firewall rule edits, routing changes, new device enrollment',                cap: 'AWS CloudTrail · Azure Activity Log · Osquery Manager',              capDesc: 'Cloud management-plane changes via AWS/Azure/GCP integrations; Osquery Manager tracks device enrollment state and network interface changes.' },
      { id: 'F', name: 'Category F — Security Tool Alerts',    desc: 'EDR/EPP detections, IDS/IPS alerts, DLP violations, vulnerability scanner findings',               cap: 'Elastic Defend · CrowdStrike · SentinelOne · Suricata',               capDesc: 'Native EDR via Elastic Defend; third-party EDR integrations for CrowdStrike Falcon, SentinelOne, and Microsoft Defender; Suricata IDS/IPS network alerts.' },
      { id: 'G', name: 'Category G — IoC Events',              desc: 'Matches against known-bad IPs, domains, file hashes, and URLs from threat intelligence feeds',     cap: 'Threat Intel (STIX/TAXII/MISP) + AppB-G detection rules',            capDesc: 'MISP/STIX/TAXII Threat Intel integration populates the indicator index; four AppB-G Detection Engine rules match live event streams against CISA KEV and threat feeds.' },
      { id: 'H', name: 'Category H — Automated Alerts',        desc: 'SIEM rule-based detections, behavioral anomaly alerts, compliance degradation alerts',             cap: 'Detection Engine alert index · Winlogbeat',                           capDesc: 'Detection Engine rule execution writes to .alerts-security.*. Category H events are generated by Elastic — not collected from external sources.' },
      { id: 'I', name: 'Category I — Anomalous Activity',      desc: 'ML-detected behavioral outliers, deviations from user/host baselines',                            cap: 'Elastic ML jobs (6 jobs + datafeeds)',                                capDesc: 'Category I events are produced by Elastic ML anomaly detection, not collected from external sources. Requires L3 ML jobs running against behavioral baselines.' },
      { id: 'J', name: 'Category J — Error/Crash Events',      desc: 'Application error logs, service crash reports, process termination events',                        cap: 'Filebeat System · Windows Event Log · Elastic APM',                  capDesc: 'Linux auth.log/syslog via Filebeat System module, Windows Application and System event channels, Elastic APM for service crash and error telemetry.' },
      { id: 'K', name: 'Category K — DNS Activity',            desc: 'Full DNS query/response logs, DNS-over-HTTPS, DNS tunneling indicators',                          cap: 'Packetbeat · Zeek · Elastic Defend · network syslog',                capDesc: 'DNS query/response via Packetbeat and Zeek; DNS-over-HTTPS and DNS-over-TLS detection via Elastic Defend; legacy DNS appliance logs via Logstash syslog input.' },
    ],
    modalHow: 'Elastic Agent, managed through Fleet Server, provides a single enrollment point covering all 11 Appendix B log source categories. A single agent on an endpoint simultaneously activates Categories A, D, F, J, and K via Elastic Defend. Zeek handles Categories B and K for network infrastructure. Cloud integrations (AWS, Azure, GCP) cover Categories C and E. Categories G, H, and I are not collected from external sources — they are produced by Elastic\'s Threat Intel rules, Detection Engine, and ML jobs respectively, which are installed as part of the compliance pack. Logstash inputs bridge legacy OT/ICS sources and mainframes that cannot run native agents.',
    modalAssetIds: ['fleet-osquery-pack', 'template-logs-data-streams'],
    modalCapabilities: [
      { name: 'Elastic Agent + Fleet Server', type: 'platform', desc: 'Central enrollment and policy management for all Appendix B log sources. Single agent binary covers Categories A, D, F, J, K via Elastic Defend.', href: 'https://www.elastic.co/guide/en/fleet/current/fleet-overview.html' },
      { name: 'Elastic Integrations (20+)', type: 'platform', desc: 'Pre-built integrations for Okta, Azure AD, AWS, Zeek, Suricata, CrowdStrike, SentinelOne, and more — all mapped to Appendix B categories.', href: 'https://www.elastic.co/integrations' },
      { name: 'Logstash (syslog / Beats / Kafka / JDBC / S3)', type: 'platform', desc: 'Bridges legacy sources — OT/ICS systems, mainframes, WEF-forwarded events — to Elasticsearch for full Appendix B coverage.', href: 'https://www.elastic.co/guide/en/logstash/current/index.html' },
    ],
  },
  {
    phase: 2,
    firstLevel: 2,
    req: 'Asset inventory in Agency Logging Plan',
    reqDesc: 'A complete, documented inventory of all log-producing systems must be maintained and reflected in the Agency Logging Plan submitted to CISA. Element 1 also requires detecting and acting on assets that appear on the network but are not in the inventory.',
    cap: 'Fleet + osquery + unknown-device triage loop',
    capDesc: 'Fleet enrollment auto-builds the inventory; osquery captures hardware/software/network state for HWAM/SWAM; the triage loop classifies every unmanaged device and routes it to a gated next step.',
    modalHow: 'Every Elastic Agent enrollment writes an inventory record to the Fleet-managed asset index. The compliance pack\'s osquery Fleet pack then continuously queries each enrolled endpoint for hardware identity (HWAM), installed software (SWAM), network interfaces, and local user accounts, all resolved into one canonical asset per device. This populates the Asset Coverage dashboard — the evidence export format for the Agency Logging Plan submission to CISA. But inventory is only half of Element 1: the memo also requires detecting and acting on devices that are NOT in inventory. The compliance pack closes that loop. A device surfaces three ways — the first-seen rogue-device detection rule, the observed-vs-inventory quadrant (on the wire but not inventoried), and network-discovery rows. The triage classifier then routes each unmanaged device into exactly one disposition from real signals (a computed Security-alert correlation for rogue, asset status for decommissioned, identity strength and vendor for new-vs-shadow), writes it to the triage ledger, and opens a disposition-specific Kibana Case with the recommended next step pre-filled. Classification and routing are automatic; every enforcement step — isolate, enroll, allow-list, retire — is human-gated.',
    subsLabel: 'Unknown-Device Dispositions (detect → classify → route → gated action)',
    subs: [
      { id: '1', name: 'Rogue',              desc: 'Unmanaged device with a correlated high-severity Security alert. Computed from real detections, not a seeded flag.', cap: 'escalate to IR (gated: isolate)' },
      { id: '2', name: 'Decommissioned',     desc: 'Marked retired/inactive or silent-then-stale (>45d) yet still on the network.',                                   cap: 'confirm offline → suppress (reversible)' },
      { id: '3', name: 'New-but-uninventoried', desc: 'Real device with strong identity (serial + enterprise vendor), no alerts — simply not in HWAM yet.',             cap: 'enroll (gated: deploy agent)' },
      { id: '4', name: 'Shadow-IT',          desc: 'Unmanaged consumer / BYOD device, no alerts. A policy decision, not a technical one.',                            cap: 'exception (gated: allow-list/removal)' },
      { id: '5', name: 'Needs-review',       desc: 'Signals ambiguous or conflicting — identity must be established before routing.',                                  cap: 'identify first' },
    ],
    modalAssetIds: ['fleet-osquery-pack', 'dash-asset-coverage', 'template-osquery-hardware', 'template-osquery-network', 'template-osquery-software', 'pipeline-osquery-normalize', 'ilm-asset-inventory'],
    modalCapabilities: [
      { name: 'Fleet Server Enrollment', type: 'platform', desc: 'Every agent enrollment writes a host inventory record including identity, OS, and network state — auto-builds the asset inventory.', href: 'https://www.elastic.co/guide/en/fleet/current/install-fleet-managed-elastic-agent.html' },
      { name: 'Osquery Manager Integration', type: 'platform', desc: 'Scheduled SQL-like queries against endpoint hardware, software, user account, and network state — populates HWAM/SWAM inventory.', href: 'https://docs.elastic.co/integrations/osquery_manager' },
      { name: 'Unknown-Device Triage Playbook', type: 'doc', desc: 'Decision tree + the four gated next-steps (enroll / exception / escalate-IR / retire) and the unknown→known promotion path. Classification by the m_26_14-asset-triage-classify pipeline; routing by the m_26_14-unknown-device-triage workflow.', href: '/docs/runbooks/unknown-device-triage-playbook.md' },
    ],
  },
  {
    phase: 2,
    firstLevel: 3,
    req: 'Automated threat detection — all Appendix B categories',
    reqDesc: 'Agencies must deploy and operate automated detection rules covering every required Appendix B event category — not just ingest, but active monitoring for adversarial behavior.',
    cap: 'Detection Rules A–K',
    capDesc: '11 Appendix B detection rule sets (A–K) containing 20+ individual rules, each mapped to a specific category and MITRE ATT&CK technique.',
    subsLabel: 'Detection Rules by Appendix B Category',
    subs: [
      { id: 'A', name: 'Identity Events (4 rules)',           desc: 'Credential stuffing (Windows/Okta), Azure auth failure chain, Linux SSH brute force',                         cap: 'rule-appendixb-a' },
      { id: 'B', name: 'C2 Beaconing (1 rule)',               desc: 'Periodic outbound connection pattern consistent with command-and-control beaconing',                           cap: 'rule-appendixb-b' },
      { id: 'C', name: 'Mass File Access (1 rule)',            desc: 'High-volume file access events consistent with ransomware staging or bulk exfiltration',                       cap: 'rule-appendixb-c' },
      { id: 'D', name: 'Privilege Escalation (1 rule)',        desc: 'Token manipulation and local privilege escalation sequences',                                                   cap: 'rule-appendixb-d' },
      { id: 'E', name: 'Infrastructure Changes (3 rules)',     desc: 'Rogue device detection + unexpected OT/ICS engineering workstation activity',                                  cap: 'rule-appendixb-e-ot' },
      { id: 'F', name: 'EDR Tamper (1 rule)',                  desc: 'Elastic Agent process termination or service disable — indicates defense evasion',                             cap: 'rule-appendixb-f' },
      { id: 'G', name: 'IoC Monitoring (4 rules)',             desc: 'STIX/TAXII and CISA KEV indicator matches against network, file, URL, and process events',                    cap: 'rule-appendixb-g' },
      { id: 'H', name: 'Off-Hours Execution (1 rule)',         desc: 'Privileged process execution during non-business hours on sensitive hosts',                                    cap: 'rule-appendixb-h' },
      { id: 'I', name: 'Exfiltration Volume (1 rule)',         desc: 'Anomalous outbound data volume spike above rolling 30-day baseline',                                          cap: 'rule-appendixb-i' },
      { id: 'J', name: 'APT Kill Chain (2 rules)',             desc: 'Multi-stage attack correlating recon, initial access, and lateral movement events',                           cap: 'rule-appendixb-j' },
      { id: 'K', name: 'Coverage Gap Meta-Rule (2 rules)',     desc: 'Fires when any Appendix B log category stops receiving events — compliance degradation early warning',        cap: 'rule-appendixb-k' },
    ],
    modalHow: 'The compliance pack installs 20+ pre-built Kibana Security detection rules organized into 11 category-specific rule sets (A–K). Each rule set maps to a specific Appendix B event category and MITRE ATT&CK technique, enabling immediate CEM coverage from the moment rules are enabled. Rules are ECS-normalized and work across all Appendix B log sources out of the box. The Category K meta-rules provide automated compliance monitoring — alerting when any category stops receiving events, giving teams early warning before CEM attestation breaks.',
    modalAssetIds: ['dash-alert-coverage', 'dash-appendix-b-coverage', 'template-alert-coverage'],
    modalCapabilities: [
      { name: 'Kibana Security Detection Engine', type: 'platform', desc: 'Rule evaluation engine for KQL, EQL, ML, and threshold-based detection. Writes to .alerts-security.* index for dashboard consumption.', href: 'https://www.elastic.co/guide/en/security/current/detection-engine-overview.html' },
      { name: 'MITRE ATT&CK Framework Mapping', type: 'platform', desc: 'All compliance pack rules include MITRE ATT&CK tactic and technique metadata for threat framework alignment and audit evidence.', href: 'https://www.elastic.co/guide/en/security/current/prebuilt-rules.html' },
    ],
  },
  {
    phase: 2,
    firstLevel: 3,
    req: 'Anomaly and behavioral detection (ML)',
    reqDesc: 'Level 3 requires ML-driven behavioral analysis running against historical baselines — not just signature-based rules, but detection of novel patterns producing Appendix B Category I events.',
    cap: 'Elastic ML anomaly jobs (6)',
    capDesc: '6 ML anomaly detection jobs: DNS entropy, auth anomalies, rare processes, rare network destinations, and compliance metric drift.',
    modalHow: 'The compliance pack deploys 6 pre-configured ML anomaly detection jobs. Each job includes its datafeed configuration — ML jobs build behavioral baselines automatically from historical log data with no manual tuning required at deployment. Jobs cover: DNS entropy anomalies (Category K), authentication anomalies and rare IP access patterns (Category A), rare process execution on Linux and Windows hosts, rare destination countries (Category B), and compliance metric drift detection for maturity monitoring. ML-generated anomaly records constitute Appendix B Category I events.',
    modalAssetIds: ['ml-job-catb-dns', 'ml-job-element1', 'ml-job-element2', 'ml-job-element3', 'ml-job-element4', 'ml-job-element5'],
    modalCapabilities: [
      { name: 'Elastic Machine Learning — Anomaly Detection', type: 'platform', desc: 'Unsupervised behavioral baselines with automatic scoring — no labeled training data required. Covers auth, network, process, and compliance metrics.', href: 'https://www.elastic.co/guide/en/machine-learning/current/ml-ad-overview.html' },
    ],
  },
  {
    phase: 2,
    firstLevel: 3,
    req: 'IoC matching (STIX/TAXII/CISA KEV)',
    reqDesc: 'Live event streams must be continuously matched against known indicators of compromise from authoritative threat intelligence sources including the CISA Known Exploited Vulnerabilities catalog.',
    cap: 'Threat Intel rules (AppB-G, 4 rules)',
    capDesc: 'Four IoC matching rules covering STIX/TAXII indicator feeds and the CISA KEV catalog across network, file, URL, and process events.',
    modalHow: 'Elastic\'s Threat Intelligence integration ingests STIX/TAXII feeds and the CISA KEV catalog into the Elasticsearch threat-indicator index. Four AppB-G detection rules then continuously match this indicator index against live event streams — network connections against IP/domain IoCs, file events against hash IoCs, URL events against malicious URL IoCs, and process events against known malware hashes. New indicators from STIX/TAXII or CISA KEV automatically apply to historical and future events without rule changes. This produces the Category G events required by Appendix B.',
    modalAssetIds: ['rule-appendixb-g'],
    modalCapabilities: [
      { name: 'Threat Intelligence Integration (MISP/STIX/TAXII)', type: 'platform', desc: 'Ingests STIX/TAXII indicator feeds and MISP events into the Elasticsearch threat-indicator index for real-time matching.', href: 'https://docs.elastic.co/integrations/ti_misp' },
      { name: 'CISA KEV Integration', type: 'platform', desc: 'Pulls the CISA Known Exploited Vulnerabilities catalog for continuous indicator matching against all log streams.', href: 'https://www.elastic.co/guide/en/security/current/threat-intelligence-integrations.html' },
    ],
  },
  {
    phase: 2,
    firstLevel: 3,
    req: 'CEM compliance attestation dashboards',
    reqDesc: 'Agencies need real-time, exportable evidence that detection rules are active and generating alerts across all 11 Appendix B categories — the primary AO attestation artifact.',
    cap: 'Kibana dashboards (5) + transforms',
    capDesc: '5 pre-built dashboards: Maturity Overview, Asset Coverage, Alert Coverage (Appendix B), Appendix B Log Coverage, and Compliance Attestation.',
    modalHow: 'The compliance pack installs five pre-built Kibana dashboards providing real-time visibility into all M-26-14 compliance dimensions. The Compliance Attestation dashboard is the primary ATO evidence artifact — it summarizes coverage percentages, retention windows, and detection status across all required Appendix B categories in an exportable format. Alert Coverage and Appendix B Log Coverage dashboards give granular per-category visibility for gap identification. All dashboards are export-ready via Kibana\'s built-in PDF/PNG reporting for inclusion in audit submissions and ATO packages.',
    modalAssetIds: ['dash-maturity-overview', 'dash-asset-coverage', 'dash-alert-coverage', 'dash-appendix-b-coverage', 'dash-compliance-attestation'],
    modalCapabilities: [
      { name: 'Kibana Reporting (PDF/PNG)', type: 'platform', desc: 'Export dashboards as formatted PDFs or PNGs for ATO evidence packages and audit submissions.', href: 'https://www.elastic.co/guide/en/kibana/current/reporting-getting-started.html' },
    ],
  },

  {
    phase: 2,
    firstLevel: 2,
    req: 'AI-assisted threat investigation, POA&M drafting, and after-action reporting',
    reqDesc: 'M-26-14 requires documented incident response, ongoing POA&M management, and auditable compliance reporting. These manual documentation burdens are the primary bottleneck for agency compliance teams.',
    cap: 'Elastic Agent Builder — 3 AI compliance agents',
    capDesc: 'Three pre-configured AI agents automate the most time-intensive compliance documentation tasks: threat investigation summaries, POA&M entry drafting from live findings, and after-action report generation from closed cases.',
    modalHow: 'The M-26-14 compliance pack ships three Elastic Agent Builder agents, each pre-configured with M-26-14 context, the appropriate built-in Elastic tools, and custom ES|QL tools scoped to the compliance indices. The Threat Investigation Agent autonomously investigates security alerts — querying entity risk scores, asset inventory, related logs, and attack discoveries — and produces a structured investigation summary with M-26-14 pillar/element impact mapping, ready to attach to the Kibana Case. The POA&M Drafting Agent queries open cases, unclassified data streams, retirement audit gaps, and recurring unresolved alerts, then drafts FISMA-compliant POA&M entries with proper control references, risk ratings, milestones, and completion dates. The After-Action Report Agent reconstructs incident timelines from closed cases and log data, calculates detection gaps, maps affected assets to M-26-14 elements, and drafts a formal AAR document — reducing a 2–4 hour manual task to under 2 minutes. All three agents use custom ES|QL tools scoped to m_26_14-* indices for data-grounded, verifiable output. Agents are deployed via the included shell script using the Agent Builder REST API.',
    modalAssetIds: ['agent-threat-investigation', 'agent-poam-drafting', 'agent-aar', 'agent-tool-asset-inventory', 'agent-tool-retirement-audit', 'agent-tool-compliance-posture'],
    modalCapabilities: [
      { name: 'Elastic Agent Builder', type: 'platform', desc: 'Custom AI agent platform with built-in tools for Elasticsearch, Kibana Cases, security alerts, entity risk scores, and Elastic Workflows. Agents are deployed via REST API with configurable system instructions and tool scoping.', href: 'https://www.elastic.co/docs/explore-analyze/ai-features/elastic-agent-builder' },
      { name: 'Agent Builder Built-in Security Tools', type: 'platform', desc: 'security.alerts, security.entity_risk_scores, security.attack_discoveries, security.get_entity — built-in tools giving agents direct access to the Elastic Security data model.', href: 'https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/tools/builtin-tools-reference' },
      { name: 'Workflow Integration (platform.core.get_workflow_execution_status)', type: 'platform', desc: 'Native integration between Agent Builder agents and Kibana Workflows — agents can check workflow status and resume paused workflows at human-input steps, enabling the full human-in-the-loop IR pipeline natively.', href: 'https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/tools/builtin-tools-reference' },
    ],
  },

  // ── Phase 3: Days 7–30 ─────────────────────────────────────────────────────
  {
    phase: 3,
    firstLevel: 3,
    req: 'Sensitive data protections (PII masking)',
    reqDesc: 'Agencies must apply masking, redaction, or encryption to sensitive fields (PII, PHI, credentials) before logs reach searchable storage.',
    cap: 'Ingest pipeline processors',
    capDesc: 'The alert category enrichment pipeline includes configurable redact/hash processors. Agencies configure which fields are sensitive per their data classification policy.',
    modalHow: 'Elastic ingest pipelines are deployed with the compliance pack and include pre-configured redact, hash, and drop processors that apply at indexing time — before data reaches searchable storage. Agencies configure which fields are classified as sensitive per their data classification policy, which is typically defined before Level 3 attestation. Field-level security in Elasticsearch then enforces role-based access to any residual sensitive fields post-index. The sensitive data configuration can be updated without redeploying the pipeline, only changing which fields the existing processors target.',
    modalAssetIds: ['pipeline-alert-category', 'pipeline-osquery-normalize', 'pipeline-log-integrity-hash'],
    modalCapabilities: [
      { name: 'Elasticsearch Ingest Pipelines', type: 'platform', desc: 'Pipeline processors: redact (field removal), hash (SHA-256 masking), and drop (record suppression) applied before indexing.', href: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/ingest.html' },
      { name: 'Elasticsearch Field-Level Security', type: 'platform', desc: 'Role-based access control at the field level — restricts which users and roles can read sensitive fields post-index.', href: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/field-level-security.html' },
    ],
  },
  {
    phase: 3,
    firstLevel: 3,
    req: 'Alert correlation and risk scoring',
    reqDesc: 'Individual rule alerts must be aggregated into higher-confidence, risk-scored findings to reduce SOC false-positive burden before triage.',
    cap: 'Risk-score transforms (2)',
    capDesc: 'Two Elasticsearch Transforms — daily rollup and latest-value — compute per-category coverage scores and compliance posture metrics in real time.',
    modalHow: 'The compliance pack deploys two Elasticsearch Transforms that continuously aggregate individual detection rule alerts into risk-scored, per-entity summaries. The daily rollup transform computes coverage percentage scores per Appendix B category, tracking posture over time. The latest-value transform maintains current compliance state for the Maturity Overview dashboard. These transforms feed Kibana Security\'s entity risk scoring mechanism, enabling SOC analysts to triage high-confidence multi-alert entities before working low-signal individual alerts.',
    modalAssetIds: ['transform-alert-coverage-daily', 'transform-alert-coverage-latest'],
    modalCapabilities: [
      { name: 'Elasticsearch Transforms', type: 'platform', desc: 'Continuous aggregation pipelines summarizing alert index data into pivot tables and risk-scored entity summaries.', href: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/transforms.html' },
      { name: 'Kibana Security Entity Risk Scoring', type: 'platform', desc: 'Aggregates detection rule alerts into per-host and per-user risk scores for analyst triage prioritization.', href: 'https://www.elastic.co/guide/en/security/current/entity-risk-scoring.html' },
    ],
  },

  // ── Phase 4: Ongoing ───────────────────────────────────────────────────────
  {
    phase: 4,
    firstLevel: 4,
    req: 'Federated cross-agency log query',
    reqDesc: 'Level 4 requires a top-level SOC to query all distributed agency log stores from a single interface without replicating data to a central repository.',
    cap: 'Cross-Cluster Search (CCS)',
    capDesc: 'Elasticsearch CCS enables a central Kibana to query remote clusters across any network topology — no data movement, full Kibana query support.',
    modalHow: 'Elasticsearch Cross-Cluster Search (CCS) allows a central Kibana instance to issue federated queries across any number of remote Elasticsearch clusters — without copying data to a central repository. Each agency log store remains in-place under the agency\'s control; the central SOC cluster issues queries that fan out to remote clusters and aggregate results. CCS supports full Kibana query syntax including KQL, EQL, and ML scoring, enabling the federal-level SIEM console required at Level 4. No data movement occurs; only query results transit the network.',
    modalAssetIds: [],
    modalCapabilities: [
      { name: 'Cross-Cluster Search (CCS)', type: 'platform', desc: 'Federated query across multiple Elasticsearch clusters — no data movement, full Kibana and KQL/EQL support.', href: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/modules-cross-cluster-search.html' },
      { name: 'Cross-Cluster Replication (CCR)', type: 'platform', desc: 'Optional active replication for geo-redundancy or disaster recovery — not required for M-26-14 federated query compliance.', href: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/xpack-ccr.html' },
    ],
  },
  {
    phase: 4,
    firstLevel: 4,
    req: 'Encryption at rest (BYOK / agency KMS)',
    reqDesc: 'Level 4 requires cryptographic protection of stored log data using agency-controlled key material — not platform-managed encryption alone.',
    cap: 'Elastic BYOK / KMS integration',
    capDesc: 'Elastic supports BYOK via AWS KMS, Azure Key Vault, and GCP KMS integration, giving agencies full key custody over indexed log data.',
    modalHow: 'Elasticsearch integrates with external KMS providers — AWS KMS, Azure Key Vault, and GCP Cloud KMS — to support bring-your-own-key (BYOK) encryption at rest. Agency key material never leaves the agency KMS; Elasticsearch uses DEK (Data Encryption Key) wrapping via the KMS API. This satisfies the Level 4 requirement that stored log data be cryptographically protected under agency-controlled key custody, not solely reliant on cloud provider-managed encryption. TLS 1.2/1.3 is enforced for all inter-node and client-node communication within the cluster.',
    modalAssetIds: [],
    modalCapabilities: [
      { name: 'Elasticsearch BYOK Encryption at Rest', type: 'platform', desc: 'DEK wrapping via AWS KMS, Azure Key Vault, or GCP KMS — agency holds key custody, not the platform.', href: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/security-basic-setup-https.html' },
      { name: 'TLS Encryption in Transit', type: 'platform', desc: 'TLS 1.2/1.3 enforced for all inter-node and client communication within the Elastic cluster.', href: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/security-basic-setup.html' },
    ],
  },
  {
    phase: 4,
    firstLevel: 4,
    req: 'Tamper-evident NTP-synchronized timestamps',
    reqDesc: 'All log events must carry timestamps traceable to USNO or NIST time sources, producing a legally admissible forensic timeline resistant to backdating.',
    cap: 'Log integrity pipeline + NTP agent config',
    capDesc: 'Log integrity hash pipeline computes SHA-256 event fingerprints at ingest time. NTP configuration applied via Fleet agent policy to all enrolled hosts.',
    modalHow: 'The log integrity ingest pipeline computes a SHA-256 fingerprint of each event at indexing time, creating a tamper-evident record independently verifiable against the original source. Fleet agent policies enforce NTP synchronization to USNO/NIST time servers on all enrolled endpoints, ensuring event timestamps are authoritatively traceable. These two controls together satisfy the Level 4 forensic-quality audit trail requirement: immutable integrity fingerprints paired with verifiable, USNO-synchronized timestamp provenance on every log record.',
    modalAssetIds: ['pipeline-log-integrity-hash', 'template-log-integrity'],
    modalCapabilities: [
      { name: 'Elasticsearch Fingerprint Processor', type: 'platform', desc: 'Computes SHA-256 hash of event records at ingest time — stored alongside the event for independent tamper-evidence verification.', href: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/fingerprint-processor.html' },
      { name: 'Fleet NTP Policy Configuration', type: 'platform', desc: 'Enforces NTP sync to USNO/NIST time servers across all Fleet-enrolled endpoints via agent policy — USNO-traceable timestamps.', href: 'https://www.elastic.co/guide/en/fleet/current/agent-policy.html' },
    ],
  },
]

// ─── Agency obligations (Tab 3) ───────────────────────────────────────────────

const OBLIGATIONS = [
  {
    title: 'Agency Logging Plan',
    when: 'Within 90 days of LRA',
    desc: 'A documented plan identifying every log source in scope, current coverage gaps, and your inventory methodology. Writing and submitting the plan is your agency\'s obligation — no platform can do it for you.',
    assist: 'Fleet enrollment auto-builds and continuously maintains the asset inventory that populates your Logging Plan. The Asset Coverage dashboard exports a ready-to-attach evidence report with per-source coverage status, enrollment gaps, and Appendix B category mapping.',
  },
  {
    title: 'Data Classification Policy',
    when: 'Before L3 deployment',
    desc: 'You must define which fields are sensitive under your agency\'s data classification schema, which redaction rules apply to each data type, and how PII is handled before it reaches searchable storage.',
    assist: 'Elastic\'s ingest pipelines include configurable redact, hash, and drop processors ready to apply your policy the moment it\'s defined. Field-level security in Elasticsearch restricts access to sensitive fields per role, and the Sensitive Data Protection dashboard tracks masking coverage across all log sources.',
  },
  {
    title: 'Log Source Gap Remediation',
    when: 'Ongoing',
    desc: 'Elastic Agent covers every major Appendix B category, but you must ensure every applicable system in your environment is enrolled. Edge-case sources — legacy mainframes, custom OT systems, air-gapped enclaves — require agency-specific integration work.',
    assist: 'The Log Coverage Gap dashboard surfaces every Appendix B category that has stopped receiving events, the Asset Coverage report shows un-enrolled hosts, and the compliance pack includes Logstash pipeline templates for syslog, WEF, and OT/ICS bridging to minimize custom integration work.',
  },
  {
    title: 'CISA / FBI Log Sharing Procedure',
    when: 'Before L4 attestation',
    desc: 'Level 4 requires a documented, annually-tested procedure for producing logs on request to CISA and the FBI. This is a governance runbook — your ISSO, General Counsel, and mission owner own it, not your logging platform.',
    assist: 'The Cross-Cluster Search configuration and CISA/FBI Export dashboard provide the technical mechanism for on-demand log export. The compliance pack includes a runbook template with the required data elements, test-drill checklist, and evidence capture steps — ready to be adapted to your agency\'s governance process.',
  },
  {
    title: 'Authority to Operate (ATO)',
    when: 'Per FISMA cycle',
    desc: 'The ATO is your agency\'s formal authorization to operate the logging system under FISMA. Elastic provides the technical evidence — but the risk acceptance decision, system security plan, and authorization package belong to your Authorizing Official.',
    assist: 'The Compliance Attestation Dashboard, Alert Coverage report, Retention Compliance view, and Appendix B Log Coverage dashboard together form a pre-structured ATO evidence package. All are exportable as PDF-ready Kibana reports and map directly to the control families auditors check.',
  },
  {
    title: 'Incident Response Procedures',
    when: 'Ongoing',
    desc: 'Elastic detects and triages threats — but declaring an incident, activating your IR team, notifying stakeholders, and coordinating with CISA under CIRCIA requires organizational procedures and trained personnel that no logging platform can substitute for.',
    assist: 'Elastic Security\'s case management, alert escalation workflows, and timeline investigation view accelerate response once an incident is declared. Detection rules can be mapped to your IR playbooks so analysts have the relevant runbook steps surfaced alongside each alert.',
  },
  {
    title: 'Privacy Impact Assessment (PIA)',
    when: 'Before L3 deployment',
    desc: 'Systems that collect or process PII require a PIA under the Privacy Act and OMB A-130. Your agency\'s privacy officer must assess the logging system before L3 deployment — Elastic can\'t complete this assessment on your behalf.',
    assist: 'Elastic\'s data inventory and field-level security features provide the artifact inputs a PIA requires: a documented list of PII fields collected, the masking and access controls applied, and which roles can query sensitive data. The ingest pipeline configuration serves as the technical evidence annex.',
  },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CompliancePage() {
  const [activeTab, setActiveTab] = useState(0)
  const [hoveredTab, setHoveredTab] = useState(-1)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [activeTab])

  return (
    <main className="mx-auto max-w-[1800px] px-8 py-10 flex flex-col gap-10">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section>
        <span className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-5"
          style={{ borderStyle: 'solid', border: '1px solid #F86B2F55', color: '#F86B2F', backgroundColor: '#F86B2F18' }}>
          M-26-14 Compliance Accelerator
        </span>
        <div className="flex items-start justify-between gap-8 flex-wrap">
          <div className="flex flex-col gap-4 flex-1 min-w-0">
            <h1 className="text-4xl font-bold text-text-primary leading-tight">
              Deploy Elastic,&nbsp;<span className="text-accent-teal">Leapfrog to Level 3.</span>
            </h1>
            <p className="text-lg text-text-muted leading-relaxed">
              Most agencies treat M-26-14 compliance as a multi-year integration project. It doesn't have to be.
              Elastic's core platform — log collection, tiered storage, SIEM detection, and ML anomaly detection — maps
              directly to every technical requirement across Levels 1 through 3.{' '}
              <span className="text-text-primary font-semibold">Deploy once, activate the compliance pack,
              and your technical posture is compliance-ready from day one.</span>
            </p>
          </div>
          <div className="shrink-0 flex flex-col gap-2 items-end">
            <Link
              to="/maturity/small/1"
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-accent-teal/50 bg-accent-teal/10 text-accent-teal font-semibold hover:bg-accent-teal/20 transition-colors text-sm whitespace-nowrap"
              style={{ borderStyle: 'solid' }}
            >
              View reference architecture diagrams →
            </Link>
            <Link
              to="/asset-inventory"
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-accent-blue/50 bg-accent-blue/10 text-accent-blue font-semibold hover:bg-accent-blue/20 transition-colors text-sm whitespace-nowrap"
              style={{ borderStyle: 'solid' }}
            >
              Browse compliance pack assets →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Tab bar ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3">
        {TABS.map((tab, i) => {
          const isActive = activeTab === i
          const isHovered = hoveredTab === i
          const bgColor = isActive
            ? (isHovered ? 'rgb(var(--accent-blue) / 0.82)' : 'rgb(var(--accent-blue) / 1)')
            : (isHovered ? 'rgb(var(--accent-blue) / 0.10)' : 'transparent')
          return (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              onMouseEnter={() => setHoveredTab(i)}
              onMouseLeave={() => setHoveredTab(-1)}
              className="rounded-lg px-4 py-3 text-center font-medium text-lg transition-all text-text-primary"
              style={{ backgroundColor: bgColor, border: 'none', ...(isActive && { color: '#FFFFFF' }) }}
            >
              {i === 3 ? <span>What's <em>Not</em> Covered?</span> : tab.label}
            </button>
          )
        })}
      </div>

      {/* ── Tab content (shared scroll container) ────────────────────────── */}
      <div
        ref={scrollRef}
        className="overflow-y-auto rounded-lg"
        style={{ height: 'calc(100vh - 380px)', minHeight: 460 }}
      >
        {/* Tab 0 — Requirements */}
        <div className={activeTab === 0 ? 'p-6 pb-10' : 'hidden'}>
          <OverviewContent />
        </div>

        {/* Tab 1 — Compliance in Days */}
        <div className={activeTab === 1 ? 'p-1 pb-10' : 'hidden'}>
          <ComplianceInDaysTab />
        </div>

        {/* Tab 2 — Compliance Coverage Matrix */}
        <div className={activeTab === 2 ? 'h-full' : 'hidden'}>
          <CoverageAssetsTab />
        </div>

        {/* Tab 3 — Obligations */}
        <div className={activeTab === 3 ? 'p-1 pb-10' : 'hidden'}>
          <ObligationsTab />
        </div>
      </div>

    </main>
  )
}

// ─── Tab 1: Achieve Compliance in Days ────────────────────────────────────────

function ComplianceInDaysTab() {
  return (
    <div className="flex flex-col gap-6" style={{ minHeight: 'calc(100vh - 420px)' }}>

      <h2 className="font-semibold text-text-primary" style={{ fontSize: 26 }}>
        Achieve Compliance in Days
      </h2>

      {/* Conops blurb */}
      <p className="text-sm leading-relaxed text-text-muted" style={{ fontSize: 14 }}>
        Deploying the Elastic Search AI Platform and M-26-14 Compliance Pack delivers full data
        retention compliance on Day 1 — the technical foundation for all four maturity levels.
        Progression through Initial, Intermediate, Advanced, and Optimal then proceeds as data
        sources, detections, and operational coverage are layered in over days and weeks.
      </p>

      {/* 4 phase columns */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
        {ACID_PHASES.map((phase, pi) => {
          const tc = PHASE_COLORS[pi]
          return (
            <div key={phase.label} className="flex flex-col gap-3 h-full">
              {/* Phase header pill */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border-2"
                  style={{ borderColor: tc.active, color: tc.active, borderStyle: 'solid' }}>
                  {phase.label}
                </span>
                <div className="flex-1 h-px opacity-30" style={{ backgroundColor: tc.active }} />
              </div>

              {/* Card */}
              <div className="rounded-lg bg-ink-800 flex flex-col overflow-hidden flex-1"
                style={{ border: `1px solid ${tc.active}55` }}>
                <div className="h-0.5 w-full" style={{ backgroundColor: tc.active }} />
                <div className="p-7 flex flex-col gap-5 flex-1">
                  <p className="font-semibold text-text-primary" style={{ fontSize: 16 }}>
                    {phase.title}
                  </p>
                  <p className="text-text-muted leading-relaxed" style={{ fontSize: 14 }}>
                    {phase.desc}
                  </p>
                  <ul className="space-y-3 flex-1">
                    {phase.items.map((item, i) => (
                      <li key={i} className="flex gap-2.5 text-text-primary leading-relaxed"
                        style={{ fontSize: 14 }}>
                        <span className="mt-1 text-text-muted shrink-0 select-none">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Tab 2: Compliance Coverage Matrix ─────────────────────────────────────────────

function CoverageAssetsTab() {
  const [selectedRow, setSelectedRow] = useState(null)

  return (
    <div className="rounded-lg border border-line bg-ink-800 overflow-hidden flex flex-col"
         style={{ height: 'calc(100vh - 380px)', minHeight: 440, borderStyle: 'solid' }}>

      {/* Panel header */}
      <div className="px-8 py-6 border-b border-line shrink-0">
        <h2 className="font-semibold text-text-primary" style={{ fontSize: 26 }}>Compliance Coverage Matrix</h2>
        <p className="text-text-muted mt-2 leading-relaxed" style={{ fontSize: 14 }}>
          M-26-14 requirements in the order achieved by the Elastic concept of operations. Click a row to view details about the requirement and the Elastic capability and assets available to achieve it.
        </p>
      </div>

      {/* Scrollable table area */}
      <div className="overflow-auto flex-1">
        <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '58%' }} />
            <col style={{ width: '42%' }} />
          </colgroup>
          <thead className="sticky top-0 z-10">
            <tr className="text-sm text-text-muted bg-ink-700 border-b border-line">
              <th className="py-3.5 pl-8 pr-14 text-left font-semibold">M-26-14 Requirement</th>
              <th className="py-3.5 pl-10 pr-8 text-left font-semibold">Elastic Capability / Assets</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4].map(phase => {
              const rows = MATRIX_ROWS.filter(r => r.phase === phase)
              const phaseInfo = PHASE_LABELS[phase - 1]
              const pc = PHASE_COLORS[phase - 1]
              return (
                <React.Fragment key={phase}>
                  {/* Phase group header */}
                  <tr>
                    <td colSpan={2} className="pt-3 pb-0 pl-5">
                      <div className="flex items-center gap-3 py-2">
                        <span className="text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border-2"
                          style={{ borderColor: pc.active, color: pc.active, borderStyle: 'solid' }}>
                          {phaseInfo.label}
                        </span>
                        <span className="text-base font-semibold text-text-primary">{phaseInfo.title}</span>
                        <div className="flex-1 h-px opacity-20" style={{ backgroundColor: pc.active }} />
                      </div>
                    </td>
                  </tr>

                  {/* Requirement rows */}
                  {rows.map((row, ri) => {
                    const stripe = ri % 2 !== 0
                    return (
                      <tr
                        key={row.req}
                        className={`border-b border-line/40 cursor-pointer transition-colors group
                          ${stripe ? 'bg-ink-700/55' : 'bg-transparent'}
                          hover:bg-accent-blue/[0.10]`}
                        onClick={() => setSelectedRow(row)}
                      >
                        {/* Requirement */}
                        <td className="py-5 pl-8 pr-14 align-top">
                          <div className="flex items-start gap-3">
                            <CheckIcon size={18} className="shrink-0 mt-1 text-accent-green" />
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-text-primary leading-snug dark:group-hover:text-white transition-colors" style={{ fontSize: 16 }}>
                                {row.req}
                              </p>
                              <p className="text-text-muted mt-1.5 leading-relaxed" style={{ fontSize: 14 }}>{row.reqDesc}</p>
                            </div>
                          </div>
                        </td>

                        {/* Elastic Capability */}
                        <td className="py-5 pl-10 pr-8 align-top">
                          <p className="font-semibold text-text-primary leading-snug" style={{ fontSize: 16 }}>{row.cap}</p>
                          <p className="text-text-muted mt-1.5 leading-relaxed" style={{ fontSize: 14 }}>{row.capDesc}</p>
                          <span className="mt-3 inline-flex items-center text-xs text-accent-blue opacity-0 group-hover:opacity-100 transition-opacity">
                            View details →
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-8 py-3 border-t border-line/50 shrink-0">
        <p className="text-xs text-text-muted italic">
          Requirements listed in ACID phase order. Click any row for capability breakdown and compliance pack assets.
        </p>
      </div>

      {/* Requirement detail modal */}
      {selectedRow && (
        <RequirementModal row={selectedRow} onClose={() => setSelectedRow(null)} />
      )}
    </div>
  )
}

// ─── Requirement detail modal ──────────────────────────────────────────────────

function RequirementModal({ row, onClose }) {
  const [viewerAssetId, setViewerAssetId] = useState(null)

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (viewerAssetId) setViewerAssetId(null)
        else onClose()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose, viewerAssetId])

  const packAssets = (row.modalAssetIds || []).map(id => ASSET_FILE_MAP[id]).filter(Boolean)

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-6"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />

      {/* Asset viewer — rendered inside this stacking context so it layers above the modal */}
      <AssetViewer assetId={viewerAssetId} onClose={() => setViewerAssetId(null)} />

      {/* Panel */}
      <div
        className="relative w-full max-w-4xl flex flex-col rounded-xl bg-ink-900 border border-line shadow-2xl overflow-hidden"
        style={{ maxHeight: '88vh', borderStyle: 'solid' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header — title + close only */}
        <div className="flex items-start gap-4 px-9 pt-8 pb-6 border-b border-line/60 shrink-0">
          <h2 className="flex-1 text-2xl font-bold text-text-primary leading-tight">{row.req}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-ink-700 text-text-muted hover:text-text-primary transition-colors shrink-0 mt-0.5"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2.293 2.293a1 1 0 0 1 1.414 0L8 6.586l4.293-4.293a1 1 0 1 1 1.414 1.414L9.414 8l4.293 4.293a1 1 0 0 1-1.414 1.414L8 9.414l-4.293 4.293a1 1 0 0 1-1.414-1.414L6.586 8 2.293 3.707a1 1 0 0 1 0-1.414Z"/>
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-9 py-8 space-y-7">

          {/* M-26-14 requirement */}
          <div>
            <p className="text-sm font-semibold text-text-primary mb-3">M-26-14 Requirement</p>
            <p className="text-base text-text-primary leading-relaxed">{row.reqDesc}</p>
          </div>

          {/* How Elastic addresses this */}
          <div>
            <p className="text-sm font-semibold text-text-primary mb-3">How Elastic Addresses This</p>
            <p className="text-sm text-text-primary leading-relaxed">{row.modalHow}</p>
          </div>

          {/* Sub-table (Appendix B categories or detection rules) */}
          {row.subs && row.subs.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-text-primary mb-3">{row.subsLabel ?? 'Sub-items'}</p>
              <div className="rounded-lg border border-line/50 overflow-hidden" style={{ borderStyle: 'solid' }}>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-ink-700/80 border-b border-line/40">
                      <th className="py-3 pl-5 pr-3 text-left text-xs font-semibold text-text-muted" style={{ width: '40px' }}>Cat</th>
                      <th className="py-3 pr-4 text-left text-xs font-semibold text-text-muted" style={{ width: '47%' }}>Name &amp; Description</th>
                      <th className="py-3 pr-5 text-left text-xs font-semibold text-text-muted" style={{ width: '47%' }}>Elastic Capability</th>
                    </tr>
                  </thead>
                  <tbody>
                    {row.subs.map((sub, si) => {
                      const assetRef = ASSET_FILE_MAP[sub.cap]
                      return (
                        <tr key={sub.id} className={`border-b border-line/20 last:border-0 ${si % 2 === 0 ? 'bg-ink-800/50' : ''}`}>
                          <td className="py-4 pl-5 pr-3 align-top">
                            <span className="text-[10px] font-bold text-accent-blue bg-accent-blue/10 border border-accent-blue/30 px-1.5 py-0.5 rounded"
                              style={{ borderStyle: 'solid' }}>{sub.id}</span>
                          </td>
                          <td className="py-4 pr-5 align-top">
                            <p className="text-sm font-semibold text-text-primary leading-snug">{sub.name}</p>
                            <p className="text-xs text-text-muted leading-relaxed mt-0.5">{sub.desc}</p>
                          </td>
                          <td className="py-4 pr-5 align-top">
                            {assetRef ? (
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-text-primary leading-snug">{assetRef.label}</p>
                                  <p className="text-xs text-text-muted leading-relaxed mt-0.5">{assetRef.desc}</p>
                                </div>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setViewerAssetId(assetRef.id) }}
                                  className="p-1.5 rounded hover:bg-ink-700 text-text-muted hover:text-accent-blue transition-colors shrink-0"
                                  title={`Inspect ${assetRef.label}`}
                                  aria-label={`Inspect ${assetRef.label}`}
                                >
                                  <InspectIcon />
                                </button>
                              </div>
                            ) : (
                              <>
                                <p className="text-xs font-semibold text-text-primary">{sub.cap}</p>
                                {sub.capDesc && <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{sub.capDesc}</p>}
                              </>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Core Platform Capabilities */}
          {row.modalCapabilities && row.modalCapabilities.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-text-primary mb-3">Core Platform Capabilities</p>
              <div className="rounded-lg border border-line/50 overflow-hidden" style={{ borderStyle: 'solid' }}>
                {row.modalCapabilities.map((cap, ci) => (
                  <div key={ci} className={`px-6 py-5 ${ci < row.modalCapabilities.length - 1 ? 'border-b border-line/30' : ''} ${ci % 2 === 0 ? 'bg-ink-800/40' : ''}`}>
                    <a href={cap.href} target="_blank" rel="noopener noreferrer"
                      className="text-sm font-semibold text-accent-blue hover:underline">
                      {cap.name} ↗
                    </a>
                    <p className="text-xs text-text-muted leading-relaxed mt-1">{cap.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Compliance Pack Assets */}
          {packAssets.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-text-primary mb-3">Compliance Pack Assets</p>
              <div className="rounded-lg border border-line/50 overflow-hidden" style={{ borderStyle: 'solid' }}>
                <table className="w-full border-collapse">
                  <colgroup>
                    <col style={{ width: '32%' }} />
                    <col style={{ width: '18%' }} />
                    <col />
                    <col style={{ width: '48px' }} />
                  </colgroup>
                  <thead>
                    <tr className="bg-ink-700/80 border-b border-line/40">
                      <th className="py-3 pl-6 pr-4 text-left text-xs font-semibold text-text-muted">Asset</th>
                      <th className="py-3 pr-4 text-left text-xs font-semibold text-text-muted">Type</th>
                      <th className="py-3 pr-4 text-left text-xs font-semibold text-text-muted">Description</th>
                      <th className="py-3 pr-4" />
                    </tr>
                  </thead>
                  <tbody>
                    {packAssets.map((asset, ai) => (
                      <tr key={asset.id} className={`border-b border-line/20 last:border-0 ${ai % 2 === 0 ? 'bg-ink-800/40' : ''}`}>
                        <td className="py-4 pl-6 pr-4 align-top">
                          <p className="text-sm font-semibold text-text-primary leading-snug">{asset.label}</p>
                        </td>
                        <td className="py-4 pr-4 align-top">
                          <AssetTypeBadge type={asset.type} />
                        </td>
                        <td className="py-4 pr-4 align-top">
                          <p className="text-xs text-text-muted leading-relaxed">{asset.desc}</p>
                        </td>
                        <td className="py-4 pr-4 align-middle text-center">
                          <button
                            onClick={(e) => { e.stopPropagation(); setViewerAssetId(asset.id) }}
                            className="p-1.5 rounded hover:bg-ink-700 text-text-muted hover:text-accent-blue transition-colors"
                            title={`Inspect ${asset.label}`}
                            aria-label={`Inspect ${asset.label}`}
                          >
                            <InspectIcon />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

function AssetTypeBadge({ type }) {
  const meta = ASSET_TYPE_META[type] ?? { label: type, color: 'text-text-muted', bg: 'bg-ink-700 border-line' }
  return (
    <span className={`mt-1.5 inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${meta.bg} ${meta.color}`}
      style={{ borderStyle: 'solid' }}>
      {meta.label}
    </span>
  )
}

// ─── Tab 3: Obligations ────────────────────────────────────────────────────────

function ObligationsTab() {
  return (
    <div className="space-y-4 pb-20">
      <div className="pb-2">
        <h2 className="text-2xl font-bold text-text-primary mb-2">What Can't Elastic Do?</h2>
        <p className="text-base text-text-muted leading-relaxed">
          Elastic satisfies the technical requirements. M-26-14 also imposes operational and documentation
          obligations that stay with your agency regardless of platform choice. Below is what your agency
          owns — and where Elastic can help reduce the burden.
        </p>
      </div>

      {OBLIGATIONS.map((o) => (
        <div key={o.title} className="rounded-lg bg-ink-800 border border-line overflow-hidden" style={{ borderStyle: 'solid' }}>
          <div className="grid grid-cols-2 divide-x divide-line/30">
            <div className="px-7 py-4">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <p className="text-base font-semibold text-text-primary">{o.title}</p>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-ink-700 text-text-muted border border-line/60 whitespace-nowrap"
                  style={{ borderStyle: 'solid' }}>
                  {o.when}
                </span>
              </div>
              <p className="text-sm text-text-muted leading-relaxed">{o.desc}</p>
            </div>
            <div className="px-7 py-4">
              <p className="text-sm font-semibold text-accent-teal mb-1.5">How Elastic can help</p>
              <p className="text-sm text-text-primary leading-relaxed">{o.assist}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
