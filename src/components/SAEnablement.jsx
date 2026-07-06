import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { PILLARS, CAPSTONE } from '../data/enablementFramework.js'
import AssetDiscoveryAnim from './enablement/AssetDiscoveryAnim.jsx'

// Animated visuals keyed by pillar.anim. Pillars without one yet show a slot.
const ANIMATIONS = {
  AssetDiscoveryAnim,
}

const DEPTHS = [
  { key: 'slide', label: 'Stay in the slide', hint: 'High-level + animated visual' },
  { key: 'demo', label: 'Scripted demo', hint: 'Instruqt click-through' },
  { key: 'live', label: 'Live cluster', hint: 'Drive the real data' },
  { key: 'docs', label: 'Documentation', hint: 'Elastic docs deep-dive' },
]

function ExtLink({ label, url }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-base text-accent-blue hover:underline">
      {label}
      <svg className="w-3.5 h-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  )
}

function DepthPanel({ depth, pillar }) {
  const Anim = pillar.anim ? ANIMATIONS[pillar.anim] : null

  if (depth === 'slide') {
    return (
      <div className="space-y-4">
        {Anim ? <Anim /> : (
          <div className="rounded-xl border border-dashed border-line/60 bg-ink-800/30 p-8 text-center">
            <p className="text-sm text-text-muted/70">Animated visual — planned. Concept below drives the slide.</p>
          </div>
        )}
        <div>
          <p className="text-sm uppercase tracking-wide text-text-muted/60 mb-1">The concept</p>
          <p className="text-lg text-text-primary leading-relaxed">{pillar.sa.concept}</p>
        </div>
        <div className="rounded-lg border-l-2 border-accent-teal/50 pl-4 py-1">
          <p className="text-sm uppercase tracking-wide text-text-muted/60 mb-1">Talk track</p>
          <p className="text-base text-text-muted leading-relaxed">{pillar.sa.talkTrack}</p>
        </div>
      </div>
    )
  }

  if (depth === 'demo') {
    const d = pillar.sa.demo
    return (
      <div className="rounded-lg bg-ink-800 p-5">
        <p className="text-lg text-text-primary font-medium mb-1">{d.title}</p>
        {d.url ? (
          <ExtLink label="Launch Instruqt track" url={d.url} />
        ) : (
          <p className="text-base text-text-muted/70">
            <span className="inline-block text-[10px] font-semibold uppercase tracking-wide bg-ink-700 text-text-muted/80 px-2 py-0.5 rounded mr-2">Planned</span>
            Scripted Instruqt track not yet published. Use the live cluster below until it lands.
          </p>
        )}
      </div>
    )
  }

  if (depth === 'live') {
    return (
      <div>
        <p className="text-sm uppercase tracking-wide text-text-muted/60 mb-2">Open in the live read-only cluster</p>
        <ul className="space-y-2 mb-4">
          {pillar.sa.live.map((l) => (
            <li key={l.label} className="flex"><ExtLink label={l.label} url={l.url} /></li>
          ))}
        </ul>
        <details className="group">
          <summary className="cursor-pointer text-sm uppercase tracking-wide text-text-muted/60 hover:text-text-primary">How the data gets there</summary>
          <p className="mt-2 text-base text-text-muted leading-relaxed">{pillar.sa.technical}</p>
        </details>
      </div>
    )
  }

  // docs
  return (
    <ul className="space-y-2">
      {pillar.sa.docs.map((d) => (
        <li key={d.label} className="flex"><ExtLink label={d.label} url={d.url} /></li>
      ))}
    </ul>
  )
}

function PillarModule({ pillar }) {
  const [depth, setDepth] = useState('slide')
  return (
    <section className="mb-12 rounded-xl border border-line bg-ink-800/40 overflow-hidden">
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-baseline gap-3 mb-1">
          <span className="text-accent-blue font-bold text-lg">{pillar.number}</span>
          <h2 className="text-2xl font-semibold text-text-primary leading-snug">{pillar.question}</h2>
        </div>
        <p className="text-base text-text-muted">{pillar.shortTitle} · <span className="font-mono text-sm text-text-muted/70">{pillar.memoRef}</span></p>
      </div>

      {/* Depth selector */}
      <div className="flex flex-wrap gap-1 px-6 border-b border-line/40">
        {DEPTHS.map((d) => {
          const active = depth === d.key
          return (
            <button
              key={d.key}
              onClick={() => setDepth(d.key)}
              title={d.hint}
              className={
                'px-3 py-2 text-base font-medium rounded-t transition-colors border-b-2 -mb-px ' +
                (active
                  ? 'border-accent-blue text-accent-blue'
                  : 'border-transparent text-text-muted hover:text-text-primary')
              }
            >
              {d.label}
            </button>
          )
        })}
      </div>

      <div className="px-6 py-5">
        <DepthPanel depth={depth} pillar={pillar} />
      </div>
    </section>
  )
}

export default function SAEnablement() {
  return (
    <main className="mx-auto max-w-4xl px-8 py-12">
      <p className="text-xs uppercase tracking-widest text-accent-blue/80 font-semibold mb-3">SA Enablement</p>
      <h1 className="text-4xl font-bold text-text-primary leading-tight mb-4">Every part of the framework, at any depth</h1>
      <p className="text-xl text-text-muted leading-relaxed mb-4 max-w-3xl">
        Same questions the seller uses. For each, climb only as far as the room wants: stay in the
        slide with an animated visual, run a scripted Instruqt demo, drive the live cluster, or drop into
        the Elastic documentation.
      </p>
      <p className="text-base text-text-muted/70 mb-12">
        Carrying the message first? See <Link to="/enablement/sales" className="text-accent-teal hover:underline">sales enablement</Link>.
      </p>

      {PILLARS.map((p) => <PillarModule key={p.id} pillar={p} />)}

      {/* Capstone */}
      <section className="rounded-xl border border-line bg-ink-800/60 p-6">
        <h2 className="text-2xl font-semibold text-text-primary mb-2">{CAPSTONE.question}</h2>
        <p className="text-lg text-text-primary font-medium mb-3">{CAPSTONE.headline}</p>
        <ul className="space-y-2 mb-4 pl-1">
          {CAPSTONE.points.map((pt, i) => (
            <li key={i} className="flex gap-3 text-base text-text-primary leading-relaxed">
              <span className="text-accent-blue mt-1 shrink-0">▪</span><span>{pt}</span>
            </li>
          ))}
        </ul>
        {CAPSTONE.live.map((l) => (
          <ExtLink key={l.label} label={l.label} url={l.url} />
        ))}
      </section>
    </main>
  )
}
