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
  subtitle: 'Sales and Solutions Architect enablement for the Elastic M-26-14 readiness pack',
  intro:
    'This enablement is designed around what an agency must demonstrate to satisfy M-26-14 and the maturity levels defined in CISA\'s Logging Reference Architecture. The sales enablement provides a synopsis of what changed from M-21-31 to M-26-14, how Elastic specifically readies agencies to adopt M-26-14, and framing questions that map to each main section auditors will ask. The SA enablement lets you climb from a one-slide talk track down into a scripted demo, the live cluster, and the product documentation, stopping at whatever depth the room wants.',
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
      ask: 'How sure are you that you can see every device out there, including the ones nobody enrolled or forgot about?',
      listenFor: 'They only trust the count for managed devices. Shadow IT, contractor laptops, or OT gear they cannot see.',
      value: 'Elastic finds the devices that have no agent at all and folds them into one inventory, which is exactly what the memo makes them document.',
      dealRead: 'Asset gaps are a Level 1 blocker, so this is often the fastest, most concrete pain to anchor a first deal on.',
    },
    sa: {
      concept:
        'A 60-endpoint fleet: 55 report via osquery, 5 unmanaged devices show up only through network discovery. Everything lands in m_26_14-assets as one canonical record per device.',
      talkTrack:
        'Start with the headline count, then the split. The interesting number is not "60 assets," it is "5 devices we found that have no agent." That is the gap M-26-14 makes you close. Then show it being closed: the live triage loop classifies every unknown device into a disposition (rogue, shadow-IT, new-but-uninventoried, decommissioned, needs-review) in the m_26_14-asset-triage ledger, each with a recommended, human-gated next step.',
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
      ask: 'Right now, how do you know a device is encrypted, managed, and running only approved software? Live view, or a quarterly spreadsheet?',
      listenFor: 'Audits run on spreadsheets, posture is a point-in-time scan, and drift gets caught late.',
      value: 'Elastic makes posture a live property of each device, so the gap between certified and actual shows the moment it opens.',
      dealRead: 'If they are doing this by hand, you are displacing manual labor, which is a clean ROI story.',
    },
    sa: {
      concept:
        'Four gap tiles: devices missing hardware inventory, software inventory, a confirmed encryption state, or MDM enrollment. Plus a drift dashboard that flags any device whose baseline fingerprint no longer matches.',
      talkTrack:
        'Click a gap tile, it opens Discover filtered to exactly those devices with names and last-seen times. This is what you hand the ISO instead of a spreadsheet. Then show drift: the system caught the change, not a quarterly audit.',
      technical:
        'osquery reports disk_encryption and installed software; Intune supplies MDM enrollment. m_26_14-asset-canonical-enrich recomputes each live fingerprint, then calls the m_26_14-asset-drift sub-pipeline, which compares it to the certified one via the m_26_14-asset-baseline-lookup enrich policy and sets m_26_14.drift_detected. The m_26_14-ws7-r3-unauth-software rule enforces the authorized catalog; m_26_14-ws7-r1/r2 rules watch OS and encryption drift.',
      live: [
        { label: 'HWAM Coverage Gaps', url: dash('m_26_14-hwam-gaps') },
        { label: 'SWAM Software Inventory', url: dash('m_26_14-swam-software') },
        { label: 'Config Drift & Readiness Posture', url: dash('m_26_14-asset-drift') },
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
      ask: 'With everything on your plate, how do you decide what to fix first? A gut call, or does something rank it for you?',
      listenFor: 'Alert overload, analysts triaging by hand, no real prioritization.',
      value: 'Elastic scores and ranks risk automatically from data they already collect, so the riskiest things float to the top on their own.',
      dealRead: 'Ties the readiness spend to daily SOC value, which helps justify budget beyond "we have to for the memo."',
    },
    sa: {
      concept:
        'The Entity Store resolves hosts, users, and services from all telemetry and assigns each a risk score driven by ML anomalies and alerts. Readiness fields from m_26_14-assets enrich the host entity so posture gaps influence risk.',
      talkTrack:
        'Open Entity Analytics and sort by risk. The top entities are where the ML anomalies and alerts concentrate. Point out that an asset flagged unmanaged or drifted in the earlier pillars is the same entity carrying elevated risk here. One model, not four tools.',
      technical:
        'Entity Store engines (host/user/service) run continuously and are enabled on this cluster. Risk scoring aggregates anomaly and alert contributions per entity. Asset readiness fields (hwam_source, drift_detected, element*_covered) enrich the host entity, so M-26-14 posture becomes a risk input.',
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
      ask: 'If an auditor asked you to prove you cover every required type of logging activity, how hard is that to pull together?',
      listenFor: 'Coverage is claimed but not provable, there are known blind spots, and producing evidence is a fire drill.',
      value: 'Elastic gives a coverage view an auditor can read at a glance, and drafts the gap document from live data.',
      dealRead: 'Attestation pain is deadline-driven and visible to leadership, so it is your strongest urgency lever.',
    },
    sa: {
      concept:
        '11 Appendix B categories shown as active detection rules and alert volume. Categories A, B, and H add ML anomaly detection. A coverage matrix scores each category on data, rules, and recent alerts.',
      talkTrack:
        'Walk the bars, then pivot to the matrix. Green means data plus rules plus alerts. That matrix is what the SA brings to the auditor. The ML claim is provable in the alerts list: the demo dataset stages an intrusion chain (a cryptominer on a Linux bastion, credential-dump tools on a Windows workstation, flows to never-seen countries, an off-baseline login surge) and every stage produced a live anomaly (record scores 93-99.9) and a real detection-engine alert. Then show the POA&M agent drafting a gap document from the same data.',
      technical:
        'Alerts pass through m_26_14-alert-category-pipeline for tagging; m_26_14-alert-coverage-daily rolls per-day counts. ML detection rules reinforce Cat A (auth anomalies, UEBA login), Cat B (DNS entropy, rare destination country), and Cat H (rare process, host-went-silent); seven of the eight wrap m_26_14_-prefixed Elastic Security ML module jobs. The m_26_14-poam-drafting-agent in Agent Builder queries coverage via the m_26_14-compliance-posture-esql-tool.',
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
      ask: 'How far back can you actually search your logs today, and what does keeping them that long cost you?',
      listenFor: 'They are stuck choosing between keeping data searchable and keeping it affordable, and storage cost hurts.',
      value: 'Elastic keeps months of logs immediately searchable at low storage cost, so they hit the retention rule without the trade-off.',
      dealRead: 'Maps straight to licensing and sizing, and the shorter M-26-14 window (12 months, down from the old 30) reframes the whole cost conversation. Your most direct commercial lever.',
    },
    sa: {
      concept:
        'Per-stream retention shown as hot (immediately searchable) versus full window including frozen. Deletion runs through a two-gate approval workflow with a snapshot precondition.',
      talkTrack:
        'Show searchable days versus total window, then the ILM policies that ship with the pack. Close on the two-gate workflow, the story auditors love, because deletion requires two humans and a confirmed snapshot.',
      technical:
        'ILM m_26_14-logs-l3-hot-frozen keeps 90 days hot then frozen to a 1-year window; m_26_14-logs-l4-hot-frozen keeps 180 days hot to a 1-year window. Retirement runs through gate1/gate2 watchers and Kibana Workflows, logging every action to m_26_14-retirement-requests.',
      live: [
        { label: 'Retention Readiness', url: dash('m_26_14-retention-compliance', 'now-30d') },
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
      ask: 'If someone challenged whether your logs had been tampered with, could you prove they had not?',
      listenFor: 'They store logs but have no tamper-evidence. "We assume they are intact."',
      value: 'Elastic hashes every log the moment it lands, so integrity is something they can prove, not just claim.',
      dealRead: 'Often an unrecognized gap, which makes it good for expanding scope once you are already in.',
    },
    sa: {
      concept:
        'Hash coverage shown by host. Every log document carries a SHA-256 in event.hash and a boolean event.integrity.hashed. Gaps in coverage are a readiness finding.',
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

export const REQUIREMENTS = {
  title: 'M-21-31 vs. M-26-14: What changed?',
  callout: {
    subsections: [
      {
        title: 'Retention requirements have been reduced and reframed',
        text: 'Logs must now be "actively searchable" for at least six months and retrievable for at least one year, down from M-21-31\'s 30-month total (12 active and 18 cold). The emphasis on searchability is significant; it\'s not enough to have logs in storage. They need to be readily findable and accessible when an investigation demands it.',
        aeCallout: 'In a SIEM use case, if the customer adopts the more relaxed standard, they can expect lower license cost due to the cold/frozen tier shrinking to 12 months of total retention instead of 30 months in M-21-31.',
      },
      {
        title: 'Readiness timelines are tighter and tied to the LRA',
        text: 'Under M-21-31, agencies had one year to reach EL1, 18 months for EL2, and two years for EL3, with timing measured from the memo\'s issuance date. M-26-14 resets that clock to the LRA publication date and compresses the window significantly: Level 1 within 120 days, Level 2 within 180 days, Level 3 within 320 days. Agencies also have 90 days from LRA publication to submit a formal Agency Logging Plan to both OMB and CISA.',
        aeCallout: 'Customers have to move faster to hit these compressed deadlines, so position Elastic aggressively as the technology that gets them to M-26-14 readiness.',
      },
      {
        title: 'The readiness cycle doesn\'t end at rollout',
        text: 'The LRA will be re-evaluated at least annually. Each update triggers new obligations: agencies have 30 days to update their logging plans and must reachieve maturity levels within 60 to 120 days. This turns M-26-14 readiness into an ongoing operational discipline rather than a one-time certification effort — one that enforces continuous monitoring and evaluation.',
        aeCallout: 'Customers will revisit their Elastic licensing on a tighter, annual turnaround to maintain readiness as the LRA is re-evaluated.',
      },
    ],
  },
}

export const HOW_ELASTIC_HELPS = {
  title: 'How Elastic Helps M-26-14 Readiness',
  intro:
    'Elastic addresses each requirement as a property of the data, not a periodic project. The same platform that collects the logs also proves coverage, retention, and integrity.',
  items: [
    {
      heading: 'Searchable data at scale',
      bullets: [
        'Hot tier for investigation, cheaper tiers for older logs',
        'Policy-based lifecycle retains affordably without losing retrievability',
        { text: '42–56% lower total cost than legacy (ESG study)', link: { phrase: 'ESG study', url: 'https://www.elastic.co/resources/security/report/analyze-economic-benefits-elastic-security' } },
      ],
      aeCallout: 'Lead with cost. Elastic hits the 12-month retention window at a fraction of legacy SIEM spend.',
    },
    {
      heading: 'Distributed data mesh architecture',
      bullets: [
        { text: 'Search logs in place via data mesh', link: { phrase: 'data mesh', url: 'https://www.elastic.co/industries/public-sector/data-mesh' } },
        'Keep data across cloud, on-prem, mission systems',
        'Proven on CISA CDM, ~100 federal agencies',
      ],
      aeCallout: 'Neutralizes rip-and-replace. Customers keep data where it lives, so no migration project blocks the deal.',
    },
    {
      heading: 'Unified, AI-powered CEM and THIRF',
      bullets: [
        'One layer for detection, investigation, and forensics',
        'Out-of-the-box AI skills triage, hunt, and detect',
        'Plain-language rules, MITRE ATT&CK auto-mapped',
      ],
      aeCallout: 'The AI story is the differentiator against rules-only SIEMs. Demo plain-language detection and prioritized attack narratives.',
    },
    {
      heading: 'Open standards',
      bullets: [
        'Native OpenTelemetry, no proprietary lock-in',
        'Collects from legacy, IoT, and OT sources',
        'Eases CISA and cross-agency data sharing',
      ],
      aeCallout: 'Answers lock-in head-on. OTel means no proprietary agent trap, de-risking the long-term commitment.',
    },
    {
      heading: "Integration with CISA's SIEM as a Service",
      bullets: [
        { text: "Powers CISA's SIEM-as-a-Service", link: { phrase: 'SIEM-as-a-Service', url: 'https://www.elastic.co/blog/siem-as-a-service' } },
        'Free to FCEB agencies in the cloud',
        'Agentic AI: triage, enrich, RAG, hunt, automate',
      ],
      aeCallout: "Strongest proof point: the customer's own cyber authority already runs Elastic. Use CISA adoption to shortcut trust.",
    },
  ],
}

export const CAPSTONE = {
  id: 'maturity',
  question: 'The full picture',
  shortTitle: 'Maturity Overview',
  headline: 'One executive view, fed automatically by every pipeline underneath it.',
  soundbite: 'The same transforms, rules, ML jobs, and watchers that power every dashboard roll up into the view the ISSO opens every morning.',
  points: [
    '7 ML anomaly-detection jobs tracking maturity signals (including passive new-network-device discovery for OT/IoT), plus ML detection rules for Cat A, B, and H.',
    '6 ES Watchers enforcing two-gate data retirement, JIT privileged-access expiry, and legal-hold copy.',
    '3 AI agents in Agent Builder: POA&M drafting, threat investigation, and after-action reporting, each wired to ES|QL tools.',
  ],
  live: [{ label: 'Maturity Overview', url: dash('m_26_14-maturity-overview', 'now-30d') }],
}
