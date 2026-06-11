import React, { useState, useRef, useEffect, useCallback } from 'react'
import JSZip from 'jszip'
import { ASSET_FILES, ASSET_COLUMNS, ASSET_TYPE_META } from '../data/assets.js'
import AssetViewer from './AssetViewer.jsx'

const LEVELS = [1, 2, 3, 4]

// Ordered list of types with display labels, derived from ASSET_TYPE_META
const TYPE_FILTERS = [
  { type: 'kibana-dashboard', label: 'Dashboard' },
  { type: 'kibana-rule',      label: 'Detection Rule' },
  { type: 'ml-job',          label: 'ML Job' },
  { type: 'ilm-policy',      label: 'ILM Policy' },
  { type: 'slm-policy',      label: 'SLM Policy' },
  { type: 'index-template',  label: 'Index Template' },
  { type: 'ingest-pipeline', label: 'Ingest Pipeline' },
  { type: 'transform',       label: 'Transform' },
  { type: 'es-watcher',      label: 'ES Watcher' },
  { type: 'kibana-workflow', label: 'Workflow' },
  { type: 'fleet-pack',      label: 'Fleet Pack' },
]

export default function AssetInventory() {
  const [filterLevel, setFilterLevel] = useState(null)
  const [filterType, setFilterType] = useState(null)
  const [viewerAssetId, setViewerAssetId] = useState(null)
  const [downloading, setDownloading] = useState(false)

  const visible = ASSET_FILES
    .filter(f => !filterLevel || f.levels.includes(filterLevel))
    .filter(f => !filterType  || f.type === filterType)

  const byColumn = ASSET_COLUMNS.map(col => ({
    col,
    files: visible.filter(f => f.column === col),
  })).filter(g => g.files.length)

  const total = visible.length

  async function handleDownloadBundle() {
    setDownloading(true)
    const zip = new JSZip()
    const label = filterLevel ? `L${filterLevel}` : 'all'
    const folder = zip.folder(`m2614-compliance-pack-${label}`)
    await Promise.all(
      visible.map(async f => {
        try {
          const res = await fetch(f.file)
          if (!res.ok) return
          const text = await res.text()
          const filename = f.file.split('/').pop()
          // Recreate subdirectory structure inside zip
          const subpath = f.file.replace('/assets/', '')
          folder.file(subpath, text)
        } catch (_) { /* skip failed fetch */ }
      })
    )
    const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/zip' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `m2614-compliance-pack-${label}.zip`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 500)
    setDownloading(false)
  }

  return (
    <main className="mx-auto max-w-[1800px] px-8 py-10 space-y-8">
      <header>
        <h1 className="text-3xl font-semibold text-text-primary">
          M-26-14 Compliance Pack — Asset Inventory
        </h1>
        <p className="mt-4 text-base text-text-muted leading-relaxed">
          Pre-built Elastic assets for each maturity level, organized by architecture layer.
          Assets are deployed into Kibana, Elasticsearch, and Fleet — each mapped to the
          M-26-14 element it fulfils. Click <span className="text-accent-blue font-medium">View</span> to
          inspect file contents, or download the full bundle for your level.
        </p>
      </header>

      {/* Filter + download bar — single row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Level buttons */}
        <span className="text-xs text-text-muted shrink-0">Level</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFilterLevel(null)}
            className={`text-xs px-3 py-1 rounded border transition-colors ${
              filterLevel === null
                ? 'border-accent-teal/60 bg-accent-teal/15 text-accent-teal'
                : 'border-line bg-ink-800 text-text-muted hover:border-accent-teal/30 hover:text-text-primary'
            }`}
            style={{ borderStyle: 'solid' }}
          >All</button>
          {LEVELS.map(l => {
            const LC = {
              1: { active: 'border-accent-teal/60 bg-accent-teal/15 text-accent-teal',   hover: 'hover:border-accent-teal/30'  },
              2: { active: 'border-accent-blue/60 bg-accent-blue/15 text-accent-blue',   hover: 'hover:border-accent-blue/30'  },
              3: { active: 'border-accent-purple/60 bg-accent-purple/15 text-accent-purple',        hover: 'hover:border-accent-purple/30'   },
              4: { active: 'border-accent-coral/60 bg-accent-coral/15 text-accent-coral', hover: 'hover:border-accent-coral/30' },
            }[l]
            return (
              <button
                key={l}
                onClick={() => setFilterLevel(l === filterLevel ? null : l)}
                className={`text-xs px-3 py-1 rounded border transition-colors ${
                  filterLevel === l
                    ? LC.active
                    : `border-line bg-ink-800 text-text-muted ${LC.hover} hover:text-text-primary`
                }`}
                style={{ borderStyle: 'solid' }}
              >L{l}</button>
            )
          })}
        </div>

        {/* Type popover */}
        <div className="h-4 w-px bg-line shrink-0" />
        <TypeFilterPopover value={filterType} onChange={setFilterType} />

        <div className="flex-1" />
        <span className="text-xs text-text-muted">{total} assets</span>
        <button
          onClick={handleDownloadBundle}
          disabled={downloading}
          className="flex items-center gap-2 text-sm px-4 py-2 rounded border border-accent-blue/50 bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20 disabled:opacity-50 transition-colors"
          style={{ borderStyle: 'solid' }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M8 2v8M5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 12v1.5A1.5 1.5 0 003.5 15h9a1.5 1.5 0 001.5-1.5V12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          {downloading ? 'Preparing…' : `Download ${filterLevel ? `L${filterLevel}` : 'full'} bundle`}
        </button>
      </div>

      {/* Column sections */}
      {byColumn.map(({ col, files }) => (
        <section key={col}>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-base font-bold uppercase tracking-widest text-text-primary">{col}</h2>
            <div className="flex-1 h-px bg-line" />
            <span className="text-lg font-semibold text-accent-teal">{files.length} assets</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {files.map(f => <AssetCard key={f.id} asset={f} onView={() => setViewerAssetId(f.id)} />)}
          </div>
        </section>
      ))}

      <AssetViewer assetId={viewerAssetId} onClose={() => setViewerAssetId(null)} />
    </main>
  )
}

// ─── Type filter popover ──────────────────────────────────────────────────────

function TypeFilterPopover({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const selectedMeta = value ? ASSET_TYPE_META[value] : null

  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) close() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, close])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 text-xs px-3 py-1 rounded border transition-colors ${
          value
            ? 'border-line bg-ink-800 text-text-primary'
            : 'border-line bg-ink-800 text-text-muted hover:border-line hover:text-text-primary'
        }`}
        style={{ borderStyle: 'solid' }}
      >
        {selectedMeta ? (
          <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${selectedMeta.bg} ${selectedMeta.color}`}
            style={{ borderStyle: 'solid' }}>
            {selectedMeta.label}
          </span>
        ) : (
          <span className="text-text-muted">Type</span>
        )}
        <svg
          className={`w-3 h-3 text-text-muted transition-transform shrink-0 ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 12 12" fill="none"
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-1 z-50 rounded-lg bg-ink-800 shadow-xl py-1 min-w-[180px]"
          style={{ border: '1px solid rgb(var(--color-line))' }}
        >
          {/* All types option */}
          <button
            onClick={() => { onChange(null); close() }}
            className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-ink-700 ${
              value === null ? 'text-accent-teal' : 'text-text-muted'
            }`}
          >
            {value === null && <CheckIcon />}
            <span className={value === null ? '' : 'pl-4'}>All types</span>
          </button>
          <div className="my-1 h-px bg-line/50" />
          {TYPE_FILTERS.map(({ type }) => {
            const meta = ASSET_TYPE_META[type]
            const active = value === type
            return (
              <button
                key={type}
                onClick={() => { onChange(active ? null : type); close() }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-ink-700"
              >
                {active ? <CheckIcon /> : <span className="w-3.5 shrink-0" />}
                <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${meta.bg} ${meta.color}`}
                  style={{ borderStyle: 'solid' }}>
                  {meta.label}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="shrink-0 text-accent-teal">
      <path d="M3 8l4 4 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ─── Asset card ───────────────────────────────────────────────────────────────

function AssetCard({ asset, onView }) {
  const typeMeta = ASSET_TYPE_META[asset.type] ?? { label: asset.type, color: 'text-text-muted', bg: 'bg-ink-700 border-line' }
  const filename = asset.file.split('/').pop()

  return (
    <div className="rounded-lg bg-ink-800 p-4 flex flex-col gap-2" style={{ border: '1px solid rgb(var(--color-line))' }}>
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${typeMeta.bg} ${typeMeta.color}`}
              style={{ borderStyle: 'solid' }}>
              {typeMeta.label}
            </span>
            {asset.levels.map(l => (
              <span key={l} className="text-[9px] px-1 py-0.5 rounded bg-ink-700 text-text-muted border border-line/50"
                style={{ borderStyle: 'solid' }}>L{l}</span>
            ))}
          </div>
          <h3 className="text-sm font-semibold text-text-primary leading-snug">{asset.label}</h3>
          <p className="mt-1 text-xs font-mono text-text-muted/70 truncate">{filename}</p>
        </div>
      </div>

      <p className="text-xs text-text-muted leading-relaxed flex-1">{asset.desc}</p>

      <div className="flex items-center gap-2 pt-1">
        {asset.ruleCount && (
          <span className="text-xs text-text-muted">{asset.ruleCount} rules</span>
        )}
        <div className="flex-1" />
        <button
          onClick={onView}
          className="text-xs px-3 py-1.5 rounded border border-accent-blue/40 text-accent-blue hover:bg-accent-blue/10 transition-colors"
          style={{ borderStyle: 'solid' }}
        >
          View
        </button>
        <DownloadButton asset={asset} />
      </div>
    </div>
  )
}

function DownloadButton({ asset }) {
  const [busy, setBusy] = useState(false)

  async function handle() {
    setBusy(true)
    try {
      const res = await fetch(asset.file)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const text = await res.text()
      const filename = asset.file.split('/').pop()
      const blob = new Blob([text], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(url), 500)
    } catch (_) { /* silently fail */ }
    setBusy(false)
  }

  return (
    <button
      onClick={handle}
      disabled={busy}
      className="text-xs px-3 py-1.5 rounded border border-line text-text-muted hover:border-accent-blue/40 hover:text-text-primary disabled:opacity-40 transition-colors"
      style={{ borderStyle: 'solid' }}
      title={`Download ${asset.file.split('/').pop()}`}
    >
      {busy ? '…' : (
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
          <path d="M8 2v8M5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 12v1.5A1.5 1.5 0 003.5 15h9a1.5 1.5 0 001.5-1.5V12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      )}
    </button>
  )
}
