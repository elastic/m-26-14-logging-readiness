// Hub single-file build implementation of the content API. The Elastic Hub serves
// the page with `Content-Security-Policy: sandbox allow-scripts` (no
// allow-same-origin), so the document has an opaque origin: relative fetch() and
// storage are unavailable. All content therefore ships inside the bundle, base64-
// encoded (see scripts/generate-inline-content.mjs).
import { CONTENT } from '../generated/inlineContent.js'

export const INLINE = true

// Files excluded from the bundle (PDFs) link out to the source repo instead.
const REPO_BLOB = 'https://github.com/elastic/m-26-14-logging-readiness/blob/main/public'

function entry(path) {
  if (!path) return undefined
  const p = decodeURIComponent(path)
  if (CONTENT[p]) return CONTENT[p]
  // Markdown images use paths like '../screenshots/x.png', which the served site
  // resolves against the page URL (site root) — mirror that resolution here.
  return CONTENT['/' + p.replace(/^(\.{1,2}\/)+/, '')]
}

function decode(b64) {
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export function loadText(path) {
  const e = entry(path)
  return e ? Promise.resolve(decode(e.d)) : Promise.reject(new Error(`Not bundled: ${path}`))
}

export function assetUrl(path) {
  const e = entry(path)
  return e ? `data:${e.m};base64,${e.d}` : path
}

export function docHref(path) {
  return path.startsWith('/') ? REPO_BLOB + path : path
}
