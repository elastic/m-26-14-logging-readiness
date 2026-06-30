// Live demo cluster deep links — maps each compliance pack asset to its
// representation in the live Elastic cluster (dashboards open directly;
// Stack Management objects open their detail/list page).
//
// Naming convention: the deployed object name/id equals the asset file
// basename (verified against the live cluster). Assets whose deployed ids
// are generated at import time (detection rules, workflows, agents) link
// to the relevant listing page instead.

export const LIVE_KIBANA_BASE = 'https://m-26-14-7ae75d.kb.us-east-1.aws.found.io'

// strip path + extension: '/assets/elasticsearch/transform/m_26_14-foo.json' -> 'm_26_14-foo'
function basename(file) {
  return file.split('/').pop().replace(/\.(json|ndjson|yaml|yml)$/, '')
}

// Per-type URL builders. `name` is the deployed object name (file basename
// unless the asset declares `liveId`).
const TYPE_LINKS = {
  // Exact window pinned to the period the demo data spans: governance records
  // (retirement requests) start 2026-04-01 and the live streams run through
  // 2026-06-30. A relative now-120d window drifts and can frame an empty range
  // as the data ages, so the link uses the explicit data span instead. Update
  // this range if the dataset is reseeded to a different period.
  'kibana-dashboard': name =>
    `/app/dashboards#/view/${name}?_g=(time:(from:'2026-04-01T00:00:00.000Z',to:'2026-07-01T00:00:00.000Z'))`,
  'index-template': name =>
    `/app/management/data/index_management/templates/${encodeURIComponent(name)}`,
  'ilm-policy': name =>
    `/app/management/data/index_lifecycle_management/policies/edit/${encodeURIComponent(name)}`,
  'ingest-pipeline': name =>
    `/app/management/ingest/ingest_pipelines?pipeline=${encodeURIComponent(name)}`,
  'transform': name =>
    `/app/management/data/transform?_a=(transform:(queryText:'${name}'))`,
  'es-watcher': name =>
    `/app/management/insightsAndAlerting/watcher/watches/watch/${encodeURIComponent(name)}/status`,
  'slm-policy': name =>
    `/app/management/data/snapshot_restore/policies/${encodeURIComponent(name)}`,
  'ml-job': name =>
    `/app/ml/jobs?mlManagement=(jobId:${name})`,
  // Deployed ids generated at import — link to the listing page.
  'kibana-rule': () =>
    `/app/security/rules/management`,
  'kibana-workflow': () =>
    `/app/workflows`,
  'kibana-agent': () =>
    `/app/agent_builder/agents`,
  'kibana-agent-tool': () =>
    `/app/agent_builder/tools`,
  'fleet-pack': () =>
    `/app/osquery/packs`,
}

// Returns the absolute live-cluster URL for an asset, or null if the type
// has no live representation.
export function liveClusterUrl(asset) {
  if (!asset) return null
  const build = TYPE_LINKS[asset.type]
  if (!build) return null
  const name = asset.liveId ?? basename(asset.file)
  return `${LIVE_KIBANA_BASE}${build(name)}`
}

// True when the link points at a listing page rather than the exact object.
export function liveLinkIsListing(asset) {
  return ['kibana-rule', 'kibana-workflow', 'kibana-agent', 'kibana-agent-tool', 'fleet-pack'].includes(asset?.type)
}
