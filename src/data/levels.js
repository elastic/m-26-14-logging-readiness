// Per-level metadata: deadlines, retention requirements, narrative.
//
// Threshold percentages (inventory, coverage, operations) are the canonical
// set shared with the Readiness Pack: elasticsearch/seed/m_26_14-config-seed.ndjson
// (runtime source of truth), the m_26_14-score-rollup-pipeline fallback and
// m-26-14-score.py, lint-checked by the pack build (review finding R-52).
// Change them there first; this file mirrors. Retention months are the memo's.
//
// Deadlines are exact (decisions doc F-1). The day counts are M-26-14's own
// deadline table; the start date is CISA's publication of the LRA on
// August 20, 2026 (the LRA carries no calendar dates itself):
// Agency Logging Plan November 18, 2026 (+90d), Level 1 December 18, 2026
// (+120d), Level 2 February 16, 2027 (+180d), Level 3 July 6, 2027 (+320d).

export const LRA_PUBLISHED = 'August 20, 2026'
export const LOGGING_PLAN_DUE = 'November 18, 2026'

export const LEVELS = [
  {
    id: 1,
    name: 'Initial (Level 1)',
    deadline: 'December 18, 2026 (LRA + 120 days)',
    dueDate: 'December 18, 2026',
    days: '120 days',
    searchable: null,
    retrievable: '≥ 6 months',
    metrics: {
      inventoryVisibility: '≥ 70%',
      collectionCoverage: '≥ 50% of assets',
      collectionOperations: '< 50% of baseline',
      logManagement: 'Stored',
    },
    summary:
      'Establishes the foundational logging baseline. Agencies must collect logs across all required Appendix B event categories and retain them in a retrievable state for a minimum of 6 months. No level-specific searchable (CEM) metric applies at this level, though the Appendix B six-month searchable baseline binds independently of maturity level (LRA Section 5.3). Agencies must also submit their Agency Logging Plan by November 18, 2026 (90 days from the August 20, 2026 LRA publication).',
    keyPoints: [
      'Collect all Appendix B event categories from applicable log sources.',
      'Retain logs in a retrievable state for a minimum of 6 months.',
      'No level-specific searchable (CEM) metric at this level; the Appendix B six-month searchable baseline still binds independently (LRA Section 5.3).',
      'Agency Logging Plan due November 18, 2026 (90 days from LRA publication).',
    ],
  },
  {
    id: 2,
    name: 'Intermediate (Level 2)',
    deadline: 'February 16, 2027 (LRA + 180 days)',
    dueDate: 'February 16, 2027',
    days: '180 days',
    searchable: null,
    retrievable: '≥ 12 months',
    metrics: {
      inventoryVisibility: '≥ 80% daily',
      collectionCoverage: '≥ 80% of assets',
      collectionOperations: '50–70% of baseline',
      logManagement: 'Stored + encrypted at rest',
    },
    summary:
      'Expands log source coverage and increases the retrievable retention window to 12 months. Agencies must achieve complete Appendix B log coverage and maintain a full asset and system inventory reflected in their logging pipeline. No level-specific searchable (CEM) metric applies at this level, though the Appendix B searchable baseline binds independently (LRA Section 5.3).',
    keyPoints: [
      'Full coverage of all Appendix B log categories with no gaps.',
      'Complete asset and system inventory must be reflected in collected logs.',
      'Retain logs in a retrievable state for a minimum of 12 months.',
      'No level-specific searchable (CEM) metric at this level; the Appendix B six-month searchable baseline still binds independently (LRA Section 5.3).',
    ],
  },
  {
    id: 3,
    name: 'Advanced (Level 3)',
    deadline: 'July 6, 2027 (LRA + 320 days)',
    dueDate: 'July 6, 2027',
    days: '320 days',
    searchable: '≥ 3 months',
    retrievable: '≥ 12 months',
    metrics: {
      inventoryVisibility: '≥ 90% daily',
      collectionCoverage: '≥ 90% of assets',
      collectionOperations: '≥ 70% of baseline',
      logManagement: 'Encrypted transit + rest, regularly hashed',
    },
    summary:
      'Introduces the CEM searchable requirement for the first time. Agencies must maintain at least 3 months of immediately searchable log data covering all Appendix B categories, and at least 12 months of retrievable log data. Agencies must also implement automated threat detection, anomaly detection, and sensitive data protections (e.g., PII masking) prior to log storage.',
    keyPoints: [
      'Maintain ≥ 3 months of searchable log data (CEM metric first applies).',
      'Three months searchable satisfies maturity reporting only; the Appendix B six-month searchable baseline binds regardless (LRA Section 5.3).',
      'Maintain ≥ 12 months of retrievable log data (THIRF).',
      'Implement automated threat detection and anomaly detection capabilities.',
      'Apply sensitive data protections (PII masking, field redaction) before storage.',
    ],
  },
  {
    id: 4,
    name: 'Optimal (Level 4)',
    deadline: 'Ongoing (no mandatory deadline)',
    dueDate: null,
    days: 'Ongoing',
    searchable: '≥ 6 months',
    retrievable: '≥ 12 months',
    metrics: {
      inventoryVisibility: '≥ 95% daily',
      collectionCoverage: '≥ 95% of assets',
      collectionOperations: '≥ 95% baseline, ML/AI',
      logManagement: 'Encrypted, JIT access, two-gate retirement',
    },
    summary:
      'Achieves the highest maturity level with 6 months of searchable and 12 months of retrievable log data. Agencies must operate a federated, distributed logging architecture with full encryption at rest and in transit, tamper-evident log integrity, NTP-traceable timestamps, and a documented, tested procedure for sharing logs with CISA and the FBI on demand.',
    keyPoints: [
      'Maintain ≥ 6 months of searchable log data (CEM) and ≥ 12 months retrievable (THIRF).',
      'Operate a federated, distributed logging architecture at scale.',
      'Enforce encryption at rest and in transit with tamper-evident log integrity.',
      'Documented and tested CISA/FBI log sharing procedure in the Agency Logging Plan.',
    ],
  },
]
