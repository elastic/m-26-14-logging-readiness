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
      'Inventory Visibility: at least 70% of IT, OT and IoT assets in a central HWAM/SWAM inventory.',
      'Collection Coverage: logs searchable and retrievable for at least 50% of the assets in that inventory.',
      'Collection Operations: alerting exists on the Appendix B baseline (below 50% of it).',
      'Log Management: logs are stored.',
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
      'Inventory Visibility: at least 80% of assets in the central inventory, updated daily.',
      'Collection Coverage: logs searchable and retrievable for at least 80% of inventoried assets.',
      'Collection Operations: alerts covering 50% to 70% of the Appendix B baseline.',
      'Log Management: stored logs encrypted at rest.',
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
      'Introduces the CEM searchable requirement for the first time. Agencies must maintain at least 3 months of immediately searchable log data and at least 12 months of retrievable log data, with 90% of assets inventoried daily and collected, alerts covering at least 70% of the Appendix B baseline and routinely tuned, and logs encrypted in transit and at rest and regularly hashed for veracity.',
    keyPoints: [
      'Maintain ≥ 3 months of searchable log data (CEM metric first applies).',
      'Three months searchable satisfies maturity reporting only; the Appendix B six-month searchable baseline binds regardless (LRA Section 5.3).',
      'Maintain ≥ 12 months of retrievable log data (THIRF).',
      'Inventory Visibility ≥ 90% updated daily; Collection Coverage ≥ 90% of inventoried assets.',
      'Collection Operations: alerts covering ≥ 70% of the Appendix B baseline, routinely tuned.',
      'Log Management: encrypted in transit and at rest, regularly hashed for veracity.',
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
      'Achieves the highest maturity level with 6 months of searchable and 12 months of retrievable log data, 95% of assets inventoried and collected, alerts covering at least 95% of the baseline with ML and AI tuning, and log management that adds just-in-time access, monitored access and two-gate approval before any log is retired. NTP-traceable timestamps and a documented, tested procedure for sharing logs with CISA and the FBI on demand sit beside the element thresholds.',
    keyPoints: [
      'Maintain ≥ 6 months of searchable log data (CEM) and ≥ 12 months retrievable (THIRF).',
      'Inventory Visibility, Collection Coverage and Collection Operations at ≥ 95%, with ML and AI tuning the alerts.',
      'Log Management: encrypted, just-in-time and monitored access, two-gate approval before retiring logs.',
      'Documented and tested CISA/FBI log sharing procedure in the Agency Logging Plan.',
    ],
  },
]
