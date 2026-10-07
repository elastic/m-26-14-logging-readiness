// Server/static build implementation of the content API: files live under the
// site's own paths (public/) and are fetched at runtime. The Hub single-file build
// swaps this module for inlineContent.js via the `@app-content` alias in vite.config.
export const INLINE = false

export function loadText(path) {
  return fetch(path).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return r.text()
  })
}

export function assetUrl(path) {
  return path
}

export function docHref(path) {
  return path
}
