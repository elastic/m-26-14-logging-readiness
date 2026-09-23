// Live demo cluster link base for the Readiness Pack site.

// Base URL of the demo Kibana. Swapped in one place; every live link on the
// site builds from it.
export const LIVE_KIBANA_BASE = 'https://pubsec-m2614-63e0e0.kb.us-east4.gcp.elastic-cloud.com'

// Name of the Kibana anonymous authentication provider on the demo cluster
// (xpack.security.authc.providers.anonymous.<name>). Passing it as
// auth_provider_hint skips the login selector and opens the linked page as
// the read-only demo viewer. Kibana requires the parameter before the hash.
export const ANON_PROVIDER = 'anonymous1'

// Append the anonymous-provider hint to a demo Kibana URL (absolute or a
// path under LIVE_KIBANA_BASE). Non-demo URLs pass through untouched.
export function withAnonHint(url) {
  if (!url) return url
  if (!(url.startsWith(LIVE_KIBANA_BASE) || url.startsWith('/'))) return url
  const i = url.indexOf('#')
  const head = i < 0 ? url : url.slice(0, i)
  const hash = i < 0 ? '' : url.slice(i)
  if (/[?&]auth_provider_hint=/.test(head)) return url
  const sep = head.includes('?') ? '&' : '?'
  return `${head}${sep}auth_provider_hint=${ANON_PROVIDER}${hash}`
}

// Absolute demo URL for a Kibana app path, with the anonymous hint applied.
export function liveUrl(path) {
  return path ? withAnonHint(`${LIVE_KIBANA_BASE}${path}`) : null
}
