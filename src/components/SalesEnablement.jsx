import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { PILLARS, CAPSTONE, REQUIREMENTS, HOW_ELASTIC_HELPS } from '../data/enablementFramework.js'

function renderBullet({ text, link }) {
  const idx = text.indexOf(link.phrase)
  return (
    <>
      {text.slice(0, idx)}
      <a href={link.url} target="_blank" rel="noreferrer" className="text-accent-blue hover:underline">{link.phrase}</a>
      {text.slice(idx + link.phrase.length)}
    </>
  )
}

export default function SalesEnablement() {
  const [expanded, setExpanded] = useState({})
  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  return (
    <main className="mx-auto max-w-4xl px-8 py-12">
      <p className="text-xs uppercase tracking-widest text-accent-teal/80 font-semibold mb-3">Sales Enablement</p>
      <h1 className="text-4xl font-bold text-text-primary leading-tight mb-4">The unique value Elastic brings to M-26-14</h1>
      <p className="text-xl text-text-muted leading-relaxed mb-4">
        M-26-14 is a logging and network-visibility mandate. Every vendor will claim to "do logging."
        The message that wins is where Elastic does something the others structurally cannot. Each
        question below carries the headline, the one-line soundbite, why it lands, and the competitive wedge.
      </p>
      {/* M-21-31 vs. M-26-14 */}
      <section className="mb-14">
        <h2 className="text-2xl font-semibold text-text-primary mb-4">{REQUIREMENTS.title}</h2>
        <div className="rounded-lg bg-ink-700 px-6 py-5 divide-y divide-line">
          {REQUIREMENTS.callout.subsections.map((s, i) => (
            <div key={i} className="py-5 first:pt-0 last:pb-0">
              <h3 className="text-base font-semibold text-text-primary mb-2">{s.title}</h3>
              <p className="text-base text-text-muted leading-relaxed">{s.text}</p>
              <div className="mt-4 rounded-lg border-l-2 border-accent-blue bg-ink-800 p-4">
                <p className="text-sm uppercase tracking-wide text-accent-blue font-semibold mb-1">What this means for the Sales Team</p>
                <p className="text-base text-text-primary leading-relaxed">{s.aeCallout}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How Elastic Helps M-26-14 Readiness */}
      <section className="mb-14">
        <h2 className="text-2xl font-semibold text-text-primary mb-3">{HOW_ELASTIC_HELPS.title}</h2>
        <p className="text-lg text-text-muted leading-relaxed mb-6">{HOW_ELASTIC_HELPS.intro}</p>
        <div className="rounded-lg bg-ink-700 px-6 py-5 divide-y divide-line">
          {HOW_ELASTIC_HELPS.items.map((item, i) => (
            <div key={i} className="py-5 first:pt-0 last:pb-0">
              <h3 className="text-base font-semibold text-text-primary mb-2">{item.heading}</h3>
              <ul className="space-y-1">
                {item.bullets.map((bullet, j) => (
                  <li key={j} className="flex gap-3 text-base text-text-muted leading-relaxed">
                    <span className="text-accent-teal mt-1 shrink-0">▪</span>
                    <span>{typeof bullet === 'string' ? bullet : renderBullet(bullet)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 rounded-lg border-l-2 border-accent-blue bg-ink-800 p-4">
                <p className="text-sm uppercase tracking-wide text-accent-blue font-semibold mb-1">What this means for the Sales Team</p>
                <p className="text-base text-text-primary leading-relaxed">{item.aeCallout}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* M-26-14 Discovery Playbook */}
      <section className="mb-14">
        <h2 className="text-2xl font-semibold text-text-primary mb-2">M-26-14 Discovery Playbook</h2>
        <p className="text-base text-text-muted/70 mb-10">The questions to ask in discovery, with the message that wins on each.</p>

        {PILLARS.map((p) => (
          <section key={p.id} className="mb-4 border border-line rounded-lg overflow-hidden">
            <button
              onClick={() => toggle(p.id)}
              className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-ink-800/40 transition-colors"
            >
              <div className="flex items-baseline gap-3">
                <span className="text-accent-teal font-bold text-lg">{p.number}</span>
                <h2 className="text-xl font-semibold text-text-primary leading-snug">{p.question}</h2>
              </div>
              <span className="text-text-muted shrink-0 text-lg">{expanded[p.id] ? '−' : '+'}</span>
            </button>

            {expanded[p.id] && (
              <div className="px-5 pb-6 pt-2 border-t border-line space-y-5">
                <div className="rounded-lg border-l-2 border-accent-teal/60 bg-ink-800/40 pl-4 py-3">
                  <p className="text-sm uppercase tracking-wide text-text-muted/60 mb-1">Ask this</p>
                  <p className="text-lg text-text-primary italic">&ldquo;{p.sales.ask}&rdquo;</p>
                </div>

                <div>
                  <p className="text-sm uppercase tracking-wide text-text-muted/60 mb-1">Listen for</p>
                  <p className="text-base text-text-muted leading-relaxed">{p.sales.listenFor}</p>
                </div>

                <div>
                  <p className="text-sm uppercase tracking-wide text-text-muted/60 mb-1">Value in a line</p>
                  <p className="text-base text-text-muted leading-relaxed">{p.sales.value}</p>
                </div>

                <div className="rounded-lg bg-ink-800 p-4">
                  <p className="text-sm uppercase tracking-wide text-accent-blue/80 mb-1 font-semibold">Deal read</p>
                  <p className="text-base text-text-muted leading-relaxed">{p.sales.dealRead}</p>
                </div>
              </div>
            )}
          </section>
        ))}
      </section>

      {/* Capstone */}
      <section className="rounded-xl border border-line bg-ink-800/60 p-6">
        <h2 className="text-2xl font-semibold text-text-primary mb-2">{CAPSTONE.question}</h2>
        <p className="text-lg text-text-primary font-medium mb-2">{CAPSTONE.headline}</p>
        <p className="text-lg text-text-muted italic leading-relaxed">&ldquo;{CAPSTONE.soundbite}&rdquo;</p>
      </section>

      <p className="text-base text-text-muted/70 mt-10">
        Need to go deeper on any of these? Send the SA to <Link to="/enablement/sa" className="text-accent-blue hover:underline">SA enablement</Link>.
      </p>
    </main>
  )
}
