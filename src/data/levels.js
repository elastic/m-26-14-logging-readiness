// Per-level metadata: deadlines, retention requirements, narrative.

export const LEVELS = [
  {
    id: 1,
    name: 'Initial (Level 1)',
    deadline: '120 days from LRA publication',
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
      'Establishes the foundational logging baseline. Agencies must collect logs across all required Appendix B event categories and retain them in a retrievable state for a minimum of 6 months. No searchable (CEM) requirement applies at this level. Agencies must also submit their Agency Logging Plan within 90 days of LRA publication.',
    keyPoints: [
      'Collect all Appendix B event categories from applicable log sources.',
      'Retain logs in a retrievable state for a minimum of 6 months.',
      'No searchable (CEM) retention requirement at this level.',
      'Agency Logging Plan must be submitted within 90 days of LRA publication.',
    ],
  },
  {
    id: 2,
    name: 'Intermediate (Level 2)',
    deadline: '180 days from LRA publication',
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
      'Expands log source coverage and increases the retrievable retention window to 12 months. Agencies must achieve complete Appendix B log coverage and maintain a full asset and system inventory reflected in their logging pipeline. No searchable (CEM) retention requirement applies at this level.',
    keyPoints: [
      'Full coverage of all Appendix B log categories with no gaps.',
      'Complete asset and system inventory must be reflected in collected logs.',
      'Retain logs in a retrievable state for a minimum of 12 months.',
      'No searchable (CEM) retention requirement at this level.',
    ],
  },
  {
    id: 3,
    name: 'Advanced (Level 3)',
    deadline: '320 days from LRA publication',
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
      'Maintain ≥ 3 months of searchable log data (CEM requirement first applies).',
      'Maintain ≥ 12 months of retrievable log data (THIRF).',
      'Implement automated threat detection and anomaly detection capabilities.',
      'Apply sensitive data protections (PII masking, field redaction) before storage.',
    ],
  },
  {
    id: 4,
    name: 'Optimal (Level 4)',
    deadline: 'Ongoing',
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
