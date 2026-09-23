import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { OverviewContent } from './Overview.jsx'

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS = [
  { label: 'Requirements' },
  { label: 'Achieve Readiness in Days' },
  { label: 'Readiness Coverage Matrix' },
  { label: "What's Not Covered?" },
]

const CheckIcon = ({ size = 16, className = '' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 16 16" className={className} aria-hidden="true" fill="currentColor">
    <path fillRule="evenodd" d="M15.354 4.354 6.5 13.207 1.646 8.354l.708-.708L6.5 11.793l8.146-8.147.708.708Z" clipRule="evenodd"/>
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
// Section references are to the CISA LRA (August 20, 2026) unless prefixed.

const ACID_PHASES = [
  {
    label: 'Day 1',
    title: 'Deploy Elastic',
    desc: 'Deploy Elasticsearch, Kibana and Fleet Server, then load the M-26-14 Readiness Pack. Hot and frozen tiers are configured from day one, so the full retention window is searchable (LRA 4.5) and the Appendix B six-month searchable baseline is met at every maturity level (LRA 5.3). Progression changes timing and governance, never the tiering.',
    items: [
      'Hot/frozen ILM backed by searchable snapshots, plus SLM compliance snapshots: searchable and retrievable windows set on Day 1, no re-tiering as the agency moves up levels ✓',
      'Install pack stores, ingest pipelines and the policy enforcement point: redaction, minimization, sensitivity and sharing-class tagging, managed exceptions (LRA 4.6)',
      'Failure store on every pack data stream, provenance and an integrity hash on every record (LRA 4.2, 4.7, 6.3)',
      'Enable Kibana Security and Fleet Server; two-gate data retirement and legal hold are in place before the first log lands',
    ],
  },
  {
    label: 'Days 2–7',
    title: 'Deploy Fleet & Agent',
    desc: 'Enroll endpoints and systems with Elastic Agent via Fleet, covering all eleven Appendix B logging activities. The osquery integration starts building the hardware and software inventory the Agency Logging Plan requires, and fidelity scoring starts the moment data arrives.',
    items: [
      'Enroll endpoints with Elastic Agent via Fleet: Appendix B collection begins immediately across all 11 activities (a–k)',
      'Add the osquery integration for hardware, software and network inventory (HWAM/SWAM); the unknown-device triage loop classifies anything that appears on the wire without an agent',
      'Enable Appendix B detection rules, ML anomaly jobs and dashboards. They install dormant; the agency switches each on deliberately (LRA 8.3)',
      'Field-fidelity and ingest-timeliness scoring run per source against the LRA telemetry categories and the agency\'s own thresholds (LRA 3.5, 6.2, Appendix D)',
    ],
  },
  {
    label: 'Days 7–30',
    title: 'Expand Coverage',
    desc: 'With collection and detection in place, the work shifts to broadening coverage and proving it. Readiness measures (LRA 3.5) and the validation loop (Appendix E) produce the evidence the Agency Logging Plan, due November 18, 2026, has to cite.',
    items: [
      'Add threat intelligence integrations (STIX/TAXII, CISA KEV) for indicator matching across all log streams',
      'Tune detection rules and ML jobs against the environment\'s baseline; review the MITRE ATT&CK coverage page for gaps by tactic (LRA 3.1, 9.1)',
      'Turn on the canary loop and run the first retrieval drill; verdicts land in the validation ledger as retained evidence (LRA 3.5, Appendix E.7, E.12)',
      'Use the Collection Coverage, Field Fidelity and Readiness Attestation dashboards to close gaps and populate the Agency Logging Plan',
    ],
  },
  {
    label: 'Ongoing',
    title: 'Maintain & Extend',
    desc: 'Sustain coverage as the estate changes and exercise the obligations the LRA makes explicit: authorized production of logs, AI logging and governance, cost as a readiness measure. Level 4 items (federated query, agency-held keys) are built out here.',
    items: [
      'Maintain inventory, collection, fidelity and detection coverage as sources change; onboard new sources against the checklist and regression cases (LRA 7.3)',
      'Exercise authorized production to CISA, the FBI, Inspectors General and counsel through the production workflow, redaction profiles and ledger (LRA 7.4)',
      'Log the platform\'s own AI: Agent Builder traces into the AI audit store, with a governance profile under OMB M-25-21 (LRA 5.5, 10)',
      'Track cost as a readiness measure (LRA 9.3); build out cross-cluster search and agency-held encryption keys for Level 4',
    ],
  },
]

// ─── Coverage matrix data (Tab 2) ─────────────────────────────────────────────
// Ordered by deployment phase: phase 1 = Day 1, phase 2 = Days 2-7, phase 3 = Days 7-30, phase 4 = Ongoing.
// Section references are to the CISA LRA (August 20, 2026) unless prefixed; counts are the 0.3.x pack census.

const MATRIX_ROWS = [

  // ── Phase 1: Day 1 ─────────────────────────────────────────────────────────
  {
    phase: 1,
    firstLevel: 1,
    req: 'Retention baseline: 6 months searchable, 12 months retrievable',
    reqDesc: 'M-26-14 Appendix B requires six months actively searchable and twelve months retrievable. LRA 5.3 states this baseline binds at every maturity level; the Appendix C level thresholds govern maturity reporting only. LRA 4.5 makes searchable versus retrievable the central storage decision.',
    cap: 'Hot/frozen ILM + searchable snapshots + SLM',
    capDesc: 'Every pack retention policy moves data from a hot tier to a frozen tier backed by searchable snapshots, with no intermediate tiers. Frozen data is queryable without a restore step, so a Day-1 hot/frozen deployment holds its full window searchable.',
    modalHow: 'Index Lifecycle Management rolls each data stream from the hot tier to the frozen tier, where the data is mounted from a searchable snapshot and remains queryable in Discover, ES|QL and detection rules without a restore. Snapshot Lifecycle Management takes the compliance snapshots the retirement chain depends on. Frozen queries are slower than hot, so the pack does not assert searchability: a monthly retrieval drill records measured query time by tier, and the agency states its own timeliness thresholds against that evidence (LRA 3.5, Appendix E.7). The Level 1 and Level 2 policy variants shipped for agencies below the Appendix B floor are documented as dated exceptions, not as compliant end states. Nothing is re-tiered as the agency progresses: higher levels extend the hot floor and add governance.',
    modalCapabilities: [
      { name: 'Index Lifecycle Management (ILM)', type: 'platform', desc: 'Hot to frozen transitions on a schedule per data stream; the delete phase waits for a completed snapshot.', href: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/index-lifecycle-management.html' },
      { name: 'Searchable Snapshots (frozen tier)', type: 'platform', desc: 'Snapshot-backed indices mounted read-only on the frozen tier and searched in place, no restore step. This is what makes the full window "searchable" in the LRA 4.5 sense.', href: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/searchable-snapshots.html' },
      { name: 'Snapshot Lifecycle Management (SLM)', type: 'platform', desc: 'Scheduled compliance snapshots of every pack index to the repository; the technical gate for retirement and the source for the retrieval drill\'s restore check.', href: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/snapshot-lifecycle-management.html' },
    ],
  },
  {
    phase: 1,
    firstLevel: 3,
    req: 'Level 3 and 4 searchable windows (3 and 6 months, CEM)',
    reqDesc: 'Appendix C raises the searchable window reported for maturity to three months at Advanced and six at Optimal, on top of the twelve-month retrievable floor. These windows govern maturity reporting; the Appendix B baseline still binds (LRA 5.3).',
    cap: 'ILM L3/L4 variants: hot floor 90/180 days, frozen to 12 months',
    capDesc: 'The same hot/frozen policy family with the hot floor extended, so the CEM window is served at hot-tier latency. Frozen keeps the rest of the twelve months searchable; no-delete variants exist for NARA-scoped data.',
    modalHow: 'The Level 3 policy variant keeps data on the hot tier for 90 days before it moves to frozen; the Level 4 variant extends that to 180 days. Both then hold the remainder of the twelve-month window on the frozen tier, searchable in place. Because the tiering does not change between levels, moving from Level 2 to Level 3 is a policy swap on the data streams, not a migration. The Retention Readiness dashboard shows searchable days versus total retention per data stream, which is the evidence the maturity attestation cites.',
    modalCapabilities: [
      { name: 'Elasticsearch Data Tiers', type: 'platform', desc: 'Hot tier for the CEM window with no restore step; frozen tier for the rest of the retrievable window, searched from snapshots.', href: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/data-tiers.html' },
    ],
  },
  {
    phase: 1,
    firstLevel: 1,
    req: 'Two-gate data retirement with snapshot audit trail',
    reqDesc: 'Before readiness log data can be permanently deleted, agencies must ensure a durable snapshot exists and obtain documented approvals — satisfying chain-of-custody requirements across all maturity levels.',
    cap: 'Kibana Workflows + SLM policy + Kibana Cases + Audit Index',
    capDesc: 'Automated two-gate workflow: daily scan identifies aged frozen indices → Gate 1 Kibana Case for human approval → ILM wait_for_snapshot ensures backup exists → Gate 2 Case for final deletion authorization. Manual Kibana Workflows execute each gate transition with full audit trail.',
    modalHow: 'The M-26-14 readiness pack deploys a complete two-gate data retirement system built on Kibana Workflows, Kibana Cases, SLM, and an append-only audit index (m_26_14-retirement-requests). Detection alerts (Kibana Rules) fire when frozen indices exceed the configurable age threshold and open a Gate 1 Kibana Case for human review — no data is touched until a human approves. Once approved, the Gate 1 Kibana Workflow switches the index to a deletion-enabled ILM policy. ILM wait_for_snapshot then acts as a technical safeguard: deletion is blocked until the SLM policy confirms a durable snapshot exists in S3. Gate 2 requires a second explicit human approval before the Gate 2 Execution Workflow advances ILM past the snapshot gate to execute deletion. Every state transition — detect, approve, snapshot, delete — is recorded in the append-only m_26_14-retirement-requests audit index. The Legal Hold Workflow enables selective data preservation to a permanent no-delete retained index before retirement begins.',
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
    reqDesc: 'M-26-14 directs agencies to keep logs from capturing data in contravention of law and to protect the confidentiality and integrity of sensitive log data (Appendix A, Log Collection Containing Risk of Incidental Sensitive Data Exposure; Log Management element). New indices and data streams must be classified for sensitivity before retention policies and access controls are applied.',
    cap: 'Kibana Workflow — Data Classification Intake',
    capDesc: 'Manual Kibana Workflow opens a Kibana Case for data steward review when a new unclassified data stream is discovered, records classification_pending in audit index, and notifies the responsible team.',
    modalHow: 'The M-26-14 readiness pack includes a Data Classification Intake Kibana Workflow that initiates a formal classification review whenever a new index or data stream is discovered without an assigned sensitivity label. The workflow opens a Kibana Case assigned to the data steward with M-26-14 sensitivity tier guidance (public → restricted), instructions for inspecting the index and applying the appropriate ILM policy, and records a classification_pending state in the m_26_14-data-classification-requests audit index. The M-26-14 POA&M Drafting Agent can query this index to surface unclassified data streams as open readiness findings. Classification must be completed before default retention policies or broad access roles are applied to the new data stream.',
    modalCapabilities: [
      { name: 'Kibana Workflows', type: 'platform', desc: 'YAML-defined automation that opens a classification review Case, records audit state, and notifies the data steward team. No code required — operators update consts before running.', href: 'https://www.elastic.co/guide/en/kibana/current/workflows.html' },
      { name: 'Kibana Cases', type: 'platform', desc: 'Traceable review interface for data steward classification decisions. Each case includes M-26-14 sensitivity tier matrix and step-by-step classification instructions.', href: 'https://www.elastic.co/guide/en/kibana/current/cases-overview.html' },
    ],
  },

  {
    phase: 1,
    firstLevel: 1,
    req: 'Policy enforcement point (LRA 4.6)',
    reqDesc: 'Minimization, tagging, segmentation, redaction, routing and access control run through one controlled enforcement point placed after normalization, enrichment and validation and before data crosses an agency boundary. Exceptions are managed, with an owner and an expiry (LRA 8.3).',
    cap: 'Enforcement pipeline + policy store + exceptions register + four roles',
    capDesc: 'An ingest pipeline on every pack data stream redacts a pattern bank of secrets and regulated identifiers, removes fields listed per dataset, tags sensitivity, sharing class and high-value-asset status, and records a routing decision. Analyst, forensic, auditor and production-officer roles split access.',
    modalHow: 'The enforcement pipeline runs inside Elasticsearch on the ingest path of the pack\'s data streams, so it applies to every record regardless of the collector or API that delivered it. It redacts social security and card numbers, cloud keys, tokens, private keys and sensitive URL parameters in the message, raw payload and URL fields; removes fields the policy store lists for the dataset; stamps sensitivity, sharing class and HVA flags; and writes a routing decision the agency can act on. A managed-exceptions register carries dataset, rule, reason, approver and expiry; a daily rule alerts on any exception whose expiry has passed, and a lapsed exception narrows access (restricted sharing class) rather than widening it. For Elastic Agent integration streams an opt-in installer stage wires the same chain into the agency\'s standard customization hook. Redaction is a licensed feature; below the Enterprise tier the stage is skipped, ingestion continues, and the documentation says so.',
    modalCapabilities: [
      { name: 'Elasticsearch Ingest Pipelines', type: 'platform', desc: 'The enforcement point is a pipeline chain: redact, remove, set and script processors bound as the default pipeline of every pack stream.', href: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/ingest.html' },
      { name: 'Redact Processor', type: 'platform', desc: 'Grok-pattern redaction of secrets and identifiers at ingest, before the record is indexed. Enterprise licence.', href: 'https://www.elastic.co/docs/reference/enrich-processor/redact-processor' },
      { name: 'Document- and Field-Level Security', type: 'platform', desc: 'The four reference roles are built on role-based, document-level and field-level access control: what the analyst cannot see, the forensic role can.', href: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/field-level-security.html' },
    ],
  },
  {
    phase: 1,
    firstLevel: 1,
    req: 'Parser failure and schema drift are detected, not absorbed (LRA 4.7, 7.3)',
    reqDesc: 'Records that fail an ingest pipeline must be retained and visible with the failing step identified; schema changes on a source must be detected rather than silently narrowing what the platform sees (Appendix E.5.3, E.6.4).',
    cap: 'Failure store + Pipeline Health dashboard + failure-spike rule + schema-drift ML job',
    capDesc: 'Every pack data stream has its failure store enabled; a failed record lands there with the pipeline, processor tag and error. A rule alerts on a burst, a dashboard counts per source, and an ML job watches each source for new top-level fields or a drop in field count.',
    modalHow: 'The Elasticsearch failure store keeps a document the pipeline rejected instead of dropping it, with error.pipeline, the processor tag and the message. Every pack pipeline step is tagged so the failure names its step. The Pipeline Health dashboard counts failures per data stream, the pipeline-failure-spike rule alerts on a burst, and the schema-drift anomaly job flags a source whose field set changes. A scheduled workflow reports any field mapped with more than one type. Failed records are stored as they arrived, before redaction, so reading the failure store requires a dedicated role. A documented remediate-and-replay procedure returns fixed records through the same chain.',
    modalCapabilities: [
      { name: 'Data Stream Failure Store', type: 'platform', desc: 'Per-stream store for documents that failed ingest, with the failing pipeline and processor recorded; read through the ::failures selector.', href: 'https://www.elastic.co/docs/manage-data/data-store/data-streams/failure-store' },
      { name: 'Data Set Quality', type: 'platform', desc: 'Kibana\'s native view of degraded documents (fields that arrived but could not be mapped), shown beside the pack\'s fidelity score rather than duplicated.', href: 'https://www.elastic.co/docs/solutions/observability/data-set-quality-monitoring' },
    ],
  },
  {
    phase: 1,
    firstLevel: 1,
    req: 'Provenance and derived data on every record (LRA 4.2, 4.4, Section 7)',
    reqDesc: 'Records carry the originating system, event time, collection path and transformations applied. Derived annotations, scores and AI output are traceable to their source, method and version, and are represented as derived rather than as authoritative event content.',
    cap: 'Provenance object + derived-data stamp, enforced at build time',
    capDesc: 'Every record processed by the pack carries a provenance object naming the source, the collection path and the ordered list of pipelines that touched it. Every computed value carries a derived-data object naming what produced it, by what method, at which version and when.',
    modalHow: 'Each pack pipeline appends itself to the record\'s transformation chain, so a record\'s history is readable on the record. Readiness scores, classifications, enrichment and AI output are written only into their own namespace with a derived-data stamp; they never overwrite a source field, and the pack\'s build fails if a pipeline attempts to. The raw payload is kept on the same document as the normalized record, so source-native detail stays recoverable for the full retention window without a separate raw store (LRA 7.2). The forensic role sees the raw form; the analyst role does not.',
    modalCapabilities: [
      { name: 'Elastic Common Schema (ECS)', type: 'platform', desc: 'The normalization target. The LRA names ECS among examples of validated open-source schemas (footnote 9), alongside OCSF and STIX/TAXII; it does not endorse or require any schema.', href: 'https://www.elastic.co/guide/en/ecs/current/index.html' },
    ],
  },
  {
    phase: 1,
    firstLevel: 1,
    req: 'Durable transport (LRA 4.3, 5.1, 5.2, 8.3)',
    reqDesc: 'The dataflow design addresses durable handoff, buffering, checkpointing, replay, encryption, back pressure, partial failure and queue-health monitoring. A single fragile central pipeline is a named anti-pattern.',
    cap: 'Logstash bundle: persistent queue, dead-letter queue, mTLS, optional Kafka tier',
    capDesc: 'A tested Logstash configuration with on-disk queueing and checkpointing, a dead-letter queue, mutual TLS on every hop, an optional Kafka buffer tier and a replay pipeline. Seven queue-health panels on the Pipeline Health dashboard read the Logstash integration\'s metrics through Fleet.',
    modalHow: 'The transport document answers the eight LRA 4.3 properties one by one and states which pack sources are polled and how their lag is monitored. A runbook covers replay from the dead-letter queue, redrive from the failure store and backfill after an outage. Logstash is the reference implementation of the tier, not a requirement: an agency capability with the same properties, such as an existing Kafka tier, can take its place, and the pack\'s Kafka input pipeline consumes it into the same processing chain.',
    modalCapabilities: [
      { name: 'Logstash Persistent Queues', type: 'platform', desc: 'On-disk, checkpointed event queue that survives a Logstash restart and absorbs back pressure from the output.', href: 'https://www.elastic.co/docs/reference/logstash/persistent-queues' },
      { name: 'Logstash Dead Letter Queue', type: 'platform', desc: 'Events the output rejected are written to a dead-letter queue and replayed through the same pipeline once corrected.', href: 'https://www.elastic.co/docs/reference/logstash/dead-letter-queues' },
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
      { id: 'G', name: 'Category G — IoC Events',              desc: 'Matches against known-bad IPs, domains, file hashes, and URLs from threat intelligence feeds',     cap: 'Threat Intel (STIX/TAXII/MISP) + AppB-G detection rules',            capDesc: 'MISP/STIX/TAXII Threat Intel integration populates the indicator index; five Elastic prebuilt Threat Intel rules plus the pack\'s AppB-G domain-match rule match live event streams against CISA KEV and threat feeds.' },
      { id: 'H', name: 'Category H — Automated Alerts',        desc: 'SIEM rule-based detections, behavioral anomaly alerts, readiness degradation alerts',             cap: 'Detection Engine alert index · Winlogbeat',                           capDesc: 'Detection Engine rule execution writes to .alerts-security.*. Category H events are generated by Elastic — not collected from external sources.' },
      { id: 'I', name: 'Category I — Anomalous Activity',      desc: 'ML-detected behavioral outliers, deviations from user/host baselines',                            cap: 'Elastic ML jobs (8 custom + 7 Security module jobs)',                 capDesc: 'Category I events are produced by Elastic ML anomaly detection, not collected from external sources. Fifteen ML rules turn anomalies into alerts once the jobs have built baselines.' },
      { id: 'J', name: 'Category J — Error/Crash Events',      desc: 'Application error logs, service crash reports, process termination events',                        cap: 'Filebeat System · Windows Event Log · Elastic APM',                  capDesc: 'Linux auth.log/syslog via Filebeat System module, Windows Application and System event channels, Elastic APM for service crash and error telemetry.' },
      { id: 'K', name: 'Category K — DNS Activity',            desc: 'Full DNS query/response logs, DNS-over-HTTPS, DNS tunneling indicators',                          cap: 'Packetbeat · Zeek · Elastic Defend · network syslog',                capDesc: 'DNS query/response via Packetbeat and Zeek; DNS-over-HTTPS and DNS-over-TLS detection via Elastic Defend; legacy DNS appliance logs via Logstash syslog input.' },
    ],
    modalHow: 'Elastic Agent, managed through Fleet Server, provides a single enrollment point covering all 11 Appendix B log source categories. A single agent on an endpoint simultaneously activates Categories A, D, F, J, and K via Elastic Defend. Zeek handles Categories B and K for network infrastructure. Cloud integrations (AWS, Azure, GCP) cover Categories C and E. Categories G, H, and I are not collected from external sources — they are produced by Elastic\'s Threat Intel rules, Detection Engine, and ML jobs respectively, which are installed as part of the readiness pack. Logstash inputs bridge legacy OT/ICS sources and mainframes that cannot run native agents.',
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
    modalHow: 'Every Elastic Agent enrollment writes an inventory record to the Fleet-managed asset index. The readiness pack\'s osquery Fleet pack then continuously queries each enrolled endpoint for hardware identity (HWAM), installed software (SWAM), network interfaces, and local user accounts, all resolved into one canonical asset per device. This populates the Asset Coverage dashboard — the evidence export format for the Agency Logging Plan submission to CISA. But inventory is only half of Element 1: the memo also requires detecting and acting on devices that are NOT in inventory. The readiness pack closes that loop. A device surfaces three ways — the first-seen rogue-device detection rule, the observed-vs-inventory quadrant (on the wire but not inventoried), and network-discovery rows. The triage classifier then routes each unmanaged device into exactly one disposition from real signals (a computed Security-alert correlation for rogue, asset status for decommissioned, identity strength and vendor for new-vs-shadow), writes it to the triage ledger, and opens a disposition-specific Kibana Case with the recommended next step pre-filled. Classification and routing are automatic; every enforcement step — isolate, enroll, allow-list, retire — is human-gated.',
    subsLabel: 'Unknown-Device Dispositions (detect → classify → route → gated action)',
    subs: [
      { id: '1', name: 'Rogue',              desc: 'Unmanaged device with a correlated high-severity Security alert. Computed from real detections, not a seeded flag.', cap: 'escalate to IR (gated: isolate)' },
      { id: '2', name: 'Decommissioned',     desc: 'Marked retired/inactive or silent-then-stale (>45d) yet still on the network.',                                   cap: 'confirm offline → suppress (reversible)' },
      { id: '3', name: 'New-but-uninventoried', desc: 'Real device with strong identity (serial + enterprise vendor), no alerts — simply not in HWAM yet.',             cap: 'enroll (gated: deploy agent)' },
      { id: '4', name: 'Shadow-IT',          desc: 'Unmanaged consumer / BYOD device, no alerts. A policy decision, not a technical one.',                            cap: 'exception (gated: allow-list/removal)' },
      { id: '5', name: 'Needs-review',       desc: 'Signals ambiguous or conflicting — identity must be established before routing.',                                  cap: 'identify first' },
    ],
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
    cap: 'Detection Rules A–L',
    capDesc: '20 Appendix B rules across 12 category sets (A–L), inside a pack total of 58 rules that also cover asset drift, high-value assets, AI use, retirement gates and the pipeline itself. Adversary-behaviour rules carry MITRE ATT&CK technique metadata.',
    subsLabel: 'Detection Rules by Appendix B Category',
    subs: [
      { id: 'A', name: 'Identity Events (4 rules)',           desc: 'Credential stuffing (Windows/Okta), Azure auth failure chain, Linux SSH brute force',                         cap: 'AppB-A: Identity & Authentication Events', capDesc: '4 rules: Windows credential stuffing, Okta credential stuffing, Azure/Entra ID auth failure chain, Linux SSH brute force.' },
      { id: 'B', name: 'C2 Beaconing (1 rule)',               desc: 'Periodic outbound connection pattern consistent with command-and-control beaconing',                           cap: 'AppB-B: C2 Beaconing', capDesc: '1 rule: periodic outbound connection pattern indicative of C2 beaconing.' },
      { id: 'C', name: 'Mass File Access (1 rule)',            desc: 'High-volume file access events consistent with ransomware staging or bulk exfiltration',                       cap: 'AppB-C: Mass File Access', capDesc: '1 rule: high-volume file access events consistent with ransomware staging or bulk exfiltration.' },
      { id: 'D', name: 'Privilege Changes (1 rule)',            desc: 'New account created and then successfully used within a short window',                                        cap: 'AppB-D: New Account Created Then Used', capDesc: '1 rule: a newly created account that authenticates successfully soon after creation.' },
      { id: 'E', name: 'Infrastructure Changes (3 rules)',     desc: 'First-seen Elastic Agent enrollment, new OT asset by serial number, OT device configuration change outside the change window', cap: 'AppB-E: Infrastructure & OT Changes', capDesc: '3 rules: first-seen agent enrollment; new OT asset by serial (Dragos); OT configuration change outside the change window (Dragos).' },
      { id: 'F', name: 'EDR Tamper (1 rule)',                  desc: 'Elastic Agent process termination or service disable — indicates defense evasion',                             cap: 'AppB-F: EDR Tamper', capDesc: '1 rule: Elastic Agent process termination or service disable indicating defense evasion.' },
      { id: 'G', name: 'IoC Monitoring (1 custom + 5 prebuilt)', desc: 'Custom domain-match rule plus five Elastic prebuilt Threat Intel rules matching IP, hash, URL, email, and registry indicators', cap: 'AppB-G: IOC Monitoring (Threat Intel)', capDesc: '1 custom domain-match rule; IP/hash/URL/email/registry matching handled by 5 Elastic prebuilt Threat Intel rules (see rule guide).' },
      { id: 'H', name: 'Off-Hours Execution (1 rule)',         desc: 'Bulk process execution during non-business hours',                                                            cap: 'AppB-H: Off-Hours Bulk Execution', capDesc: '1 rule: bulk process execution outside business hours, with the ML host-silent and rare-process rules adding the behavioural side.' },
      { id: 'I', name: 'Exfiltration Volume (1 rule)',         desc: 'Anomalous outbound data volume spike above rolling 30-day baseline',                                          cap: 'AppB-I: Data Exfiltration Volume', capDesc: '1 rule: anomalous outbound data volume spike above rolling baseline.' },
      { id: 'J', name: 'APT Kill Chain (2 rules)',             desc: 'Multi-stage attack correlating recon, initial access, and lateral movement events',                           cap: 'AppB-J: APT Kill Chain', capDesc: '2 rules: multi-stage attack sequence correlating recon, initial access, and lateral movement events.' },
      { id: 'K', name: 'Coverage Gap Meta-Rule (2 rules)',     desc: 'Fires when any Appendix B log category stops receiving events — readiness degradation early warning',        cap: 'AppB-K: Coverage Gap Meta-Rule', capDesc: '2 rules: alert when any required Appendix B log category stops receiving events, an early warning of readiness degradation.' },
      { id: 'L', name: 'New/Rogue Device + OT Egress (2 rules)', desc: 'Passive detection of a new device on a network segment plus OT-protocol egress to an unexpected destination — catches unmanaged OT/IoT that never runs an agent', cap: 'AppB-L: New/Rogue OT Device + Egress', capDesc: '2 rules: AppA-L flags a new or rarely-seen device on a network segment (passive, ML-backed by new-network-device); AppB-L flags OT-protocol egress to an unexpected destination (non-standard port / C2). Covers unmanaged OT/IoT that never runs an agent.' },
    ],
    modalHow: 'The readiness pack installs 58 Kibana Security detection rules. Twenty are the Appendix B rule sets (A–L), each mapped to an Appendix B category and, where the rule models adversary behaviour, to a MITRE ATT&CK technique; fifteen are ML rules over the pack\'s anomaly jobs; the rest watch asset drift (7), high-value assets (4), AI use (3), retirement gates (2), and the pipeline and platform itself (7: canary, latency, failure store, expired exceptions, stale metrics, NTP offset). Rules install disabled and are enabled deliberately by the agency (LRA 8.3). Rules are ECS-normalized and work across all Appendix B log sources out of the box. The Category K meta-rules provide automated readiness monitoring — alerting when any category stops receiving events, giving teams early warning before CEM attestation breaks. Category L extends coverage to passively-observed OT/IoT devices that never run an agent.',
    modalCapabilities: [
      { name: 'Kibana Security Detection Engine', type: 'platform', desc: 'Rule evaluation engine for KQL, EQL, ML, and threshold-based detection. Writes to .alerts-security.* index for dashboard consumption.', href: 'https://www.elastic.co/guide/en/security/current/detection-engine-overview.html' },
      { name: 'MITRE ATT&CK Framework Mapping', type: 'platform', desc: 'All readiness pack rules include MITRE ATT&CK tactic and technique metadata for threat framework alignment and audit evidence.', href: 'https://www.elastic.co/guide/en/security/current/prebuilt-rules.html' },
    ],
  },
  {
    phase: 2,
    firstLevel: 3,
    req: 'Anomaly and behavioral detection (ML)',
    reqDesc: 'Level 3 requires ML-driven behavioral analysis running against historical baselines — not just signature-based rules, but detection of novel patterns producing Appendix B Category I events.',
    cap: 'Elastic ML anomaly jobs (8 custom + 7 module)',
    capDesc: '8 custom ML jobs (DNS entropy, five M-26-14 element monitors, new network device, schema drift) plus 7 Elastic Security ML module jobs prefix-installed for behavioral detection. 15 ML rules raise alerts from them.',
    modalHow: 'The readiness pack runs two ML job families. Eight custom jobs ship with the pack: DNS entropy anomalies (Categories B/G), the five M-26-14 element monitors (asset-coverage drops, ingestion-rate dips, rule silence, ILM/retention anomalies, hash-coverage gaps), new or rarely-seen devices per network segment (Element 1 / Appendix A HWAM, backing Category L), and schema drift per data stream (LRA 7.3). Seven Elastic Security ML module jobs are prefix-installed with the m_26_14_ job-id prefix to power the behavioral detection rules: authentication anomalies and rare IP access patterns (Category A), suspicious login activity, host-went-silent, rare process execution on Linux and Windows hosts, and rare destination countries (Category B). Each job includes its datafeed and builds behavioral baselines automatically from historical log data. ML-generated anomaly records constitute Appendix B Category I events.',
    modalCapabilities: [
      { name: 'Elastic Machine Learning — Anomaly Detection', type: 'platform', desc: 'Unsupervised behavioral baselines with automatic scoring — no labeled training data required. Covers auth, network, process, and readiness metrics.', href: 'https://www.elastic.co/guide/en/machine-learning/current/ml-ad-overview.html' },
    ],
  },
  {
    phase: 2,
    firstLevel: 3,
    req: 'IoC matching (STIX/TAXII/CISA KEV)',
    reqDesc: 'Live event streams must be continuously matched against known indicators of compromise from authoritative threat intelligence sources including the CISA Known Exploited Vulnerabilities catalog.',
    cap: 'Threat Intel rules (AppB-G, 5 prebuilt + 1 custom)',
    capDesc: 'Five Elastic prebuilt Threat Intel Indicator Match rules (IP, hash, URL, email, registry) plus the pack\'s custom domain-match rule, all matching STIX/TAXII feeds and the CISA KEV catalog.',
    modalHow: 'Elastic\'s Threat Intelligence integration ingests STIX/TAXII feeds and the CISA KEV catalog into the Elasticsearch threat-indicator index. Five Elastic Security prebuilt Indicator Match rules continuously match that index against live event streams — network connections against IP IoCs, file and process events against hash IoCs, URL events against malicious URL IoCs, plus email-sender and Windows-registry indicators. The pack adds one custom rule, m_26_14-appendixb-g-ioc-domain-match, for DNS/domain indicators the prebuilt set does not yet cover (earlier pack revisions shipped custom hash/IP/URL rules; those were retired in favor of the prebuilts). New indicators automatically apply to future events without rule changes. This produces the Category G events required by Appendix B.',
    modalCapabilities: [
      { name: 'Threat Intelligence Integration (MISP/STIX/TAXII)', type: 'platform', desc: 'Ingests STIX/TAXII indicator feeds and MISP events into the Elasticsearch threat-indicator index for real-time matching.', href: 'https://docs.elastic.co/integrations/ti_misp' },
      { name: 'CISA KEV Integration', type: 'platform', desc: 'Pulls the CISA Known Exploited Vulnerabilities catalog for continuous indicator matching against all log streams.', href: 'https://www.elastic.co/guide/en/security/current/threat-intelligence-integrations.html' },
    ],
  },
  {
    phase: 2,
    firstLevel: 3,
    req: 'CEM readiness attestation dashboards',
    reqDesc: 'Agencies need real-time, exportable evidence that detection rules are active and generating alerts across all 11 Appendix B categories — the primary AO attestation artifact.',
    cap: 'Kibana dashboards (21) + transforms (18)',
    capDesc: '21 dashboards in four families: attestation (Maturity Overview, Readiness Attestation, Alert Coverage, Appendix B Coverage Matrix, Retention Readiness, Log Management), inventory (HWAM overview/gaps/lifecycle, SWAM, Asset Coverage, Asset Discovery, Inventory Health, Config Drift), readiness measures (Collection Coverage, Collection Operations, Field Fidelity, Pipeline Health, Preflight & Stack Health) and value (HVA Differentiation, Cost and Operational Value).',
    modalHow: 'The readiness pack installs 21 Kibana dashboards, fed by 18 continuous transforms so the numbers are computed, not queried live at attestation time. The Readiness Attestation dashboard is the primary ATO evidence artifact: coverage percentages, retention windows and detection status across the Appendix B categories, with the canary pass rate and the last retrieval drill beside them. Alert Coverage and the Appendix B Coverage Matrix give per-category visibility for gap identification; the readiness-measure family (Collection Coverage, Field Fidelity, Pipeline Health, Preflight & Stack Health) covers the LRA 3.5 measures the Agency Logging Plan reports on. All dashboards are export-ready via Kibana\'s built-in PDF/PNG reporting for inclusion in audit submissions and ATO packages.',
    modalCapabilities: [
      { name: 'Kibana Reporting (PDF/PNG)', type: 'platform', desc: 'Export dashboards as formatted PDFs or PNGs for ATO evidence packages and audit submissions.', href: 'https://www.elastic.co/guide/en/kibana/current/reporting-getting-started.html' },
    ],
  },

  {
    phase: 2,
    firstLevel: 2,
    req: 'AI-assisted threat investigation, POA&M drafting, and after-action reporting',
    reqDesc: 'M-26-14 requires documented incident response, ongoing POA&M management, and auditable readiness reporting. These manual documentation burdens are the primary bottleneck for agency readiness teams.',
    cap: 'Elastic Agent Builder — 3 AI readiness agents',
    capDesc: 'Three pre-configured AI agents automate the most time-intensive readiness documentation tasks: threat investigation summaries, POA&M entry drafting from live findings, and after-action report generation from closed cases.',
    modalHow: 'The M-26-14 readiness pack ships three Elastic Agent Builder agents, each pre-configured with M-26-14 context, the appropriate built-in Elastic tools, and custom ES|QL tools scoped to the readiness indices. The Threat Investigation Agent autonomously investigates security alerts — querying entity risk scores, asset inventory, related logs, and attack discoveries — and produces a structured investigation summary with M-26-14 element impact mapping, ready to attach to the Kibana Case. The POA&M Drafting Agent queries open cases, unclassified data streams, retirement audit gaps, and recurring unresolved alerts, then drafts FISMA-compliant POA&M entries with proper control references, risk ratings, milestones, and completion dates. The After-Action Report Agent reconstructs incident timelines from closed cases and log data, calculates detection gaps, maps affected assets to M-26-14 elements, and drafts a formal AAR document — reducing a 2–4 hour manual task to under 2 minutes. All three agents use custom ES|QL tools scoped to m_26_14-* indices for data-grounded, verifiable output. Agents are deployed via the included shell script using the Agent Builder REST API.',
    modalCapabilities: [
      { name: 'Elastic Agent Builder', type: 'platform', desc: 'Custom AI agent platform with built-in tools for Elasticsearch, Kibana Cases, security alerts, entity risk scores, and Elastic Workflows. Agents are deployed via REST API with configurable system instructions and tool scoping.', href: 'https://www.elastic.co/docs/explore-analyze/ai-features/elastic-agent-builder' },
      { name: 'Agent Builder Built-in Security Tools', type: 'platform', desc: 'security.alerts, security.entity_risk_scores, security.attack_discoveries, security.get_entity — built-in tools giving agents direct access to the Elastic Security data model.', href: 'https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/tools/builtin-tools-reference' },
      { name: 'Workflow Integration (platform.core.get_workflow_execution_status)', type: 'platform', desc: 'Native integration between Agent Builder agents and Kibana Workflows — agents can check workflow status and resume paused workflows at human-input steps, enabling the full human-in-the-loop IR pipeline natively.', href: 'https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/tools/builtin-tools-reference' },
    ],
  },

  {
    phase: 2,
    firstLevel: 1,
    req: 'Telemetry categories and minimum fidelity (LRA 6.2, 6.3, Appendix D)',
    reqDesc: 'Logging is organized on nine telemetry categories, each with minimum usable fidelity. Six common fields (timestamp, event or action type, identity or system context, affected resource, outcome, provenance) apply across categories, and agencies validate that fields are populated (Appendix E.5.1).',
    cap: 'Field-fidelity transform + Field Fidelity & Category Coverage dashboard',
    capDesc: 'An hourly per-source measure of the percentage of records carrying each common field and each category-specific field, the fields below threshold, and a fidelity score. Contracts are stored as configuration so an agency can tighten them.',
    modalHow: 'A crosswalk maps each LRA category to the M-26-14 Appendix B activities (a) through (k), to the pack data streams, rules and dashboards that cover it, and the six common fields to Elastic Common Schema. A transform scores every dataset hourly against the common-field contract and the category contract that applies to it (identity, network, endpoint, cloud, inventory, security alerts), records the missing fields, and the dashboard shows the score per source beside the platform\'s native data-set quality view. The measure reports field presence, not field correctness. Network sources are additionally scored for direction, byte counts, DNS context, duration, NAT addresses and zone (Appendix D.2.4); service and non-person identities are normalized so machines are seen as machines (D.3.3, D.3.4).',
    modalCapabilities: [
      { name: 'Elasticsearch Transforms', type: 'platform', desc: 'Continuous pivot over the pack data streams computing per-dataset, per-hour field presence counts; a dest pipeline turns counts into the score and the missing-field list.', href: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/transforms.html' },
    ],
  },
  {
    phase: 2,
    firstLevel: 1,
    req: 'Ingest timeliness (LRA 3.5, 5.2, Appendix E.4)',
    reqDesc: 'Agencies define per-category latency thresholds and measure ingest timeliness continuously; polled sources are monitored for lag.',
    cap: 'Ingest-latency transform + agency thresholds in configuration + sustained-breach rule',
    capDesc: 'Every record indexed through the pack carries its ingest time and the elapsed time from event to index. A continuous aggregation reports median, 95th percentile and maximum lag per source and per LRA category against thresholds the agency sets.',
    modalHow: 'The pack stamps event.ingested on every record it processes and computes the event-to-index lag at ingest. A transform keeps the lag history per source and category; a rule fires on sustained breach of the threshold the agency entered in the configuration index. The measure covers lag observed by the platform; delay inside a source before it emits is outside its view, and the transport document states which sources are polled and how their lag is monitored.',
    modalCapabilities: [
      { name: 'Elasticsearch Transforms', type: 'platform', desc: 'Continuous percentile aggregation of event-to-ingest lag per source, retained as history.', href: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/transforms.html' },
    ],
  },
  {
    phase: 2,
    firstLevel: 2,
    req: 'Zero-trust decision context and non-person identity (LRA 5.5, 6.2; Appendix C.4.2, D.3)',
    reqDesc: 'Where zero-trust controls exist, preserve the decision they made: authentication strength and MFA result, device posture, policy evaluation outcome, segmentation decision, east-west as well as north-south visibility. Service and non-person identities are represented, not mistaken for people.',
    cap: 'Derivation stage in the enforcement chain + zone map + user-type normalization',
    capDesc: 'A pipeline stage derives these decisions into dedicated fields from what identity and device sources already emit (Entra ID, Okta, Intune, Jamf), and derives traffic direction from addresses when the source did not say. Source values always win.',
    modalHow: 'Microsoft Entra ID sign-in logs supply the MFA requirement and conditional-access result; Okta system logs the MFA result and policy reason; Intune and Jamf the device-compliance state (starter mappings, to be confirmed against the agency\'s data); observer zones the segmentation decision. Zone context comes from a subnet-to-zone table the agency maintains in the configuration index, applied by a range lookup at ingest. User type is normalized to service, workload or API key from the shapes identity sources emit, so Entity Store service entities and analysts see machines as machines. The fields join the identity and network fidelity contracts, so the hourly score shows where zero-trust decisions are reaching the log and where they are not. Alignment to the Zero Trust Maturity Model is cited to the LRA\'s own alignment table. The pack derives; it does not collect.',
    modalCapabilities: [
      { name: 'Elastic Security Entity Store', type: 'platform', desc: 'Host, user and service entities with risk scores; the user-type normalization keeps service principals out of the people view.', href: 'https://www.elastic.co/guide/en/security/current/entity-store.html' },
    ],
  },
  {
    phase: 2,
    firstLevel: 2,
    req: 'High-value asset uplift (LRA 5.5; Appendix D.9)',
    reqDesc: 'Logging for high-value assets must be materially stronger than general enterprise logging: fidelity, searchable window, provenance, segmentation and immutable handling.',
    cap: 'HVA flag at the enforcement point + 3 tighter rules + HVA fidelity contract + 12/24-month lifecycle + HVA Differentiation dashboard',
    capDesc: 'A record whose asset criticality is high or extreme is flagged at ingest. Tighter detection thresholds, an additional fidelity contract, locked-on raw-payload retention and a longer lifecycle follow from the flag.',
    modalHow: 'Three detection rules with tighter thresholds apply only to flagged records: three failed authentications on one host and user, the first sight of a process executable on a host, and any configuration change. An HVA fidelity contract (user, process command line, outcome, raw payload, provenance) is scored over flagged records only and reported beside the general score. Streams routed to the pack\'s high-value namespace bind a longer lifecycle: searchable for twelve months, retrievable for twenty-four, no automatic deletion, retirement through the two-gate approval. The HVA Differentiation dashboard puts high-value against general logging side by side on fidelity, ingest latency and detection density, which is the comparison the LRA\'s reviewer question asks for. The criticality value reaches the record from the agency\'s asset inventory through an enrichment the agency wires into its ingest customization hook; the pack documents the step and ships the enrich policy.',
    modalCapabilities: [
      { name: 'Asset Criticality (Elastic Security)', type: 'platform', desc: 'The extreme_impact / high_impact vocabulary the pack\'s HVA flag reads is Kibana\'s own asset-criticality field, so the same value drives entity risk scoring.', href: 'https://www.elastic.co/guide/en/security/current/asset-criticality.html' },
    ],
  },

  // ── Phase 3: Days 7–30 ─────────────────────────────────────────────────────
  {
    phase: 3,
    firstLevel: 3,
    req: 'Alert correlation and risk scoring',
    reqDesc: 'Individual rule alerts must be aggregated into higher-confidence, risk-scored findings to reduce SOC false-positive burden before triage.',
    cap: 'Posture and entity transforms + Entity Store risk scoring',
    capDesc: 'The alert-coverage daily and latest transforms compute per-category coverage; the score-rollup and score-entity transforms turn alerts, inventory and drift into per-host readiness scores that feed Elastic Security\'s entity risk engine.',
    modalHow: 'Of the pack\'s 18 transforms, four do this work. The alert-coverage daily and latest transforms compute coverage per Appendix B category and keep the current state for the Maturity Overview dashboard. The score-entity transform folds alerts, inventory posture and configuration drift into a per-host readiness score; the score-rollup transforms aggregate it by agency unit. Alerts also flow into Elastic Security\'s entity risk scoring, and asset criticality set on the entity raises the score of a high-value host, so analysts triage multi-alert entities before low-signal individual alerts. Every computed score carries the derived-data stamp (LRA 4.4).',
    modalCapabilities: [
      { name: 'Elasticsearch Transforms', type: 'platform', desc: 'Continuous aggregation pipelines summarizing alert index data into pivot tables and risk-scored entity summaries.', href: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/transforms.html' },
      { name: 'Kibana Security Entity Risk Scoring', type: 'platform', desc: 'Aggregates detection rule alerts into per-host and per-user risk scores for analyst triage prioritization.', href: 'https://www.elastic.co/guide/en/security/current/entity-risk-scoring.html' },
    ],
  },

  {
    phase: 3,
    firstLevel: 1,
    req: 'Synthetic validation (LRA 3.5, 4.7; Appendix E.12.1)',
    reqDesc: 'Validation maturity is a readiness measure. Synthetic event injection and automated threat emulation are expected capabilities, and the results are kept as evidence.',
    cap: 'Canary Inject + Canary Verify workflows + validation ledger',
    capDesc: 'A scheduled canary injects a known event per source class every fifteen minutes through the normal ingest path; an hourly verifier records whether each canary arrived, parsed and produced an alert. Verdicts are retained in the validation ledger and summarized on the attestation dashboard as a thirty-day pass rate per stage.',
    modalHow: 'Canary records travel the same pipelines, enforcement point and detection rules as real data, so a pass proves the chain end to end rather than each piece in isolation. Verdicts carry a derived-data stamp and are excluded from coverage and fidelity scoring. A failed stage opens a Case. Automated threat emulation is documented as a procedure that writes to the same ledger; it is not shipped as a pack asset.',
    modalCapabilities: [
      { name: 'Kibana Workflows', type: 'platform', desc: 'Scheduled inject and verify workflows; the verifier queries the target stream and the alerts index and writes a verdict per stage.', href: 'https://www.elastic.co/guide/en/kibana/current/workflows.html' },
    ],
  },
  {
    phase: 3,
    firstLevel: 1,
    req: 'Demonstrated retrieval (LRA Appendix E.7.2, E.12.3)',
    reqDesc: 'Demonstrate retrieval within the stated timeframe and keep the demonstration as evidence. Searchability of the frozen tier is asserted from measurement, not from the architecture diagram.',
    cap: 'Monthly Retrieval Drill workflow + validation ledger + runbook for air-gapped sites',
    capDesc: 'Three fixed investigative queries (indicator lookup by address, one user\'s activity over the retention window, process lookup by hash) run with timing and storage-tier attribution recorded; one backing index is restored from the latest compliance snapshot under a temporary name, verified for document count and integrity-hash coverage, then deleted.',
    modalHow: 'Each drill writes its result to the validation ledger with the measured time per query and the tier that served it, so the agency can state searchability against its own timeliness thresholds (LRA 3.5) instead of asserting it. A failed drill opens a Case. The runbook gives the manual form for air-gapped deployments, with dataset rotation and hash recomputation as additional depth. Exercised end to end on the demo cluster, restore verified to the document.',
    modalCapabilities: [
      { name: 'Elasticsearch Snapshot & Restore', type: 'platform', desc: 'The drill restores one backing index from the latest SLM snapshot under a temporary name and verifies it before deleting the copy.', href: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/snapshot-restore.html' },
    ],
  },
  {
    phase: 3,
    firstLevel: 3,
    req: 'Coverage measured against MITRE ATT&CK (LRA 3.1, 9.1)',
    reqDesc: 'Measure monitoring coverage against a standardized adversary-behaviour framework to find gaps and prioritize detections.',
    cap: 'Rule technique tags + Kibana MITRE ATT&CK coverage page + monthly ATT&CK Coverage Snapshot workflow',
    capDesc: 'Every pack rule that models adversary behaviour carries its ATT&CK tactic and technique; rules that watch the logging platform itself are deliberately unmapped and listed as such. A monthly workflow records the rule count and any disabled rules to the validation ledger.',
    modalHow: 'Kibana\'s rule coverage page renders the pack\'s rules against the full ATT&CK matrix beside Elastic\'s prebuilt rules, filtered by the pack\'s tag. The coverage document explains how a gap in a tactic column points at a collection gap in a telemetry category. Technique mappings are build-time metadata in the rule sources; the counts quoted in the documentation are dated and regenerated with each release, and the monthly snapshot makes coverage a trend the Agency Logging Plan can cite.',
    modalCapabilities: [
      { name: 'MITRE ATT&CK Coverage (Elastic Security)', type: 'platform', desc: 'Native Kibana page mapping enabled and disabled rules onto the ATT&CK matrix by tactic and technique.', href: 'https://www.elastic.co/docs/solutions/security/detect-and-alert/mitre-attck-coverage' },
    ],
  },

  // ── Phase 4: Ongoing ───────────────────────────────────────────────────────
  {
    phase: 4,
    firstLevel: 1,
    req: 'Authorized production of logs to CISA, FBI, OIG and courts (LRA 7.4; Appendix C.9.5, E.9.4)',
    reqDesc: 'The Agency Logging Plan describes how the agency answers log requests: identify, scope, preserve integrity, export, format, meet the timeframe, and document every transformation and redaction applied before sharing. CISA\'s Cloud Log Aggregation Warehouse is an optional destination, not a required component.',
    cap: 'Authorized Production workflow + production ledger + redaction profiles + runbook',
    capDesc: 'A manual workflow restricted to a production-officer role: creates a production index under a no-delete policy before any data lands, counts the in-scope set, copies it through a named redaction profile (none, standard, strict), opens a Case carrying the due date, verifies counts and profile stamps, snapshots the produced set, and writes a manifest to the ledger.',
    modalHow: 'The manifest records the authority, request reference, scope, counts, every pipeline applied, fields redacted and dropped, snapshot, operator and timestamps, which is the LRA 7.4 documentation requirement in one record. Export instructions cover NDJSON, CSV and snapshot; the runbook gives the same procedure step by step for air-gapped deployments and maps each of the seven Section 7.4 elements to where it is satisfied. For standing arrangements the pack documents four paths (continuous feed of an agreed slice, scoped query export, cross-cluster read access with document- and field-level security, bulk snapshot handoff with integrity hashes), each selecting on the sharing-class field the enforcement point stamps on every record, so scope is decided once, in data. No connector to the CISA warehouse ships, because its intake format, transport and scope are agreed between each agency and CISA. The workflow ships dormant; its verification logic is built and package-checked and has not yet been exercised on a live cluster.',
    modalCapabilities: [
      { name: 'Kibana Workflows', type: 'platform', desc: 'Manual, role-restricted workflow executing the scope, copy, verify, snapshot and manifest steps in order, with a Case for the request.', href: 'https://www.elastic.co/guide/en/kibana/current/workflows.html' },
      { name: 'Cross-Cluster Search with DLS/FLS', type: 'platform', desc: 'The read-access path for an authority\'s own analysis environment: the agency creates the remote connection and a role scoped by sharing class.', href: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/modules-cross-cluster-search.html' },
    ],
  },
  {
    phase: 4,
    firstLevel: 2,
    req: 'AI as a producer of logs, and AI governance (LRA 5.5, 8.1, Section 10; OMB M-25-21)',
    reqDesc: 'Where AI is used in the logging platform, log prompts, system instructions, model outputs, agent decisions and actions, tool calls, model versions and manipulation indicators; the platform\'s own AI is a high-value asset. For each AI component, state intended use, data inputs, validation, human review points and a fallback mode.',
    cap: 'Agent Builder traces → AI audit store + prompt-injection rule + usage tracking + connector/knowledge-base audit rules + governance profile',
    capDesc: 'The pack\'s three readiness agents run on Elastic Agent Builder, which records every interaction as trace spans. The pack binds those spans to the HVA retention policy and copies each into a governed audit store with a tamper-evidence hash. Requires Kibana 9.5 or later.',
    modalHow: 'Each audit record carries the invoking identity, model, prompt, system instructions, tool calls with arguments and results, output, conversation correlation and a derived-data stamp. Capture of prompt and response content is controlled by six administrator settings the agency sets deliberately and records as a governance decision; with content capture off the trail still proves that the AI ran, when, for how long and with which tools. A detection rule flags prompt-injection and jailbreak phrasings in captured content. For the other AI features in Kibana (Security AI Assistant, Attack Discovery, Automatic Import, Migration, Troubleshooting) the platform does not expose conversation content and the pack does not claim to capture it; it provides per-request token accounting by feature and model, and two rules on the Kibana audit log recording who created, changed or deleted a model connector and who changed the assistant\'s knowledge base (Kibana audit logging is a subscription feature the agency enables). The governance profile gives, per agent, intended use and non-uses, indices read, the live test suite that validates behaviour, the human review points, and the fallback property that readiness measurement, detection, retention and evidence continue without a model connector. It states the pack\'s position under M-25-21 (decision-support drafting aids, not high-impact AI as shipped) for the agency to confirm. Elastic\'s EDOT LLM instrumentation for AI systems the agency builds is tech preview and labelled as such.',
    modalCapabilities: [
      { name: 'Elastic Agent Builder', type: 'platform', desc: 'Agents, tools and conversations; OpenTelemetry traces per conversation round with GenAI attributes from 9.5.', href: 'https://www.elastic.co/docs/explore-analyze/ai-features/elastic-agent-builder' },
      { name: 'Kibana Audit Logging', type: 'platform', desc: 'Records connector and knowledge-base saved-object changes; the source for the model-lineage rules. Does not record Agent Builder actions themselves.', href: 'https://www.elastic.co/guide/en/kibana/current/xpack-security-audit-logging.html' },
    ],
  },
  {
    phase: 4,
    firstLevel: 1,
    req: 'Cost as a readiness measure (LRA 3.5, 9.3)',
    reqDesc: 'Treat cost as a readiness measure alongside coverage and fidelity, with this version of the LRA focused on storage and architecture cost, and justify collection above the baseline by the five-step method: define the outcome, identify the sources, estimate volume and cost, select the tier, record the decision.',
    cap: 'Ops Metrics Snapshot workflow + Cost and Operational Value dashboard',
    capDesc: 'A daily workflow records the estate\'s size to a metrics store: data streams, total stored bytes, bytes on the frozen tier, the pack\'s own footprint, and the agency\'s per-gigabyte rates for hot and frozen storage. The dashboard shows store growth by tier, detection density by rule, and volume beside fidelity per dataset.',
    modalHow: 'A dataset that is large and low-fidelity is visible as a candidate for a tier change or a collection review. The five-step method is on the dashboard as a worksheet; steps one, four and five remain the agency\'s judgement, and the dashboard supplies the inputs to steps two and three. The rates default to zero until the agency sets them; from then on each daily record is priced when written, from the rates in force that day, and records keep the rate they were priced with. A rule alerts when no daily record has been written for two days.',
    modalCapabilities: [
      { name: 'Kibana Workflows', type: 'platform', desc: 'Daily scheduled workflow reading cluster and index statistics into the ops-metrics store.', href: 'https://www.elastic.co/guide/en/kibana/current/workflows.html' },
    ],
  },
  {
    phase: 4,
    firstLevel: 4,
    req: 'Federated cross-agency log query',
    reqDesc: 'Level 4 requires a top-level SOC to query all distributed agency log stores from a single interface without replicating data to a central repository.',
    cap: 'Cross-Cluster Search (CCS)',
    capDesc: 'Elasticsearch CCS enables a central Kibana to query remote clusters across any network topology — no data movement, full Kibana query support.',
    modalHow: 'Elasticsearch Cross-Cluster Search (CCS) allows a central Kibana instance to issue federated queries across any number of remote Elasticsearch clusters — without copying data to a central repository. Each agency log store remains in-place under the agency\'s control; the central SOC cluster issues queries that fan out to remote clusters and aggregate results. CCS supports full Kibana query syntax including KQL, EQL, and ML scoring, enabling the federal-level SIEM console required at Level 4. No data movement occurs; only query results transit the network.',
    modalCapabilities: [
      { name: 'Cross-Cluster Search (CCS)', type: 'platform', desc: 'Federated query across multiple Elasticsearch clusters — no data movement, full Kibana and KQL/EQL support.', href: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/modules-cross-cluster-search.html' },
      { name: 'Cross-Cluster Replication (CCR)', type: 'platform', desc: 'Optional active replication for geo-redundancy or disaster recovery — not required for M-26-14 federated query readiness.', href: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/xpack-ccr.html' },
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
    modalCapabilities: [
      { name: 'Elasticsearch BYOK Encryption at Rest', type: 'platform', desc: 'DEK wrapping via AWS KMS, Azure Key Vault, or GCP KMS — agency holds key custody, not the platform.', href: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/security-basic-setup-https.html' },
      { name: 'TLS Encryption in Transit', type: 'platform', desc: 'TLS 1.2/1.3 enforced for all inter-node and client communication within the Elastic cluster.', href: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/security-basic-setup.html' },
    ],
  },
  {
    phase: 4,
    firstLevel: 1,
    req: 'Time synchronization and tamper-evident records (LRA 6.3; M-26-14 Appendix A)',
    reqDesc: 'Timestamps must be consistent and traceable to an authoritative time source across all log sources, and log integrity protected so a forensic timeline resists backdating. Integrity hashing is regular from Level 2 and continuous at higher levels.',
    cap: 'Integrity hash pipeline + NTP-status transform + host offset rule',
    capDesc: 'Every record processed by the pack carries a SHA-256 fingerprint computed at ingest; a hash-coverage rollup reports the share of records carrying one. The NTP-status transform reads each host\'s time-sync state from the osquery pack, and a rule alerts when a host\'s offset exceeds the agency threshold.',
    modalHow: 'The integrity pipeline computes a SHA-256 fingerprint of each event at indexing time, stored on the record so tampering after the fact is detectable; the hash-coverage rollup and the Element 5 ML job watch for the share of hashed records dropping. Time synchronization is measured rather than assumed: the osquery pack collects each host\'s NTP state, the ntp-status transform keeps the latest per host, and the NTP-offset rule alerts when a host drifts beyond the configured bound. Fleet agent policy is where the agency points hosts at USNO or NIST sources; the pack verifies the outcome. Log Management dashboard panels show hash coverage and time-sync status per host.',
    modalCapabilities: [
      { name: 'Elasticsearch Fingerprint Processor', type: 'platform', desc: 'Computes SHA-256 hash of event records at ingest time — stored alongside the event for independent tamper-evidence verification.', href: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/fingerprint-processor.html' },
      { name: 'Osquery Manager Integration', type: 'platform', desc: 'Collects each host\'s time-sync state on a schedule; the ntp-status transform and offset rule read from it.', href: 'https://docs.elastic.co/integrations/osquery_manager' },
    ],
  },
]

// ─── Agency obligations (Tab 3) ───────────────────────────────────────────────

const OBLIGATIONS = [
  {
    title: 'Agency Logging Plan',
    when: 'By November 18, 2026 (LRA + 90 days)',
    desc: 'A documented plan covering every log source in scope, coverage gaps, inventory methodology, the readiness measures and thresholds the agency has set, and how it produces logs on request (LRA Section 7.4, Appendix B template). Writing and submitting the plan is the agency\'s obligation; no platform can do it for you.',
    assist: 'Fleet enrollment auto-builds and maintains the asset inventory the plan cites. The pack ships a Logging Plan template keyed to the LRA Appendix B outline, and the Collection Coverage, Field Fidelity, Retention Readiness and Readiness Attestation dashboards export the evidence each section calls for.',
  },
  {
    title: 'Readiness thresholds, rates and reference tables',
    when: 'Before the first attestation',
    desc: 'The LRA leaves the numbers to the agency: per-category ingest-latency thresholds, minimum fidelity, the subnet-to-zone map that gives network records their segmentation context, storage rates for the cost measure, and the field-removal list per dataset. Until they are set, the measures report against defaults.',
    assist: 'Every one of these lives in the pack\'s configuration index as a document the agency edits, not in code. Thresholds drive the latency and fidelity rules and dashboards the moment they are changed; rates price the daily ops snapshot from the day they are entered; the zone map is applied at ingest by a range lookup.',
  },
  {
    title: 'Data classification and enforcement policy',
    when: 'Before sensitive sources are onboarded',
    desc: 'The agency defines which fields are sensitive under its classification schema, which redaction and minimization rules apply per dataset, which sharing class each source carries, and who may approve an exception and for how long (LRA 4.6, 8.3).',
    assist: 'The policy enforcement point applies the policy the moment it is written: redaction patterns, per-dataset field removal, sensitivity and sharing-class tags and a managed-exceptions register with expiry alerts. The Data Classification Intake workflow opens a Case for every new unclassified data stream so nothing is retained under default rules by accident.',
  },
  {
    title: 'Log source gap remediation and onboarding',
    when: 'Ongoing',
    desc: 'Elastic Agent covers every Appendix B category, but every applicable system has to be enrolled, and each new source has to arrive with the fields its telemetry category requires. Edge cases (legacy mainframes, custom OT systems, air-gapped enclaves) need agency-specific integration work.',
    assist: 'The Collection Coverage dashboard and the Category K meta-rules show any Appendix B category that has stopped receiving events; the Asset Coverage and HWAM Gaps dashboards show un-enrolled hosts. The source-onboarding standard gives a checklist and regression cases per source, and the durable-transport bundle covers syslog, Beats, Kafka and JDBC bridging.',
  },
  {
    title: 'Authorized production procedure',
    when: 'In the Logging Plan; exercised before Level 3',
    desc: 'How the agency answers a request for logs from CISA, the FBI, an Inspector General or a court: who authorizes, how scope is set, how integrity is preserved, and how every transformation and redaction is documented (LRA 7.4). This is a governance procedure owned by the ISSO, General Counsel and the mission owner.',
    assist: 'The Authorized Production workflow, production ledger and redaction profiles are the technical mechanism; the runbook maps the seven Section 7.4 elements to where each is satisfied and gives the manual form for air-gapped sites. Standing arrangements (continuous feed, scoped query, cross-cluster read, bulk handoff) are documented for the agency to parameterize once CISA supplies an intake specification.',
  },
  {
    title: 'AI governance under OMB M-25-21',
    when: 'Before any AI agent is enabled in production',
    desc: 'For each AI component in the logging platform the agency states intended use, data inputs, validation, human review points and a fallback mode (LRA Section 10), decides whether prompt and response content is captured, and determines its M-25-21 use-case category.',
    assist: 'The governance profile answers each of those per shipped agent and states the pack\'s position (decision-support drafting aids, not high-impact AI as shipped) for the agency to confirm. Content capture is six administrator settings the agency turns on deliberately; the AI audit store, prompt-injection rule and connector audit rules give the evidence trail either way.',
  },
  {
    title: 'Authority to Operate (ATO)',
    when: 'Per FISMA cycle',
    desc: 'The ATO is the agency\'s formal authorization to operate the logging system under FISMA. Elastic provides the technical evidence; the risk acceptance decision, system security plan and authorization package belong to the Authorizing Official.',
    assist: 'The Readiness Attestation dashboard, Alert Coverage, Retention Readiness and Appendix B Coverage Matrix dashboards form a pre-structured evidence package, and the validation ledger holds the canary and retrieval-drill history as retained evidence (LRA Appendix E). All export as Kibana PDF reports.',
  },
  {
    title: 'Incident response procedures',
    when: 'Ongoing',
    desc: 'Elastic detects and triages threats, but declaring an incident, activating the IR team, notifying stakeholders and coordinating with CISA under CIRCIA requires organizational procedures and trained personnel that no logging platform can substitute for.',
    assist: 'Elastic Security case management, alert escalation workflows and the timeline view accelerate response once an incident is declared. Detection rules can be mapped to IR playbooks so the relevant runbook steps appear beside each alert, and the Threat Investigation agent drafts the summary for the Case.',
  },
  {
    title: 'Privacy Impact Assessment (PIA)',
    when: 'Before sensitive sources are onboarded',
    desc: 'Systems that collect or process PII require a PIA under the Privacy Act and OMB A-130. The agency\'s privacy officer assesses the logging system; Elastic cannot complete that assessment on the agency\'s behalf.',
    assist: 'The enforcement pipeline configuration is the technical annex: which patterns are redacted, which fields are removed per dataset, which roles can read the raw payload and the failure store. The fidelity crosswalk lists the fields each telemetry category carries, which is the PII field inventory a PIA starts from.',
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
          M-26-14 Readiness Accelerator
        </span>
        <div className="flex items-start justify-between gap-8 flex-wrap">
          <div className="flex flex-col gap-4 flex-1 min-w-0">
            <h1 className="text-4xl font-bold text-text-primary leading-tight">
              Deploy Elastic,&nbsp;<span className="text-accent-teal">Leapfrog to Level 2.</span>
            </h1>
            <p className="text-lg text-text-muted leading-relaxed">
              Most agencies treat M-26-14 readiness as a multi-year integration project. It doesn't have to be.
              Elastic's core platform — log collection, tiered storage, SIEM detection, and ML anomaly detection — maps
              directly to every technical requirement across Levels 1 through 3.{' '}
              <span className="text-text-primary font-semibold">Deploy once, activate the readiness pack,
              and your technical posture is ready from day one.</span>
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
              to="/capabilities/assets"
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-accent-blue/50 bg-accent-blue/10 text-accent-blue font-semibold hover:bg-accent-blue/20 transition-colors text-sm whitespace-nowrap"
              style={{ borderStyle: 'solid' }}
            >
              Browse readiness pack assets →
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
        Achieve Readiness in Days
      </h2>

      {/* Conops blurb */}
      <p className="text-sm leading-relaxed text-text-muted" style={{ fontSize: 14 }}>
        Deploying the Elastic Search AI Platform and M-26-14 Readiness Pack delivers full data
        retention readiness on Day 1 — the technical foundation for all five maturity levels
        (Ineffective through Optimal). Progression from Ineffective through Initial, Intermediate,
        Advanced, and Optimal then proceeds as data
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
        <h2 className="font-semibold text-text-primary" style={{ fontSize: 26 }}>Readiness Coverage Matrix</h2>
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
          Requirements listed in deployment-phase order (Day 1 to Ongoing). Click any row for capability breakdown and readiness pack assets.
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
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-6"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />

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
                            <p className="text-xs font-semibold text-text-primary">{sub.cap}</p>
                            {sub.capDesc && <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{sub.capDesc}</p>}
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

        </div>
      </div>
    </div>
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
