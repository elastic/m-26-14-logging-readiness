// Central registry of every component shown in any diagram.
// Each entry powers the right-side detail drawer.

export const COMPONENTS = {
  sources: {
    name: 'Log Sources',
    product: 'Endpoints, Servers, Cloud, Network, IAM, Apps',
    color: 'gray',
    euiIcon: 'documents',
    role:
      'Federal agency systems that emit logs: endpoints (Windows, Linux, macOS), servers, cloud control planes (AWS CloudTrail, Azure Activity, GCP Audit), network devices (firewall, IDS, DNS), identity providers (Okta, Entra ID, Active Directory), and mission applications.',
    requirement:
      'M-26-14 Appendix A: agencies must enumerate and inventory all log-producing systems. Appendix B enumerates the categories of events that must be captured (authentication, process execution, file access, network flow, configuration change, etc.).',
    config:
      'Maintain the system inventory in your Agency Logging Plan. Tag each source with its M-26-14 event category so coverage gaps are visible in Fleet.',
    docs: [
      { label: 'Elastic integrations catalog', url: 'https://www.elastic.co/integrations' },
      { label: 'M-26-14 Appendix B (event categories)', url: 'https://www.whitehouse.gov/omb/' },
    ],
  },

  legacySources: {
    name: 'Legacy / OT Sources',
    product: 'Syslog, SNMP, OT/ICS protocols',
    color: 'gray',
    euiIcon: 'flag',
    role:
      'Systems that cannot run an Elastic Agent: legacy syslog devices, SNMP-only network gear, OT/ICS controllers, vendor appliances. Forwarded to a Logstash collector for protocol translation and parsing.',
    requirement:
      'M-26-14 does not exempt legacy or OT systems. They must still be covered by the logging program even if collection is indirect.',
    config:
      'Place Logstash at a network DMZ that can reach both the OT segment and the Elastic ingest pipeline. Document any sampling or filtering in your Logging Plan.',
    docs: [
      { label: 'Logstash syslog input', url: 'https://www.elastic.co/guide/en/logstash/current/plugins-inputs-syslog.html' },
    ],
  },

  elasticAgent: {
    name: 'Elastic Agent',
    product: 'Elastic Agent + Integrations',
    color: 'teal',
    euiIcon: 'logoBeats',
    role:
      'Single unified agent that collects logs and metrics via 300+ prebuilt integrations. Normalizes events to ECS (Elastic Common Schema) at the edge so downstream detection and search are consistent across data sources.',
    requirement:
      'M-26-14: primary log collection mechanism. ECS normalization satisfies the requirement that logs be usable across agencies and for CISA/FBI sharing without bespoke translation.',
    config:
      'Use `elastic-agent.yml` integration policies managed via Fleet. Enable NTP sync validation (USNO/NIST traceable per M-26-14). Pin agent versions per environment.',
    docs: [
      { label: 'Elastic Agent docs', url: 'https://www.elastic.co/guide/en/fleet/current/elastic-agent-installation.html' },
      { label: 'ECS reference', url: 'https://www.elastic.co/guide/en/ecs/current/index.html' },
    ],
  },

  fleetServer: {
    name: 'Fleet Server',
    product: 'Fleet Server',
    color: 'teal',
    euiIcon: 'gear',
    role:
      'Control plane for Elastic Agent: manages agent enrollment, distributes integration policies, and orchestrates agent upgrades. Does NOT sit in the data path — logs flow directly from agents to Elasticsearch.',
    requirement:
      'M-26-14 requires centralized visibility into agent coverage — this is the "system inventory" element of the Logging Maturity Model. Fleet shows which systems are enrolled, healthy, and current.',
    config:
      'Run Fleet Server on dedicated nodes; do not co-locate with hot Elasticsearch. Use Fleet UI agent policies as the source of truth (avoid manual `elastic-agent.yml` edits).',
    docs: [
      { label: 'Fleet & Elastic Agent guide', url: 'https://www.elastic.co/guide/en/fleet/current/fleet-overview.html' },
    ],
  },

  logstash: {
    name: 'Logstash',
    product: 'Logstash (optional)',
    color: 'teal',
    euiIcon: 'logoLogstash',
    optional: true,
    role:
      'Optional pipeline tier. Use for legacy syslog ingestion, OT protocol translation, complex ETL, or buffering bursts. Can sit between sources and Elasticsearch, or augment an Elastic Agent stream.',
    requirement:
      'M-26-14 treats Logstash as an acceptable alternative or supplement to Elastic Agent — what matters is that the data lands in the searchable/retrievable tiers correctly.',
    config:
      'Enable persistent queues to prevent data loss during downstream outages. Output to an Elasticsearch ingest pipeline so ECS normalization is applied centrally.',
    docs: [
      { label: 'Logstash persistent queues', url: 'https://www.elastic.co/guide/en/logstash/current/persistent-queues.html' },
    ],
  },

  ingestPipelines: {
    name: 'Ingest Pipelines',
    product: 'Elasticsearch ingest pipelines + Logstash filters',
    color: 'teal',
    euiIcon: 'pipelineApp',
    role:
      'Pre-storage enrichment and routing layer. Uses Elasticsearch ingest processors (drop, script, remove, geoip, set) and Logstash filter plugins to drop low-value events, sample high-volume streams, redact sensitive fields, enrich with asset and identity context, and route copies to multiple destinations. Typically achieves 40–60% volume reduction before data reaches the searchable tier.',
    requirement:
      'M-26-14 supports cost-effective implementations. Reducing volume before storage lowers the hot/cold footprint without sacrificing the events that matter for CEM and THIRF.',
    config:
      'Apply redaction processors BEFORE indexing — sensitive data must never land unredacted on disk. Keep a separate full-fidelity path to the snapshot repo for THIRF where redaction would interfere with investigation. Define pipelines as versioned artifacts and attach them to index templates.',
    docs: [
      { label: 'Elasticsearch ingest pipelines', url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/ingest.html' },
      { label: 'Logstash filter plugins', url: 'https://www.elastic.co/guide/en/logstash/current/filter-plugins.html' },
    ],
  },

  sensitiveDataProtection: {
    name: 'Sensitive Data Protection',
    product: 'Elasticsearch ingest + access controls',
    color: 'coral',
    euiIcon: 'lock',
    role:
      'Runs in the ingest pipeline, before data is written to any storage tier. Applies equally to hot, cold, frozen, and snapshot data. Pipeline-level controls prevent sensitive values from ever landing on disk; access-level controls restrict who can see them after the fact. Most agencies use both.',
    requirement:
      'M-26-14 Appendix A — agencies SHALL implement controls to safeguard potentially sensitive information in logs. This requirement applies across all maturity levels (L1 – L4); it is a constant baseline, not a level-specific feature.',
    config:
      'Elastic-native capabilities — combine as needed:\n' +
      '• Redact processor — pattern-based field redaction at ingest (regex / Grok patterns).\n' +
      '• NER via ELSER / inference processor — Named Entity Recognition using Elastic\'s built-in ML models to detect names, locations, SSNs, etc.\n' +
      '• Anonymization processor — hash or replace PII values deterministically (consistent across docs).\n' +
      '• Field-level security — role-based field visibility in Elasticsearch.\n' +
      '• Document-level security — query-based access control on documents.\n\n' +
      'Pipeline-level controls (redact, NER, anonymization) run BEFORE indexing; access-level controls (FLS, DLS) restrict visibility AFTER. Maintain redaction patterns and NER models as versioned artifacts reviewed by the privacy office.',
    docs: [
      { label: 'Redact processor', url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/redact-processor.html' },
      { label: 'Inference processor (ELSER, NER)', url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/inference-processor.html' },
      { label: 'Field-level + document-level security', url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/field-and-document-access-control.html' },
    ],
  },

  hotTier: {
    name: 'Hot Tier',
    product: 'Elasticsearch — hot data nodes',
    color: 'orange',
    tierKey: 'hot',
    euiIcon: 'logoElasticsearch',
    role:
      'Fast SSD-backed Elasticsearch nodes that handle ingest, indexing, and immediate query. Newest data lives here. At L1/L2 the hot tier is intentionally tiny (~1 day) because M-26-14 does NOT require searchable data at those levels; at L3+ the hot tier holds ~3 days of the hottest data.',
    requirement:
      'M-26-14: a minimal hot footprint is fully compliant at L1/L2 because "searchable" is not yet required. At L3+ the hot tier carries the freshest 3 days; the cold tier and frozen searchable snapshots together cover the ≥ 6-month searchable obligation.',
    config:
      'ILM phase: `hot`. Roll over at the smaller of 50 GB or 1 day (L1/L2) / 3 days (L3+). Set `index.routing.allocation.require._tier_preference: data_hot`.',
    docs: [
      { label: 'ILM phases', url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/ilm-index-lifecycle.html' },
    ],
  },

  coldTier: {
    name: 'Cold Tier',
    product: 'Elasticsearch — cold data nodes',
    color: 'blue',
    tierKey: 'cold',
    euiIcon: 'logoElasticsearch',
    role:
      'Cheaper-storage Elasticsearch nodes holding fully searchable data for ~7 days after rollover from hot. Indices are read-only and may be backed by searchable snapshots for storage efficiency while remaining directly queryable.',
    requirement:
      'M-26-14 Appendix B: "actively searchable for a minimum of 6 months." The cold tier handles days 4–10 of the searchable window; the frozen tier (via mounted searchable snapshots) carries the remainder out to 6/12 months.',
    config:
      'ILM phase: `cold`. Set `index.routing.allocation.require._tier_preference: data_cold`. Optionally back with a `mounted_searchable_snapshot` action to keep on object storage while still searchable.',
    docs: [
      { label: 'Data tiers', url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/data-tiers.html' },
    ],
  },

  frozenTier: {
    name: 'Frozen Tier',
    product: 'Elasticsearch — frozen data nodes (searchable snapshots)',
    color: 'purple',
    tierKey: 'frozen',
    euiIcon: 'logoElasticsearch',
    role:
      'Frozen nodes hold only a small local cache; the actual index data lives in an S3-compatible object store as a mounted searchable snapshot. Queries are slower but data remains directly queryable in Kibana without a separate thaw step. At L1/L2 acts as a ~1-day cache; at L3+ it carries the bulk of the searchable window (6 or 12 months).',
    requirement:
      'L1/L2: frozen-tier data is "retrievable" — it backs the snapshot repo for the 6-month minimum. L3+: frozen via mounted searchable snapshots is treated as SEARCHABLE because Kibana queries it directly. Combined with hot (3d) + cold (7d), this covers the ≥ 6-month CEM and ≥ 12-month THIRF windows.',
    config:
      'ILM phase: `frozen`. Requires a snapshot repository configured before ILM transitions assign indices to frozen. Local cache size ~10% of dataset is typical; tune `xpack.searchable.snapshot.shared_cache.size` per node.',
    docs: [
      { label: 'Searchable snapshots', url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/searchable-snapshots.html' },
    ],
  },

  ilm: {
    name: 'ILM + SLM Policy',
    product: 'Index Lifecycle Management + Snapshot Lifecycle Management',
    color: 'green',
    euiIcon: 'indexManagementApp',
    role:
      'ILM automates index transitions across Hot → Cold (L3+) → Frozen → Delete. SLM runs scheduled snapshots into the object-store repo and prunes expired snapshots. Together they enforce M-26-14 retention without human intervention.',
    requirement:
      'M-26-14 readiness requires demonstrable, auditable retention. ILM/SLM policies ARE the audit artifact — they prove how long data lived in each state.',
    config:
      'SLM: schedule daily snapshots, set `retention.expire_after` to `180d` (6-month) or `365d` (12-month). ILM: align phase durations with the policy.',
    docs: [
      { label: 'ILM overview', url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/index-lifecycle-management.html' },
      { label: 'SLM overview', url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/snapshot-lifecycle-management.html' },
    ],
  },

  snapshot6mo: {
    name: 'Snapshot Repo — 6 month',
    product: 'AWS S3 / Azure Blob / GCS — unmounted searchable snapshot repo',
    color: 'gray',
    dashed: true,
    euiIcon: 'logoCloud',
    role:
      'Unmounted snapshot repository. Snapshots sit in object storage and consume ZERO Elasticsearch memory or CPU until explicitly mounted. To investigate, mount as a searchable snapshot index on the frozen tier.',
    requirement:
      'M-26-14: satisfies the 6-month retrievable minimum at L1/L2. "Retrievable" expressly permits intermediate steps like thawing.',
    config:
      'Thaw via `POST /_snapshot/{repo}/{snapshot}/_restore` or mount as a searchable snapshot index. Use an SLM policy with `retention.expire_after: 180d`. Repo type: `s3`, `azure`, or `gcs`. Enable repository encryption with agency-managed keys.',
    docs: [
      { label: 'S3 repository plugin', url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/repository-s3.html' },
    ],
  },

  snapshot12mo: {
    name: 'Snapshot Repo — 12 month',
    product: 'AWS S3 / Azure Blob / GCS — unmounted searchable snapshot repo',
    color: 'gray',
    dashed: true,
    euiIcon: 'logoCloud',
    role:
      'Same shape as the 6-month repo but with extended retention to cover THIRF investigations that look back 12 months. Optional at L1/L2, required at L3+.',
    requirement:
      'M-26-14 Appendix B: 12-month retrievable retention supports Threat Hunting, Investigation, Response, and Forensics workflows that span seasonal patterns.',
    config:
      'Separate SLM policy with `retention.expire_after: 365d`. Keep this repo distinct from the 6-month repo so retention can be reasoned about and audited independently.',
    docs: [
      { label: 'SLM API', url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/snapshot-lifecycle-management-api.html' },
    ],
  },

  kibana: {
    name: 'Kibana / Elastic Security SIEM',
    product: 'Kibana + Elastic Security',
    color: 'coral',
    euiIcon: 'logoSecurity',
    role:
      'Primary SOC interface. Provides the Detection Engine (prebuilt + custom rules), Alerts, Cases, Timeline for investigation, Discover for ad-hoc log search, and the Fleet UI for agent management.',
    requirement:
      'M-26-14: the agency SOC must have access to logs. Kibana satisfies this for both CEM (searchable) and THIRF (retrievable after mount).',
    config:
      'Configure SSO via SAML/OIDC to your IdP. Define spaces per mission area; use role-based field-level security to mirror data classification.',
    docs: [
      { label: 'Elastic Security', url: 'https://www.elastic.co/guide/en/security/current/index.html' },
      { label: 'Kibana role-based access', url: 'https://www.elastic.co/guide/en/kibana/current/xpack-security-authorization.html' },
    ],
  },

  mlNodes: {
    name: 'ML Nodes',
    product: 'Elasticsearch — ML node pool',
    color: 'cyan',
    tierKey: 'ml',
    euiIcon: 'machineLearningApp',
    role:
      'Dedicated compute pool for Elastic Machine Learning jobs (anomaly detection, data frame analytics). RAM per node scales with size tier (15 / 30 / 60 GB). Three nodes deployed across three AZs for HA, even at L1/L2 where ML workloads are not yet active.',
    requirement:
      'M-26-14: provisioning ML capacity up-front lets agencies enable AI/ML enrichment when they advance to L3+ without re-architecting. ML nodes are part of the standard Elastic Cloud deployment template.',
    config:
      'Instance type `m5dn`. RAM = `mlNodeRamGB` for the size. Reserve 50% of RAM for the JVM heap; the rest is used by ML processes. Bind detection jobs to indices on cold + frozen tiers for 6+ months of baseline data.',
    docs: [
      { label: 'ML node sizing', url: 'https://www.elastic.co/guide/en/machine-learning/current/setup.html' },
    ],
  },

  masterNodes: {
    name: 'Master Nodes',
    product: 'Elasticsearch — dedicated master-eligible nodes',
    color: 'gray',
    tierKey: 'master',
    euiIcon: 'logoElasticsearch',
    role:
      'Dedicated master-eligible nodes manage the cluster state, shard allocation, and node membership. Three nodes deployed across three AZs to maintain quorum during a single-AZ failure.',
    requirement:
      'M-26-14: cluster resilience is foundational. Dedicated masters keep the control plane independent of data-plane load.',
    config:
      'Instance type `c7gd`. RAM 45 GB fixed across all size tiers — master overhead does not scale with ingest. Set `node.roles: [master]` only; do not co-locate data roles.',
    docs: [
      { label: 'Dedicated master nodes', url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/modules-node.html#dedicated-master-node' },
    ],
  },

  kibanaNodes: {
    name: 'Kibana Instances',
    product: 'Kibana — frontend instances',
    color: 'pink',
    tierKey: 'kibana',
    euiIcon: 'logoKibana',
    role:
      'Kibana frontend instances serve the SOC UI: Discover, Dashboards, Detection Engine, Cases, Fleet UI. Three instances across three AZs behind a load balancer for HA.',
    requirement:
      'M-26-14: SOC access to logs must remain available during single-AZ failures. Multiple Kibana instances behind a load balancer is the standard pattern.',
    config:
      'Instance type `c7gd`. RAM 30 GB fixed across all size tiers — Kibana memory needs are driven by concurrent users and saved-object volume, not log ingest rate.',
    docs: [
      { label: 'Kibana production deployment', url: 'https://www.elastic.co/guide/en/kibana/current/production.html' },
    ],
  },

  ml: {
    name: 'AI/ML Enrichment',
    product: 'Elastic Machine Learning',
    color: 'cyan',
    euiIcon: 'machineLearningApp',
    role:
      'Elastic ML jobs running behavioral baselines: anomaly detection (single/multi-metric), population analysis (peer-group comparison for UBA/UEBA), rare-term detection (IOC surfacing), and lateral-movement detection. Scores events before they reach the SIEM detection engine.',
    requirement:
      'M-26-14 Appendix B items g and h: support for IOC monitoring and behavioral anomaly detection. Required component of the L3+ architecture.',
    config:
      'Job types: `anomaly_detector`, `data_frame_analytics`. Bind ML jobs across the cold and frozen tiers so they have 6+ months of data to baseline against. Tune severity thresholds to keep alert volume manageable.',
    docs: [
      { label: 'Elastic ML overview', url: 'https://www.elastic.co/guide/en/machine-learning/current/index.html' },
    ],
  },

  iocMatching: {
    name: 'IOC Matching (STIX/TAXII)',
    product: 'Elastic Security threat intel module',
    color: 'purple',
    euiIcon: 'securitySignal',
    role:
      'Threat intelligence pipeline. Ingests STIX/TAXII feeds — including the CISA Known Exploited Vulnerabilities (KEV) catalog and commercial threat-intel — and matches indicators against incoming events in near real time.',
    requirement:
      'M-26-14 Appendix B item g: "monitoring, detecting, and hunting for known indicators of compromise."',
    config:
      'Enable the Threat Intelligence integration in Fleet. Map indicator fields to ECS `threat.*` fields so detections can correlate cleanly.',
    docs: [
      { label: 'CISA KEV catalog', url: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog' },
      { label: 'Elastic threat intel', url: 'https://www.elastic.co/guide/en/security/current/threat-intel-integrations.html' },
    ],
  },

  alertCorrelator: {
    name: 'Alert Correlator / Risk Scoring',
    product: 'Elastic Security Detection Engine + risk scoring',
    color: 'coral',
    euiIcon: 'bell',
    role:
      'Combines signals from ML anomalies, IOC matches, and rule-based detections into a single risk score per host / user. Feeds prioritized alerts into the SIEM workflow instead of raw firehose.',
    requirement:
      'M-26-14 expects detection effectiveness, not just collection. Risk scoring is how the maturity model differentiates Level 3 (advanced) from earlier levels.',
    config:
      'Use Elastic Security entity analytics (host/user risk score). Configure detection rules with `risk_score` and severity aligned to the agency incident-response runbook.',
    docs: [
      { label: 'Entity analytics', url: 'https://www.elastic.co/guide/en/security/current/entity-risk-scoring.html' },
    ],
  },

  cisaExport: {
    name: 'CISA / FBI Export Path',
    product: 'Elasticsearch API + documented procedure',
    color: 'coral',
    dashed: true,
    euiIcon: 'exportAction',
    role:
      'On-request log export channel for CISA and FBI during known or suspected compromise. The mechanism (format, transport, point of contact, scope) must be pre-agreed and documented BEFORE an incident occurs.',
    requirement:
      'M-26-14 Log Access Requirements: agencies SHALL provide logs to CISA and FBI upon request during an incident. The "figure it out at 3 AM" failure mode is what this requirement exists to prevent.',
    config:
      'Create a dedicated Elastic API key with read-only access to relevant indices. Document export procedure (NDJSON over secure channel, signed manifest) in the Agency Logging Plan. Test annually.',
    docs: [
      { label: 'CISA reporting', url: 'https://www.cisa.gov/report' },
      { label: 'ES create API key', url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/security-api-create-api-key.html' },
    ],
  },

  ccs: {
    name: 'Federated Search (CCS)',
    product: 'Elasticsearch Cross-Cluster Search',
    color: 'teal',
    euiIcon: 'crossClusterReplicationApp',
    role:
      'Lets the top-level agency SOC query remote Elasticsearch clusters in place — sub-agencies, cloud regions, OT enclaves — without physically replicating all data to a central SIEM. Reduces duplication while preserving central visibility.',
    requirement:
      'M-26-14: "Log storage may be decentralized; however, logs must be readily available to the top-level agency SOC." CCS is the canonical way to satisfy this at Level 4.',
    config:
      'Configure remote cluster connections in `elasticsearch.yml` or via the cluster settings API. Query with the `{remote_cluster}:{index_pattern}` syntax. Use API keys for cross-cluster auth.',
    docs: [
      { label: 'Cross-cluster search', url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/modules-cross-cluster-search.html' },
    ],
  },

  ccr: {
    name: 'Cross-Cluster Replication (CCR)',
    product: 'Elasticsearch CCR',
    color: 'teal',
    optional: true,
    euiIcon: 'crossClusterReplicationApp',
    role:
      'Optional alternative or complement to CCS. Replicates selected indices to a central cluster for resilience or readiness-driven full visibility. Use when query latency or sub-agency cluster availability is a concern.',
    requirement:
      'M-26-14 permits replication-based topologies provided retention and access requirements are still met at every replica.',
    config:
      'Define `follower_index` per critical leader index. Replication is async — design alerts to tolerate small replication lag.',
    docs: [
      { label: 'CCR overview', url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/xpack-ccr.html' },
    ],
  },

  onPremStore: {
    name: 'On-Prem Cold/Frozen Store',
    product: 'Self-managed Elasticsearch (cold + frozen tiers)',
    color: 'green',
    euiIcon: 'logoElasticsearch',
    role:
      'Agency-operated Elasticsearch cluster handling sensitive workloads that cannot leave on-prem infrastructure. Holds its own cold and frozen tiers and is federated into the central SOC via CCS.',
    requirement:
      'M-26-14 permits decentralized storage. On-prem instances are common for classified or high-impact systems where data sovereignty is a hard constraint.',
    config:
      'Sized per the on-prem workload. Make sure ILM and SLM policies match the central standard so retention behavior is uniform across the federation.',
    docs: [
      { label: 'Self-managed deployment', url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/setup.html' },
    ],
  },

  cloudCold: {
    name: 'Cloud Cold Tier (FedRAMP High)',
    product: 'Elastic Cloud on AWS GovCloud / Azure Government',
    color: 'green',
    euiIcon: 'logoCloud',
    role:
      'FedRAMP High Elastic Cloud deployment hosting searchable cold-tier data. Used for workloads suitable for FedRAMP-authorized commercial cloud, federated to the central SOC.',
    requirement:
      'M-26-14: cloud-resident logs must use FedRAMP-authorized environments at the appropriate impact level for the data classification.',
    config:
      'Verify the deployment region has the required FedRAMP authorization (High vs. Moderate). Enable BYOK with AWS KMS or Azure Key Vault per the agency key policy.',
    docs: [
      { label: 'Elastic Cloud FedRAMP', url: 'https://www.elastic.co/security/compliance/fedramp' },
    ],
  },

  cloudObjectStore: {
    name: 'Cloud Object Store',
    product: 'AWS S3 / Azure Blob / GCS',
    color: 'purple',
    euiIcon: 'logoAWS',
    role:
      'Long-term object storage backing both searchable snapshots (frozen tier) and unmounted snapshot repositories. The cheapest tier in the architecture and the one that carries the bulk of THIRF retention.',
    requirement:
      'M-26-14: appropriate for retrievable storage. Must be encrypted with agency-controlled keys (BYOK) at L4.',
    config:
      'Lifecycle rules: transition to colder object-store classes (Glacier, Archive) once snapshot age exceeds the searchable-snapshot mount window. Enable object lock for tamper resistance.',
    docs: [
      { label: 'S3 repository', url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/repository-s3.html' },
    ],
  },

  iotEdge: {
    name: 'IoT / OT Edge Collector',
    product: 'Elastic Agent / Logstash at the edge',
    color: 'gray',
    euiIcon: 'logoBeats',
    role:
      'Edge collector deployed near IoT, OT, or ICS systems. Buffers locally during connectivity loss, applies edge filtering, and forwards to the agency or cloud Elastic cluster.',
    requirement:
      'M-26-14 covers OT and IoT systems within agency control. The edge collector pattern keeps these systems in scope without exposing them directly to the broader network.',
    config:
      'Deploy on hardened minimal OS. Use signed update channels. Enable local persistent queue sized for the longest expected disconnection.',
    docs: [
      { label: 'Elastic Agent on edge', url: 'https://www.elastic.co/guide/en/fleet/current/installation.html' },
    ],
  },

  byok: {
    name: 'BYOK Encryption',
    product: 'AWS KMS / Azure Key Vault / GCP Cloud KMS',
    color: 'yellow',
    euiIcon: 'lock',
    role:
      'Agency-controlled key material protects data at rest across the snapshot repositories and cloud-resident tiers. Key rotation and revocation stay under agency control even when storage is cloud-resident.',
    requirement:
      'M-26-14 L4: BYOK is part of the optimized profile. Even at lower levels, encryption-at-rest with documented key management is expected.',
    config:
      'Customer-managed CMKs per environment. Audit key usage through the cloud provider audit log (CloudTrail / Azure Activity / Cloud Audit Logs).',
    docs: [
      { label: 'AWS KMS', url: 'https://docs.aws.amazon.com/kms/' },
      { label: 'Azure Key Vault', url: 'https://learn.microsoft.com/azure/key-vault/' },
    ],
  },

  ntp: {
    name: 'NTP Time Sync',
    product: 'USNO / NIST traceable NTP',
    color: 'yellow',
    euiIcon: 'clock',
    role:
      'Authoritative time source for all agents, collectors, and Elasticsearch nodes. Without traceable time, log correlation and forensic timelines are unreliable.',
    requirement:
      'M-26-14 L4: time synchronization must be traceable to USNO or NIST. Agents validate clock skew at startup and on a schedule.',
    config:
      'Configure chrony or w32time against USNO / NIST pool. Set Elastic Agent to alert on skew > 1 second. Review skew dashboard during incident triage.',
    docs: [
      { label: 'NIST Internet Time Service', url: 'https://www.nist.gov/pml/time-and-frequency-division/time-distribution/internet-time-service-its' },
    ],
  },

  soc: {
    name: 'Agency SOC',
    product: 'Top-level agency Security Operations Center',
    color: 'coral',
    euiIcon: 'logoSecurity',
    role:
      'The agency’s central security operations team. At L4 sits at the hub of a federated topology with spoke connections to every distributed log store, querying them via Cross-Cluster Search.',
    requirement:
      'M-26-14 Log Access Requirements: the top-level agency SOC must be able to reach all agency logs (directly or federated), and must coordinate with CISA/FBI during incidents.',
    config:
      'Document the spoke inventory and the auth path to each remote cluster. Test the CISA/FBI export at least annually.',
    docs: [
      { label: 'CISA SOC guidance', url: 'https://www.cisa.gov/' },
    ],
  },
}
