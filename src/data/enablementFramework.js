// M-26-14 enablement framework.
//
// Single source of truth for the Sales and SA enablement pages. The structure
// mirrors the Self-Guided Walkthrough (public/docs/demo-guide.md): the questions
// an auditor actually asks, plus a capstone. Each pillar carries:
//   sales — the Elastic unique value proposition for that question
//   sa    — a depth ladder the SA can climb only as far as the room wants:
//           slide (stay high-level, animated) -> demo (scripted Instruqt) ->
//           live (drive the real cluster) -> docs (Elastic documentation)
//
// Live cluster and doc URLs are verified against the deployed pack and the
// published Elastic docs. Values that are data-driven (counts) are described
// qualitatively so a reseed does not make this page wrong.

const KB = 'https://m-26-14-7ae75d.kb.us-east-1.aws.found.io'
const DOCS = 'https://www.elastic.co'

const dash = (id, g = 'now-90d') =>
  `${KB}/app/dashboards#/view/${id}?_g=(time:(from:${g},to:now))`

export const HUB = {
  title: 'M-26-14 Enablement',
  subtitle: 'Sales and Solutions Architect enablement for the Elastic M-26-14 compliance pack',
  intro:
    'Everything here is built on one spine: the questions an auditor actually asks about M-26-14. ' +
    'Sales enablement frames the unique value Elastic brings to each. SA enablement lets you climb from a ' +
    'one-slide talk track down into a scripted demo, the live cluster, and the product documentation, ' +
    'stopping at whatever depth the room wants.',
  tracks: [
    {
      id: 'sales',
      to: '/enablement/sales',
      label: 'Sales Enablement',
      tagline: 'The unique value Elastic brings to M-26-14',
      for: 'Account teams, sellers, and anyone carrying the message',
      accent: 'teal',
    },
    {
      id: 'sa',
      to: '/enablement/sa',
      label: 'SA Enablement',
      tagline: 'Every part of the framework, expandable to any depth',
      for: 'Solutions Architects running discovery, demos, and deep dives',
      accent: 'blue',
    },
    {
      id: 'walkthrough',
      to: '/demo-guide',
      label: 'Self-Guided Walkthrough',
      tagline: 'The live cluster, dashboard by dashboard',
      for: 'Customers exploring on their own',
      accent: 'teal',
    },
  ],
}

export const PILLARS = [
  {
    id: 'know-your-network',
    number: 1,
    question: 'Do you know everything on your network?',
    shortTitle: 'Asset Visibility',
    memoRef: 'Element 1 · HWAM · Appendix B (coverage)',
    anim: 'AssetDiscoveryAnim',
    sales: {
      headline: 'You cannot protect what you cannot see, and most tools only see what already has an agent.',
      soundbite: 'Elastic finds the devices that have no agent at all, then merges them into one record with the ones that do.',
      uvp: [
        'Agent and agentless in a single index. osquery on managed endpoints plus passive network discovery for the unmanaged, resolved into one canonical asset record.',
        'Entity resolution deduplicates a device seen by osquery and by Intune into a single posture record, not two rows to reconcile by hand.',
        'Schema-on-write (ECS) means every asset is queryable the moment it lands. No rebuild, no CMDB reconciliation project.',
      ],
      wedge:
        'Competitors index what you already ship them. They are blind to the endpoint that never enrolled. Elastic surfaces the unknown device as a first-class finding, which is exactly what Element 1 requires you to document.',
    },
    sa: {
      concept:
        'A 60-endpoint fleet: 55 report via osquery, 5 unmanaged devices show up only through network discovery. Everything lands in m_26_14-assets as one canonical record per device.',
      talkTrack:
        'Start with the headline count, then the split. The interesting number is not "60 assets," it is "5 devices we found that have no agent." That is the gap M-26-14 makes you close.',
      technical:
        'Managed endpoints run Elastic Agent with the Fleet osquery integration. Results flow through m_26_14-asset-normalize, then m_26_14-asset-canonical-enrich, and the m_26_14-asset-entity-resolution continuous transform writes the deduplicated record to m_26_14-assets. The 5 unmanaged devices arrive via network discovery carrying only what a scan can observe.',
      live: [
        { label: 'HWAM Asset Inventory Overview', url: dash('m_26_14-hwam-overview') },
        { label: 'Asset Lifecycle', url: dash('m_26_14-hwam-lifecycle') },
      ],
      demo: { title: 'Asset discovery click-through', status: 'planned', url: null },
      docs: [
        { label: 'Osquery Manager integration', url: `${DOCS}/docs/reference/integrations/osquery_manager` },
        { label: 'Entity analytics (Entity Store)', url: `${DOCS}/docs/solutions/security/advanced-entity-analytics` },
        { label: 'Entity Analytics dashboard', url: `${DOCS}/docs/solutions/security/dashboards/entity-analytics-dashboard` },
      ],
    },
  },
  {
    id: 'healthy-and-authorized',
    number: 2,
    question: 'Is every device healthy and authorized?',
    shortTitle: 'Posture & Drift',
    memoRef: 'Element 1 & 2 · HWAM/SWAM · config baseline',
    anim: null,
    sales: {
      headline: 'The compliance audit spreadsheet is dead. Posture is a live query.',
      soundbite: 'Encryption, MDM, authorized software, and config drift are computed continuously at ingest, not scanned once a quarter.',
      uvp: [
        'Posture is a field, not a project. Every device carries its encryption state, MDM enrollment, software authorization, and a baseline fingerprint, recomputed on every check-in.',
        'A SHA-256 baseline hash captured at certification means drift is detected automatically the moment an OS, serial, or encryption state changes.',
        'Unauthorized software is caught by a detection rule that evaluates every new install against the approved catalog in real time. No batch scan, no manual comparison.',
      ],
      wedge:
        'Point tools give you a posture snapshot on the day they run. Elastic makes posture a continuous property of the data, so the gap between "certified" and "actual" is visible the instant it opens.',
    },
    sa: {
      concept:
        'Four gap tiles: devices missing hardware inventory, software inventory, a confirmed encryption state, or MDM enrollment. Plus a drift dashboard that flags any device whose baseline fingerprint no longer matches.',
      talkTrack:
        'Click a gap tile, it opens Discover filtered to exactly those devices with names and last-seen times. This is what you hand the ISO instead of a spreadsheet. Then show drift: the system caught the change, not a quarterly audit.',
      technical:
        'osquery reports disk_encryption and installed software; Intune supplies MDM enrollment. m_26_14-asset-canonical-enrich recomputes each live fingerprint and compares it to the certified one via the m_26_14-asset-baseline-lookup enrich policy, setting m_26_14.drift_detected. The m_26_14-ws7-r3-unauth-software rule enforces the authorized catalog; m_26_14-ws7-r1/r2 rules watch OS and encryption drift.',
      live: [
        { label: 'HWAM Coverage Gaps', url: dash('m_26_14-hwam-gaps') },
        { label: 'SWAM Software Inventory', url: dash('m_26_14-swam-software') },
        { label: 'Config Drift & Compliance Posture', url: dash('m_26_14-asset-drift') },
      ],
      demo: { title: 'Posture & drift click-through', status: 'planned', url: null },
      docs: [
        { label: 'Osquery Manager integration', url: `${DOCS}/docs/reference/integrations/osquery_manager` },
        { label: 'Security anomaly detection configurations', url: `${DOCS}/docs/reference/machine-learning/ootb-ml-jobs-siem` },
      ],
    },
  },
  {
    id: 'entity-risk',
    number: 3,
    question: 'Do you know which assets and identities carry the most risk?',
    shortTitle: 'Entity & Risk Scoring',
    memoRef: 'Entity Store · risk analytics',
    anim: null,
    sales: {
      headline: 'Thousands of assets, finite attention. Elastic scores the risk so you work the right ones first.',
      soundbite: 'Elastic builds the entity, scores its risk, and ranks it automatically, from the telemetry you are already collecting.',
      uvp: [
        'The Entity Store assembles a living host, user, and service model from every source. No manual correlation, no separate CMDB to reconcile.',
        'Risk scoring is automatic: ML anomalies and alerts roll up into a per-entity risk score, so the riskiest device or identity floats to the top on its own.',
        'Compliance posture feeds risk. An unmanaged, unencrypted, or drifted asset raises its own entity risk, tying M-26-14 gaps directly to prioritized action.',
      ],
      wedge:
        'Most tools hand you raw alerts and leave you to build the correlation. Elastic ships the entity model and the risk engine, so "what should I fix first" is answered by the platform, not a spreadsheet of severities.',
    },
    sa: {
      concept:
        'The Entity Store resolves hosts, users, and services from all telemetry and assigns each a risk score driven by ML anomalies and alerts. Compliance fields from m_26_14-assets enrich the host entity so posture gaps influence risk.',
      talkTrack:
        'Open Entity Analytics and sort by risk. The top entities are where the ML anomalies and alerts concentrate. Point out that an asset flagged unmanaged or drifted in the earlier pillars is the same entity carrying elevated risk here. One model, not four tools.',
      technical:
        'Entity Store engines (host/user/service) run continuously and are enabled on this cluster. Risk scoring aggregates anomaly and alert contributions per entity. Asset compliance fields (hwam_source, drift_detected, element*_covered) enrich the host entity, so M-26-14 posture becomes a risk input.',
      live: [
        { label: 'Entity Analytics (risk scores)', url: `${KB}/app/security/entity_analytics` },
      ],
      demo: { title: 'Entity & risk scoring click-through', status: 'planned', url: null },
      docs: [
        { label: 'Entity analytics', url: `${DOCS}/docs/solutions/security/advanced-entity-analytics` },
        { label: 'Monitor entity risk and anomalies', url: `${DOCS}/docs/solutions/security/advanced-entity-analytics/monitor-entity-risk` },
        { label: 'Entity Analytics dashboard', url: `${DOCS}/docs/solutions/security/dashboards/entity-analytics-dashboard` },
      ],
    },
  },
  {
    id: 'threat-detection',
    number: 4,
    question: 'Are you watching for threats across all Appendix B categories?',
    shortTitle: 'Detection Coverage',
    memoRef: 'Appendix B · 11 event categories',
    anim: null,
    sales: {
      headline: 'Coverage you can prove to an auditor, not just claim.',
      soundbite: 'All 11 Appendix B categories, with ML anomaly detection reinforcing the categories a static threshold would miss.',
      uvp: [
        'Detection across every Appendix B category, with a coverage matrix that turns "are we watching for this?" into a green/yellow/red answer an auditor can read.',
        'Machine learning where rules are not enough. Categories A, B, and H run anomaly detection that learns normal for this environment and flags genuine deviations.',
        'AI agents close the loop. The POA&M drafting agent queries live posture with ES|QL and drafts the gap document, no export needed.',
      ],
      wedge:
        'A rules-only SIEM tells you about the threats you already wrote a rule for. Elastic pairs rules with ML so the anomaly you did not anticipate still surfaces, and the coverage matrix is your attestation evidence.',
    },
    sa: {
      concept:
        '11 Appendix B categories shown as active detection rules and alert volume. Categories A, B, and H add ML anomaly detection. A coverage matrix scores each category on data, rules, and recent alerts.',
      talkTrack:
        'Walk the bars, then pivot to the matrix. Green means data plus rules plus alerts. That matrix is what the SA brings to the auditor. Then show the POA&M agent drafting a gap document from the same data.',
      technical:
        'Alerts pass through m_26_14-alert-category-pipeline for tagging; m_26_14-alert-coverage-daily rolls per-day counts. ML detection rules reinforce Cat A (auth), Cat B (DNS/C2), and Cat H (off-hours execution). The m_26_14-poam-drafting-agent in Agent Builder queries coverage via the m_26_14-compliance-posture-esql-tool.',
      live: [
        { label: 'Alert Coverage (Appendix B)', url: dash('m_26_14-alert-coverage', 'now-30d') },
        { label: 'Appendix B Coverage Matrix', url: dash('m_26_14-appendix-b-coverage', 'now-30d') },
        { label: 'Agent Builder (POA&M agent)', url: `${KB}/app/agent_builder/agents` },
      ],
      demo: { title: 'Detection coverage click-through', status: 'planned', url: null },
      docs: [
        { label: 'Anomaly detection in Elastic Security', url: `${DOCS}/docs/solutions/security/advanced-entity-analytics/anomaly-detection` },
        { label: 'Security anomaly detection configurations', url: `${DOCS}/docs/reference/machine-learning/ootb-ml-jobs-siem` },
        { label: 'Agent Builder built-in skills', url: `${DOCS}/docs/explore-analyze/ai-features/agent-builder/builtin-skills-reference` },
        { label: 'ES|QL tools in Agent Builder', url: `${DOCS}/docs/explore-analyze/ai-features/agent-builder/tools/esql-tools` },
      ],
    },
  },
  {
    id: 'data-retention',
    number: 5,
    question: 'Can you prove data is retained long enough?',
    shortTitle: 'Retention',
    memoRef: 'THIRF · retention · two-gate deletion',
    anim: null,
    sales: {
      headline: 'Six months of logs, immediately searchable, at a cost that does not force a trade-off.',
      soundbite: 'Hot and frozen tiers keep months of logs searchable at frozen-tier cost, and nothing gets deleted without two human approvals.',
      uvp: [
        'Searchable frozen tier changes the economics. Months of logs stay immediately queryable without a restore, at object-storage cost, which is how THIRF retention becomes affordable.',
        'ILM ships preconfigured with the pack, so hot-to-frozen transitions and total windows are governed policy, not a manual ops chore.',
        'Governed deletion. A two-gate, human-approved retirement workflow with a snapshot precondition means no single person or process can quietly delete compliance data.',
      ],
      wedge:
        'Others make you choose between keeping data searchable and keeping it affordable. Elastic frozen searchable snapshots give you both, and the two-gate workflow turns retention from a storage line item into provable governance.',
    },
    sa: {
      concept:
        'Per-stream retention shown as hot (immediately searchable) versus full window including frozen. Deletion runs through a two-gate approval workflow with a snapshot precondition.',
      talkTrack:
        'Show searchable days versus total window, then the ILM policies that ship with the pack. Close on the two-gate workflow, the story auditors love, because deletion requires two humans and a confirmed snapshot.',
      technical:
        'ILM m_26_14-logs-l3-hot-frozen keeps 90 days hot then frozen to a 1-year window; m_26_14-logs-l4-hot-frozen keeps 180 days hot to a 1-year window. Retirement runs through gate1/gate2 watchers and Kibana Workflows, logging every action to m_26_14-retirement-requests.',
      live: [
        { label: 'Retention Compliance', url: dash('m_26_14-retention-compliance', 'now-30d') },
      ],
      demo: { title: 'Retention & retirement click-through', status: 'planned', url: null },
      docs: [
        { label: 'Elasticsearch data tiers: hot to frozen', url: `${DOCS}/docs/manage-data/lifecycle/data-tiers` },
        { label: 'Searchable snapshots', url: `${DOCS}/docs/deploy-manage/tools/snapshot-and-restore/searchable-snapshots` },
        { label: 'Index lifecycle management phases', url: `${DOCS}/docs/manage-data/lifecycle/index-lifecycle-management/index-lifecycle` },
      ],
    },
  },
  {
    id: 'log-integrity',
    number: 6,
    question: 'Can you trust it? Have the logs been altered?',
    shortTitle: 'Log Integrity',
    memoRef: 'Element 5 · log integrity',
    anim: null,
    sales: {
      headline: 'Storing logs is table stakes. Proving they are unaltered is the compliance requirement.',
      soundbite: 'Every log is hashed the moment it lands, so tampering is detectable, not hypothetical.',
      uvp: [
        'A SHA-256 fingerprint is computed on every log document at ingest, before any enrichment, capturing the raw state.',
        'Any later modification breaks the hash, turning "we believe the logs are intact" into a check anyone can verify.',
        'Coverage is monitored. An ML job watches for hosts that stop hashing, so a silent gap becomes an alert instead of an audit surprise.',
      ],
      wedge:
        'Retention keeps the data; integrity proves it is the same data. Elastic does the hashing inline at ingest, so tamper-evidence is a property of every document, not a separate audit step bolted on later.',
    },
    sa: {
      concept:
        'Hash coverage shown by host. Every log document carries a SHA-256 in event.hash and a boolean event.integrity.hashed. Gaps in coverage are a compliance finding.',
      talkTrack:
        'Show hash coverage by host, then click a bar to open Discover on the raw hash values alongside the original fields. Note the ML job that catches a source going unexpectedly silent, so a gap is caught, not missed.',
      technical:
        'The m_26_14-log-integrity-hash pipeline computes a SHA-256 the moment a document arrives, writes it to event.hash, and flags event.integrity.hashed. It runs before enrichment so it captures the raw state. m_26_14-ml-e5-hash-drop monitors coverage across reporting hosts.',
      live: [
        { label: 'Log Management (Element 5)', url: dash('m_26_14-log-management', 'now-30d') },
      ],
      demo: { title: 'Log integrity click-through', status: 'planned', url: null },
      docs: [
        { label: 'Fingerprint processor', url: `${DOCS}/docs/reference/ingest-processor/fingerprint-processor` },
        { label: 'Ingest processor reference', url: `${DOCS}/docs/reference/ingest-processor` },
      ],
    },
  },
]

export const CAPSTONE = {
  id: 'maturity',
  question: 'The full picture',
  shortTitle: 'Maturity Overview',
  headline: 'One executive view, fed automatically by every pipeline underneath it.',
  soundbite: 'The same transforms, rules, ML jobs, and watchers that power every dashboard roll up into the view the ISSO opens every morning.',
  points: [
    '6 ML anomaly-detection jobs tracking maturity signals, plus ML detection rules for Cat A, B, and H.',
    '6 ES Watchers enforcing two-gate data retirement, JIT privileged-access expiry, and legal-hold copy.',
    '3 AI agents in Agent Builder: POA&M drafting, threat investigation, and after-action reporting, each wired to ES|QL tools.',
  ],
  live: [{ label: 'Maturity Overview', url: dash('m_26_14-maturity-overview', 'now-30d') }],
}
