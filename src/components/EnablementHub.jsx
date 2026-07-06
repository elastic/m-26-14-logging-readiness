import React from 'react'
import { Link } from 'react-router-dom'
import { HUB, PILLARS } from '../data/enablementFramework.js'

const accentClass = {
  teal: 'hover:border-accent-teal/60 [&_.chip]:text-accent-teal [&_.chip]:bg-accent-teal/15',
  blue: 'hover:border-accent-blue/60 [&_.chip]:text-accent-blue [&_.chip]:bg-accent-blue/15',
}

export default function EnablementHub() {
  return (
    <main className="mx-auto max-w-5xl px-8 py-12">
      <p className="text-xs uppercase tracking-widest text-accent-teal/80 font-semibold mb-3">Internal · Field Enablement</p>
      <h1 className="text-4xl font-bold text-text-primary leading-tight mb-4">{HUB.title}</h1>
      <p className="text-xl text-text-muted leading-relaxed mb-10 max-w-3xl">{HUB.intro}</p>

      {/* Tracks */}
      <div className="grid gap-4 sm:grid-cols-3 mb-14">
        {HUB.tracks.map((t) => (
          <Link
            key={t.id}
            to={t.to}
            className={`group rounded-xl border border-line bg-ink-800 p-5 flex flex-col gap-2 transition-colors ${accentClass[t.accent] || ''}`}
          >
            <span className="chip self-start text-[11px] font-semibold px-2 py-0.5 rounded uppercase tracking-wide">{t.id === 'walkthrough' ? 'Customer' : 'Field'}</span>
            <span className="text-lg font-semibold text-text-primary group-hover:underline">{t.label}</span>
            <span className="text-base text-text-muted leading-relaxed">{t.tagline}</span>
            <span className="mt-auto pt-2 text-sm text-text-muted/60 italic">{t.for}</span>
          </Link>
        ))}
      </div>

      {/* The spine */}
      <h2 className="text-2xl font-semibold text-text-primary mb-2">The framework</h2>
      <p className="text-base text-text-muted mb-6 max-w-3xl">
        Four questions an auditor asks, plus the executive roll-up. Both enablement tracks follow this spine, so a seller and an SA are always talking about the same thing at different depths.
      </p>
      <ol className="space-y-3">
        {PILLARS.map((p) => (
          <li key={p.id} className="rounded-lg border border-line/60 bg-ink-800/50 p-4 flex items-start gap-4">
            <span className="shrink-0 mt-0.5 w-8 h-8 rounded-full bg-accent-teal/15 text-accent-teal font-bold flex items-center justify-center">{p.number}</span>
            <div>
              <p className="text-lg font-semibold text-text-primary">{p.question}</p>
              <p className="text-base text-text-muted">{p.shortTitle} · <span className="font-mono text-sm text-text-muted/70">{p.memoRef}</span></p>
            </div>
          </li>
        ))}
      </ol>
    </main>
  )
}
