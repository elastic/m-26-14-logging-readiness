// Build-time check for the Capabilities page data.
//   - every asset id a capability lists exists in the catalog
//   - every screenshot id a capability lists is a dashboard with a PNG and a thumbnail
//   - every catalog asset is claimed by at least one capability
//   - every capability is in exactly one CAPABILITY_GROUPS entry
// Fails the build on any of these so the page can never describe assets that
// do not ship, or ship assets the page does not describe.
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const catalog = JSON.parse(readFileSync(join(root, 'src/data/assetCatalog.json'), 'utf8'))
const { CAPABILITIES, CAPABILITY_GROUPS } = await import(join(root, 'src/data/capabilities.js'))

const ids = new Set(catalog.assets.map(a => `${a.type}/${a.id}`))
const byId = new Map()
for (const a of catalog.assets) {
  if (!byId.has(a.id)) byId.set(a.id, [])
  byId.get(a.id).push(a.type)
}
const dashboards = new Set(catalog.assets.filter(a => a.type === 'dashboard').map(a => a.id))

const errors = []
const claimed = new Set()
const capIds = new Set()
for (const cap of CAPABILITIES) {
  if (capIds.has(cap.id)) errors.push(`duplicate capability id ${cap.id}`)
  capIds.add(cap.id)
  for (const id of cap.assets) {
    const types = byId.get(id)
    if (!types) { errors.push(`${cap.id}: asset "${id}" is not in the catalog`); continue }
    // An id shared by two types (a transform and its dest index template, say)
    // claims both: the capability owns the pair.
    for (const t of types) claimed.add(`${t}/${id}`)
  }
  for (const s of cap.shots) {
    if (!dashboards.has(s)) errors.push(`${cap.id}: shot "${s}" is not a catalog dashboard`)
    if (!existsSync(join(root, 'public/screenshots', `${s}.png`))) errors.push(`${cap.id}: public/screenshots/${s}.png missing`)
    if (!existsSync(join(root, 'public/screenshots/thumbs', `${s}.jpg`))) errors.push(`${cap.id}: public/screenshots/thumbs/${s}.jpg missing`)
  }
}
// Every capability sits in exactly one reading-order group.
const grouped = new Map()
for (const g of CAPABILITY_GROUPS) for (const id of g.ids) {
  if (!capIds.has(id)) errors.push(`group ${g.id}: "${id}" is not a capability`)
  if (grouped.has(id)) errors.push(`capability ${id} is in groups ${grouped.get(id)} and ${g.id}`)
  grouped.set(id, g.id)
}
for (const id of capIds) if (!grouped.has(id)) errors.push(`capability ${id} is in no group`)

const unclaimed = [...ids].filter(k => !claimed.has(k))
for (const k of unclaimed) errors.push(`catalog asset ${k} is claimed by no capability`)

if (errors.length) {
  console.error(`check-catalog: ${errors.length} problem(s)`)
  for (const e of errors) console.error('  ' + e)
  process.exit(1)
}
console.log(`check-catalog: ${CAPABILITIES.length} capabilities, ${catalog.assets.length} assets (pack ${catalog.pack_version}), all cross-referenced`)
