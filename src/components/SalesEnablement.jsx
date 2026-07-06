import React from 'react'
import { Link } from 'react-router-dom'
import { PILLARS, CAPSTONE } from '../data/enablementFramework.js'

export default function SalesEnablement() {
  return (
    <main className="mx-auto max-w-4xl px-8 py-12">
      <p className="text-xs uppercase tracking-widest text-accent-teal/80 font-semibold mb-3">Sales Enablement</p>
      <h1 className="text-4xl font-bold text-text-primary leading-tight mb-4">The unique value Elastic brings to M-26-14</h1>
      <p className="text-xl text-text-muted leading-relaxed mb-4 max-w-3xl">
        M-26-14 is a logging and network-visibility mandate. Every vendor will claim to "do logging."
        The message that wins is where Elastic does something the others structurally cannot. Each
        question below carries the headline, the one-line soundbite, why it lands, and the competitive wedge.
      </p>
      <p className="text-base text-text-muted/70 mb-12">
        Need to go deeper on any of these? Send the SA to <Link to="/enablement/sa" className="text-accent-blue hover:underline">SA enablement</Link>.
      </p>

      {PILLARS.map((p) => (
        <section key={p.id} className="mb-14">
          <div className="flex items-baseline gap-3 mb-2">
            <span className="text-accent-teal font-bold text-lg">{p.number}</span>
            <h2 className="text-2xl font-semibold text-text-primary leading-snug">{p.question}</h2>
          </div>
          <p className="text-lg text-text-primary font-medium mb-4">{p.sales.headline}</p>

          <div className="rounded-lg border-l-2 border-accent-teal/60 bg-ink-800/40 pl-4 py-3 mb-5">
            <p className="text-sm uppercase tracking-wide text-text-muted/60 mb-1">Say this</p>
            <p className="text-lg text-text-primary italic">&ldquo;{p.sales.soundbite}&rdquo;</p>
          </div>

          <p className="text-sm uppercase tracking-wide text-text-muted/60 mb-2">Why it lands</p>
          <ul className="space-y-2 mb-5 pl-1">
            {p.sales.uvp.map((u, i) => (
              <li key={i} className="flex gap-3 text-lg text-text-primary leading-relaxed">
                <span className="text-accent-teal mt-1 shrink-0">▪</span>
                <span>{u}</span>
              </li>
            ))}
          </ul>

          <div className="rounded-lg bg-ink-800 p-4">
            <p className="text-sm uppercase tracking-wide text-accent-blue/80 mb-1 font-semibold">The wedge</p>
            <p className="text-base text-text-muted leading-relaxed">{p.sales.wedge}</p>
          </div>
        </section>
      ))}

      {/* Capstone */}
      <section className="rounded-xl border border-line bg-ink-800/60 p-6">
        <h2 className="text-2xl font-semibold text-text-primary mb-2">{CAPSTONE.question}</h2>
        <p className="text-lg text-text-primary font-medium mb-2">{CAPSTONE.headline}</p>
        <p className="text-lg text-text-muted italic leading-relaxed">&ldquo;{CAPSTONE.soundbite}&rdquo;</p>
      </section>
    </main>
  )
}
