import React, { useState, useRef, useEffect } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import { LEVELS } from '../data/levels.js'
import { SIZE_ORDER, sizingTable } from '../data/sizing.js'
import { useTheme } from '../ThemeContext.jsx'
import Drawer from './Drawer.jsx'
import Level1Diagram from './diagrams/Level1Diagram.jsx'
import Level2Diagram from './diagrams/Level2Diagram.jsx'
import Level3Diagram from './diagrams/Level3Diagram.jsx'
import Level4Diagram from './diagrams/Level4Diagram.jsx'

const DIAGRAMS = {
  1: Level1Diagram,
  2: Level2Diagram,
  3: Level3Diagram,
  4: Level4Diagram,
}

const SIZE_LABELS = {
  small:  'Small-sized Organization',
  medium: 'Medium-sized Organization',
  large:  'Large-sized Organization',
}

export default function MaturityView() {
  const { size, level } = useParams()
  const levelNum = Number(level)
  const [selectedNode, setSelectedNode] = useState(null)
  const { theme } = useTheme()
  const diagramRef = useRef(null)
  const [zoom, setZoom] = useState(1)
  const ZOOM_MIN = 0.5
  const ZOOM_MAX = 2
  const ZOOM_STEP = 0.1

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const container = diagramRef.current
      if (!container) return
      const svg = container.querySelector('svg')
      if (!svg?.viewBox?.baseVal?.width) return
      const vb = svg.viewBox.baseVal
      const padding = 16
      const maxContainerH = Math.min(800, window.innerHeight - 300)
      const availW = Math.max(0, container.clientWidth - padding)
      const availH = Math.max(0, maxContainerH - padding)
      if (availW === 0 || availH === 0) return
      const naturalH = availW * (vb.height / vb.width)
      const fit = naturalH > availH
        ? Math.max(ZOOM_MIN, +(availH / naturalH).toFixed(2))
        : 1
      setZoom(fit)
    })
    return () => cancelAnimationFrame(id)
  }, [levelNum, size])

  if (!SIZE_ORDER.includes(size)) return <Navigate to="/maturity/small/1" replace />
  const meta = LEVELS.find((l) => l.id === levelNum)
  if (!meta) return <Navigate to="/maturity/small/1" replace />

  const Diagram = DIAGRAMS[levelNum]

  return (
    <main className="mx-auto max-w-[1800px] px-8 py-10 space-y-8">
      <header>
        <h1 className="text-3xl font-semibold text-text-primary">
          M-26-14 Maturity Levels by Organizational Size
        </h1>
        <p className="mt-8 mb-8 text-base text-text-muted leading-relaxed">
          Select a maturity level to explore the reference architecture, requirements, and compliance
          assets for that configuration. Choose an organization size tier based on daily ingest volume.
        </p>
      </header>

      {/* Maturity level selector row */}
      <div className="flex items-center gap-4">
        <h2 className="text-text-primary text-xl font-semibold w-44 shrink-0 text-right">
          Maturity Level
        </h2>
        <div className="grid grid-cols-4 gap-2 flex-1">
          {LEVELS.map((lvl) => {
            const isActive = lvl.id === levelNum
            const LC = {
              1: { active: 'border-accent-teal/60   bg-accent-teal/15   text-accent-teal',   hover: 'hover:border-accent-teal/30   hover:bg-accent-teal/5'   },
              2: { active: 'border-accent-blue/60   bg-accent-blue/15   text-accent-blue',   hover: 'hover:border-accent-blue/30   hover:bg-accent-blue/5'   },
              3: { active: 'border-accent-purple/60 bg-accent-purple/15 text-accent-purple', hover: 'hover:border-accent-purple/30 hover:bg-accent-purple/5' },
              4: { active: 'border-accent-coral/60  bg-accent-coral/15  text-accent-coral',  hover: 'hover:border-accent-coral/30  hover:bg-accent-coral/5'  },
            }[lvl.id]
            return (
              <Link
                key={lvl.id}
                to={`/maturity/${size}/${lvl.id}`}
                replace
                className={
                  `block rounded-lg border px-4 py-3 text-center text-base font-semibold transition-colors ` +
                  (isActive
                    ? LC.active
                    : `border-line bg-ink-800 text-text-muted ${LC.hover} hover:text-text-primary`)
                }
              >
                {lvl.name}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Architecture diagram with zoom controls */}
      <div className="relative" style={{ height: 'min(800px, calc(100vh - 300px))' }}>
        <div
          ref={diagramRef}
          className="rounded-lg p-2 overflow-auto h-full"
          style={{
            border: '1px solid rgb(var(--color-line))',
            backgroundColor: theme === 'dark' ? '#0B1628' : '#FFFFFF',
          }}
        >
          <div style={{ width: `${zoom * 100}%`, margin: '0 auto' }}>
            <Diagram size={size} onNodeClick={setSelectedNode} />
          </div>
        </div>
        <div
          className="absolute top-3 right-3 z-10 flex items-center rounded-lg border border-line bg-ink-800 shadow-lg overflow-hidden"
          style={{ borderStyle: 'solid' }}
        >
          <button
            onClick={() => setZoom(z => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))}
            disabled={zoom <= ZOOM_MIN}
            className="px-3 py-1.5 text-text-muted hover:text-text-primary hover:bg-ink-700 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-text-muted transition-colors"
            title="Zoom out" aria-label="Zoom out"
          >−</button>
          <button
            onClick={() => setZoom(1)}
            className="px-2 py-1.5 text-xs text-text-muted hover:text-text-primary hover:bg-ink-700 transition-colors tabular-nums min-w-[3.25rem] text-center"
            title="Reset zoom" aria-label="Reset zoom"
          >{Math.round(zoom * 100)}%</button>
          <button
            onClick={() => setZoom(z => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))}
            disabled={zoom >= ZOOM_MAX}
            className="px-3 py-1.5 text-text-muted hover:text-text-primary hover:bg-ink-700 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-text-muted transition-colors"
            title="Zoom in" aria-label="Zoom in"
          >+</button>
        </div>
      </div>

      {/* Org size selector row */}
      <div className="flex items-center gap-4">
        <h2 className="text-text-primary text-xl font-semibold w-44 shrink-0 text-right">
          Organization Size
        </h2>
        <div className="grid grid-cols-3 gap-2 flex-1">
          {SIZE_ORDER.map((s) => {
            const isActive = s === size
            return (
              <Link
                key={s}
                to={`/maturity/${s}/${level}`}
                replace
                className={
                  `block rounded-lg border px-4 py-2.5 text-center transition-colors ` +
                  (isActive
                    ? 'border-accent-blue/60 bg-accent-blue/15 text-accent-blue'
                    : 'border-line bg-ink-800 text-text-muted hover:border-accent-blue/30 hover:bg-accent-blue/5 hover:text-text-primary')
                }
              >
                <p className="text-sm font-semibold">{SIZE_LABELS[s]}</p>
                <p className="text-xs text-text-muted mt-0.5">{sizingTable[s].ingestRange}</p>
              </Link>
            )
          })}
        </div>
      </div>

      <Drawer componentId={selectedNode} size={size} onClose={() => setSelectedNode(null)} />
    </main>
  )
}
