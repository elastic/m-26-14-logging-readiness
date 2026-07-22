// Slide-over flyout for viewing compliance pack asset files.
// NDJSON files render as individual expandable JSON blocks.
// JSON/YAML files render as a single syntax-highlighted block.
// Screenshot preview and inline markdown doc viewer included.

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ASSET_FILE_MAP, ASSET_TYPE_META, classifyNdjsonLine } from '../data/assets.js'
import { liveClusterUrl, liveLinkIsListing } from '../data/liveLinks.js'
import { loadText, assetUrl, docHref } from '@app-content'

const MIN_WIDTH = 400
const MAX_WIDTH = 1400
const DEFAULT_WIDTH = 700

export default function AssetViewer({ assetId, onClose }) {
  const open = Boolean(assetId)
  const asset = assetId ? ASSET_FILE_MAP[assetId] : null

  const [rawText, setRawText] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH)
  const [screenshotExpanded, setScreenshotExpanded] = useState(true)
  // docView: null = JSON content, or { file, label } = doc being viewed
  const [docView, setDocView] = useState(null)
  const [docText, setDocText] = useState(null)
  const [docLoading, setDocLoading] = useState(false)

  const dragRef = useRef({ active: false, startX: 0, startWidth: 0 })

  const onResizeStart = useCallback((e) => {
    e.preventDefault()
    dragRef.current = { active: true, startX: e.clientX, startWidth: panelWidth }
    const onMove = (ev) => {
      if (!dragRef.current.active) return
      const delta = dragRef.current.startX - ev.clientX
      setPanelWidth(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, dragRef.current.startWidth + delta)))
    }
    const onUp = () => {
      dragRef.current.active = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [panelWidth])

  // Fetch asset file when assetId changes
  useEffect(() => {
    if (!asset) { setRawText(null); return }
    setLoading(true)
    setError(null)
    setRawText(null)
    setDocView(null)
    setDocText(null)
    setScreenshotExpanded(true)
    loadText(asset.file)
      .then(t => { setRawText(t); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [assetId])

  // Fetch doc when docView changes
  useEffect(() => {
    if (!docView) { setDocText(null); return }
    if (docView.file.endsWith('.pdf')) return // PDFs open externally
    setDocLoading(true)
    setDocText(null)
    loadText(docView.file)
      .then(t => { setDocText(t); setDocLoading(false) })
      .catch(() => setDocLoading(false))
  }, [docView])

  // Escape key
  useEffect(() => {
    if (!open) return
    const handler = e => {
      if (e.key === 'Escape') {
        if (docView) setDocView(null)
        else onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose, docView])

  const handleCopy = useCallback(() => {
    if (!rawText) return
    navigator.clipboard.writeText(rawText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [rawText])

  const handleDownload = useCallback(() => {
    if (!rawText || !asset) return
    const filename = asset.file.split('/').pop()
    const blob = new Blob([rawText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 500)
  }, [rawText, asset])

  const openDocExternal = useCallback((doc) => {
    window.open(docHref(doc.file), '_blank', 'noopener')
  }, [])

  const downloadDoc = useCallback((doc) => {
    // Serve from the content bundle so this works in the single-file Hub build;
    // files not bundled there (PDFs) open from the source repo instead.
    loadText(doc.file)
      .then(text => {
        const blob = new Blob([text], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = doc.file.split('/').pop()
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(url), 500)
      })
      .catch(() => window.open(docHref(doc.file), '_blank', 'noopener'))
  }, [])

  const typeMeta = asset ? (ASSET_TYPE_META[asset.type] ?? { label: asset.type, color: 'text-text-muted', bg: 'bg-ink-700 border-line' }) : null

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-30 bg-black/50 transition-opacity ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        style={{ marginTop: 0 }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        className={`fixed right-0 z-40 bg-ink-800 shadow-2xl
                    flex flex-col transform transition-transform duration-200 ease-out
                    ${open ? 'translate-x-0' : 'translate-x-full'}`}
        style={{
          top: 0,
          height: '100vh',
          width: `${panelWidth}px`,
          paddingTop: 'var(--nav-height, 60px)',
          marginTop: 0,
          borderLeft: '1px solid rgb(var(--color-line))',
        }}
        role="dialog"
        aria-modal="true"
        aria-label={asset ? `${asset.label} asset viewer` : 'Asset viewer'}
      >
        {/* Drag-to-resize handle */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize z-10 group"
          onMouseDown={onResizeStart}
        >
          <div className="absolute inset-y-0 left-0 w-0.5 bg-transparent group-hover:bg-accent-blue/50 transition-colors" />
        </div>

        {asset && (
          <>
            {/* Header */}
            <header className="flex items-start gap-3 px-5 py-4 shrink-0">
              <div className="flex-1 min-w-0">
                {docView ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setDocView(null)}
                      className="flex items-center gap-1.5 text-xs text-text-muted hover:text-accent-teal transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Back to source
                    </button>
                    <span className="text-text-muted/40 text-xs">·</span>
                    <span className="text-sm font-semibold text-text-primary truncate">{docView.label}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <TypeBadge meta={typeMeta} />
                      <span className="text-xs text-text-muted">{asset.column}</span>
                    </div>
                    <h2 className="text-base font-semibold text-text-primary leading-tight truncate">
                      {asset.label}
                    </h2>
                    <p className="mt-1 text-xs text-text-muted font-mono truncate">{asset.file.split('/').pop()}</p>
                  </>
                )}
              </div>
              <button
                onClick={onClose}
                className="shrink-0 rounded p-1.5 text-text-muted hover:bg-ink-700 hover:text-text-primary"
                aria-label="Close viewer"
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </header>

            {/* Description + levels (hide when viewing doc) */}
            {!docView && (
              <div className="px-5 py-3 shrink-0 bg-ink-700/40">
                <p className="text-sm text-text-primary leading-relaxed">{asset.desc}</p>
                <div className="mt-2 flex gap-2 flex-wrap">
                  {asset.levels.map(l => (
                    <span key={l} className="text-xs px-1.5 py-0.5 rounded bg-accent-blue/15 text-accent-blue border border-accent-blue/30"
                      style={{ borderStyle: 'solid' }}>L{l}</span>
                  ))}
                  {asset.ruleCount && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-accent-purple/15 text-accent-purple border border-accent-purple/30"
                      style={{ borderStyle: 'solid' }}>{asset.ruleCount} rules</span>
                  )}
                </div>
              </div>
            )}

            {/* Action bar (hide when viewing doc) */}
            {!docView && (
              <div className="flex gap-2 px-5 py-2.5 shrink-0 flex-wrap">
                <button
                  onClick={handleCopy}
                  disabled={!rawText}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-line text-text-muted hover:text-text-primary hover:border-accent-blue/50 disabled:opacity-40 transition-colors"
                  style={{ borderStyle: 'solid' }}
                >
                  {copied ? (
                    <><CopyDoneIcon /> Copied</>
                  ) : (
                    <><CopyIcon /> Copy</>
                  )}
                </button>
                <button
                  onClick={handleDownload}
                  disabled={!rawText}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-line text-text-muted hover:text-text-primary hover:border-accent-blue/50 disabled:opacity-40 transition-colors"
                  style={{ borderStyle: 'solid' }}
                >
                  <DownloadIcon /> Download
                </button>

                {/* Live demo cluster deep link */}
                {liveClusterUrl(asset) && (
                  <a
                    href={liveClusterUrl(asset)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-accent-blue/40 text-accent-blue hover:bg-accent-blue/10 transition-colors"
                    style={{ borderStyle: 'solid' }}
                    title={liveLinkIsListing(asset)
                      ? 'Open the live demo cluster listing page for this asset type'
                      : 'Open this asset in the live demo cluster'}
                  >
                    <ExternalLinkIcon />
                    {liveLinkIsListing(asset) ? 'Live Cluster (list)' : 'View Live'}
                  </a>
                )}

                {/* Doc links */}
                {asset.docs?.map(doc => (
                  <div key={doc.file} className="flex items-center gap-0.5">
                    <button
                      onClick={() => {
                        if (doc.file.endsWith('.pdf')) openDocExternal(doc)
                        else setDocView(doc)
                      }}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-l border border-accent-teal/30 text-accent-teal hover:bg-accent-teal/10 transition-colors"
                      style={{ borderStyle: 'solid', borderRightWidth: 0 }}
                      title={doc.label}
                    >
                      <DocIcon isPdf={doc.file.endsWith('.pdf')} />
                      <span className="truncate max-w-[120px]">{doc.label}</span>
                    </button>
                    <button
                      onClick={() => downloadDoc(doc)}
                      className="flex items-center px-2 py-1.5 rounded-r border border-accent-teal/30 text-accent-teal/70 hover:bg-accent-teal/10 hover:text-accent-teal transition-colors"
                      style={{ borderStyle: 'solid' }}
                      title={`Download ${doc.label}`}
                    >
                      <DownloadIcon size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 min-h-0">
              {docView ? (
                /* Doc viewer */
                <DocViewer doc={docView} text={docText} loading={docLoading} />
              ) : (
                <>
                  {/* Screenshot preview */}
                  {asset.screenshot && (
                    <div className="rounded-lg overflow-hidden" style={{ border: '1px solid rgb(var(--color-line))' }}>
                      <button
                        onClick={() => setScreenshotExpanded(o => !o)}
                        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-ink-700 transition-colors bg-ink-700/50"
                      >
                        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Dashboard Preview</span>
                        <svg
                          className={`w-3 h-3 text-text-muted shrink-0 transition-transform ${screenshotExpanded ? 'rotate-180' : ''}`}
                          viewBox="0 0 12 12" fill="none"
                        >
                          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      {screenshotExpanded && (
                        <div style={{ borderTop: '1px solid rgb(var(--color-line))' }}>
                          <img
                            src={assetUrl(asset.screenshot)}
                            alt={`${asset.label} dashboard preview`}
                            className="w-full block"
                            style={{ maxHeight: 300, objectFit: 'cover', objectPosition: 'top' }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Source JSON/NDJSON */}
                  {loading && (
                    <div className="flex items-center justify-center py-16 text-text-muted text-sm">
                      Loading…
                    </div>
                  )}
                  {error && (
                    <div className="rounded-lg border border-accent-coral/30 bg-accent-coral/10 px-4 py-3 text-sm text-accent-coral"
                      style={{ borderStyle: 'solid' }}>
                      Failed to load file: {error}
                    </div>
                  )}
                  {rawText && !loading && (
                    asset.format === 'ndjson'
                      ? <NdjsonViewer raw={rawText} />
                      : <SingleFileViewer raw={rawText} format={asset.format} />
                  )}
                </>
              )}
            </div>
          </>
        )}
      </aside>
    </>
  )
}

// ─── Doc Viewer ───────────────────────────────────────────────────────────────

function DocViewer({ doc, text, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-text-muted text-sm">
        Loading…
      </div>
    )
  }
  if (!text) return null

  return (
    <div className="px-6 py-4
      [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mt-0 [&_h1]:mb-6 [&_h1]:text-text-primary [&_h1]:leading-tight
      [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-text-primary [&_h2]:leading-snug
      [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-text-primary
      [&_h4]:text-sm [&_h4]:font-semibold [&_h4]:mt-4 [&_h4]:mb-1 [&_h4]:text-text-primary
      [&_p]:text-sm [&_p]:text-text-primary [&_p]:leading-relaxed [&_p]:mb-4
      [&_a]:text-accent-teal [&_a]:no-underline [&_a:hover]:underline
      [&_strong]:text-text-primary [&_strong]:font-semibold
      [&_code]:text-accent-blue [&_code]:bg-ink-700 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono
      [&_pre]:bg-ink-900 [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:text-xs [&_pre]:overflow-x-auto [&_pre]:my-4
      [&_li]:text-sm [&_li]:text-text-primary [&_li]:my-1 [&_li]:leading-relaxed
      [&_ul]:my-4 [&_ul]:pl-5 [&_ul]:list-disc
      [&_ol]:my-4 [&_ol]:pl-5 [&_ol]:list-decimal
      [&_blockquote]:border-l-2 [&_blockquote]:border-accent-teal/50 [&_blockquote]:pl-4 [&_blockquote]:my-4 [&_blockquote]:text-text-muted [&_blockquote]:italic
      [&_table]:w-full [&_table]:text-sm [&_table]:my-4 [&_table]:border-collapse
      [&_th]:text-xs [&_th]:font-semibold [&_th]:text-text-muted [&_th]:text-left [&_th]:pb-2 [&_th]:border-b [&_th]:border-line
      [&_td]:text-sm [&_td]:text-text-primary [&_td]:py-2 [&_td]:border-b [&_td]:border-line/30 [&_td]:align-top
      [&_hr]:border-line [&_hr]:my-6 [&_hr]:border-t">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          img: ({ src, alt }) => <img src={assetUrl(src)} alt={alt} className="rounded-lg my-4 max-w-full" />,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
}

// ─── Icon helpers ─────────────────────────────────────────────────────────────

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M11 5V3.5A1.5 1.5 0 009.5 2H3.5A1.5 1.5 0 002 3.5v6A1.5 1.5 0 003.5 11H5" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  )
}

function CopyDoneIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <path d="M2 8l4 4 8-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ExternalLinkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
      <path d="M6.5 3.5H3.8A1.3 1.3 0 002.5 4.8v7.4a1.3 1.3 0 001.3 1.3h7.4a1.3 1.3 0 001.3-1.3V9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M9.5 2.5h4v4M13.2 2.8L7.5 8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function DownloadIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M8 2v8M5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 12v1.5A1.5 1.5 0 003.5 15h9a1.5 1.5 0 001.5-1.5V12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  )
}

function DocIcon({ isPdf }) {
  if (isPdf) {
    return (
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
        <path d="M3 2h7l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M10 2v4h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        <path d="M5 9h6M5 11.5h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    )
  }
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
      <path d="M3 2h7l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M10 2v4h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M5 7h6M5 9.5h6M5 12h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  )
}

// ─── Type badge ───────────────────────────────────────────────────────────────

function TypeBadge({ meta }) {
  if (!meta) return null
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${meta.bg} ${meta.color}`}
      style={{ borderStyle: 'solid' }}>
      {meta.label}
    </span>
  )
}

// ─── NDJSON viewer ────────────────────────────────────────────────────────────

function NdjsonViewer({ raw }) {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)

  return (
    <div className="space-y-2">
      <p className="text-xs text-text-muted px-1">{lines.length} {lines.length === 1 ? 'object' : 'objects'}</p>
      {lines.map((line, i) => {
        let parsed = null
        let parseErr = null
        try { parsed = JSON.parse(line) } catch (e) { parseErr = e.message }
        return (
          <NdjsonBlock key={i} index={i} raw={line} parsed={parsed} parseErr={parseErr} />
        )
      })}
    </div>
  )
}

function NdjsonBlock({ index, raw, parsed, parseErr }) {
  const [expanded, setExpanded] = useState(index === 0)

  const meta = parsed ? classifyNdjsonLine(parsed) : { displayType: 'parse error', title: parseErr }

  return (
    <div className="rounded-lg overflow-hidden"
      style={{ border: '1px solid rgb(var(--color-line))' }}>
      <button
        onClick={() => setExpanded(o => !o)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-ink-700 transition-colors bg-ink-700/50"
      >
        <svg
          className={`w-3 h-3 text-text-muted shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
          viewBox="0 0 12 12" fill="none"
        >
          <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-[10px] font-mono text-text-muted shrink-0">{index + 1}</span>
        <TypeBadgeMini type={meta.displayType} />
        <span className="text-sm text-text-primary truncate flex-1">{meta.title}</span>
      </button>
      {expanded && (
        <div className="overflow-x-auto" style={{ borderTop: '1px solid rgb(var(--color-line))' }}>
          {parseErr ? (
            <pre className="px-4 py-3 text-xs text-accent-coral font-mono">{raw}</pre>
          ) : (
            <SyntaxHighlighter
              language="json"
              style={vscDarkPlus}
              customStyle={{
                margin: 0,
                borderRadius: 0,
                fontSize: '0.72rem',
                lineHeight: '1.5',
                background: 'rgb(var(--color-ink-900, 13 17 23))',
                padding: '12px 16px',
                overflowWrap: 'anywhere',
              }}
              codeTagProps={{
                style: {
                  whiteSpace: 'pre-wrap',
                  overflowWrap: 'anywhere',
                  wordBreak: 'break-word',
                },
              }}
              wrapLongLines={true}
            >
              {JSON.stringify(parsed, null, 2)}
            </SyntaxHighlighter>
          )}
        </div>
      )}
    </div>
  )
}

function TypeBadgeMini({ type }) {
  const typeColors = {
    eql:               'text-accent-coral',
    esql:              'text-accent-teal',
    machine_learning:  'text-accent-purple',
    threshold:         'text-accent-yellow',
    query:             'text-accent-blue',
    dashboard:         'text-accent-coral',
    visualization:     'text-accent-blue',
    'lens':            'text-accent-teal',
    'index-pattern':   'text-accent-green',
    'tag':             'text-text-muted',
  }
  const color = typeColors[type] ?? 'text-text-muted'
  return (
    <span className={`text-[9px] font-bold uppercase tracking-wider font-mono shrink-0 ${color}`}>
      {type}
    </span>
  )
}

function SingleFileViewer({ raw, format }) {
  const lang = format === 'yaml' ? 'yaml' : 'json'
  let display = raw
  if (format === 'json') {
    try { display = JSON.stringify(JSON.parse(raw), null, 2) } catch (_) { /* keep raw */ }
  }
  return (
    <div className="rounded-lg overflow-hidden" style={{ border: '1px solid rgb(var(--color-line))' }}>
      <SyntaxHighlighter
        language={lang}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          borderRadius: 0,
          fontSize: '0.72rem',
          lineHeight: '1.5',
          background: 'rgb(var(--color-ink-900, 13 17 23))',
          padding: '16px',
          overflowWrap: 'anywhere',
        }}
        codeTagProps={{
          style: {
            whiteSpace: 'pre-wrap',
            overflowWrap: 'anywhere',
            wordBreak: 'break-word',
          },
        }}
        wrapLongLines={true}
      >
        {display}
      </SyntaxHighlighter>
    </div>
  )
}
