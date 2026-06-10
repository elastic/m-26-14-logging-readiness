import React from 'react'
import { Link } from 'react-router-dom'
import { LEVELS } from '../data/levels.js'

export function OverviewContent() {
  return (
    <div className="space-y-8 pb-20">

      {/* Title + program description + CEM/THIRF definitions */}
      <section>
        <h1 className="text-3xl font-semibold text-text-primary">
          OMB M-26-14 Logging Maturity Model Overview
        </h1>
        <p className="mt-6 text-base text-text-muted leading-relaxed">
          OMB Memorandum M-26-14 (May 22, 2026) establishes a four-level Logging Maturity Model
          for federal agencies and requires Elasticsearch-based logging architectures aligned
          with two core objectives:
        </p>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-accent-purple/40 bg-ink-800 p-7" style={{ borderStyle: 'solid' }}>
            <p className="text-lg font-semibold text-accent-purple mb-2">CEM — Continuous Event Monitoring</p>
            <p className="text-base text-text-primary leading-relaxed mb-3">
              CEM requires agencies to maintain continuous, real-time visibility into network and system
              activity across all Appendix B log categories — enabling active threat detection, timely
              alerting, and compliance reporting as events occur.
            </p>
          </div>
          <div className="rounded-lg border border-accent-coral/40 bg-ink-800 p-7" style={{ borderStyle: 'solid' }}>
            <p className="text-lg font-semibold text-accent-coral mb-2">THIRF — Threat Hunting, Investigation, Response &amp; Forensics</p>
            <p className="text-base text-text-primary leading-relaxed">
              THIRF requires agencies to preserve sufficient log history to support after-the-fact
              security operations — investigating incidents, hunting for advanced persistent threats,
              and conducting forensic analysis in response to a breach or audit.
            </p>
          </div>
        </div>
      </section>

      {/* Maturity Timeline */}
      <section className="rounded-lg border border-line bg-ink-800 pt-6 px-6 pb-2" style={{ borderStyle: 'solid' }}>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-primary mb-4">
          Maturity Timeline
        </h2>
        <Timeline />
      </section>

      {/* 4 Level cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {LEVELS.map((lvl) => (
          <LevelCard key={lvl.id} level={lvl} />
        ))}
      </section>

      {/* Metric definitions glossary */}
      <section className="pt-2">
        <h2 className="text-base font-semibold text-text-primary mb-5">
          Maturity Level Glossary
        </h2>
        <p className="text-sm text-text-muted mb-5 leading-relaxed">
          Progression through the M-26-14 Maturity Levels is primarily measured based on the following metrics:
        </p>
        <dl className="space-y-4 text-sm">
          <div>
            <dt className="font-semibold text-text-primary">Inventory visibility</dt>
            <dd className="mt-1 text-text-muted leading-relaxed">
              The percentage of the agency's total IT/OT/IoT assets captured in a centralized inventory (e.g., HWAM/SWAM).
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-text-primary">Collection coverage</dt>
            <dd className="mt-1 text-text-muted leading-relaxed">
              The percentage of inventory that is actively collected, searchable, and/or retrievable according to the agency's Logging Plan (due to CISA within 90 days after the LRA is published).
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-text-primary">Collection operations</dt>
            <dd className="mt-1 text-text-muted leading-relaxed">
              The percentage of collected data that has active detection and alerting capabilities to support CEM and THIRF activities.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-text-primary">Data retention <span className="font-normal text-text-muted">(Searchable vs. Retrievable)</span></dt>
            <dd className="mt-1 text-text-muted leading-relaxed">
              Each successive level of maturity requires a higher amount of data retention and searchability.
            </dd>
            <dl className="mt-2 ml-4 space-y-1">
              <div className="flex gap-2">
                <dt className="font-semibold text-text-primary shrink-0">Searchable:</dt>
                <dd className="text-text-muted">immediately available, actively searchable</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-semibold text-text-primary shrink-0">Retrievable:</dt>
                <dd className="text-text-muted">actively searchable after one or more intermediary steps</dd>
              </div>
            </dl>
          </div>
          <div>
            <dt className="font-semibold text-text-primary">Log management</dt>
            <dd className="mt-1 text-text-muted leading-relaxed">
              Data storage and management standards increase with each maturity level, to include encryption (both at rest and in-transit) and data integrity, JIT access, and gated deletion are required at Optimal (Level 4).
            </dd>
          </div>
        </dl>
      </section>

    </div>
  )
}

export default function Overview() {
  return (
    <main className="mx-auto max-w-[1800px] px-8 py-10">
      <OverviewContent />
    </main>
  )
}

const LEVEL_BADGE_COLOR = {
  1: {
    badge:     'text-accent-teal',
    daysColor: 'text-accent-teal',
    hover:     'hover:border-accent-teal  hover:bg-accent-teal/10  hover:ring-2 hover:ring-accent-teal/30',
  },
  2: {
    badge:     'text-accent-blue',
    daysColor: 'text-accent-blue',
    hover:     'hover:border-accent-blue  hover:bg-accent-blue/10  hover:ring-2 hover:ring-accent-blue/30',
  },
  3: {
    badge:     'text-accent-purple',
    daysColor: 'text-accent-purple',
    hover:     'hover:border-accent-purple hover:bg-accent-purple/10 hover:ring-2 hover:ring-accent-purple/30',
  },
  4: {
    badge:     'text-accent-coral',
    daysColor: 'text-accent-coral',
    hover:     'hover:border-accent-coral hover:bg-accent-coral/10 hover:ring-2 hover:ring-accent-coral/30',
  },
}

function LevelCard({ level }) {
  const lc = LEVEL_BADGE_COLOR[level.id]
  return (
    <Link
      to={`/maturity/small/${level.id}`}
      className={`flex flex-col rounded-lg border border-line bg-ink-800 p-5 transition-all ${lc.hover}`}
      style={{ borderStyle: 'solid' }}
    >
      <div className="flex items-baseline justify-between">
        <h3 className="text-lg font-semibold text-text-primary">{level.name}</h3>
        <span className={`text-xs font-semibold ${lc.badge}`}>L{level.id}</span>
      </div>

      <p className="mt-1 text-sm text-text-muted">
        Due:{' '}
        <span className={`font-semibold ${lc.daysColor}`}>{level.days}</span>
        {level.id < 4 && ' from LRA publication'}
      </p>

      {/* Appendix C maturity measurements */}
      <dl className="mt-4 space-y-2 flex-1 text-sm">
        <MRow label="Inventory visibility"  value={level.metrics.inventoryVisibility} />
        <MRow label="Collection coverage"   value={level.metrics.collectionCoverage} />
        <MRow label="Collection operations" value={level.metrics.collectionOperations} />

        {/* Data retention with Searchable / Retrievable sub-rows */}
        <div>
          <dt className="text-text-muted">Data retention</dt>
          <div className="mt-1 pl-3 space-y-1">
            <div className="flex justify-between gap-2">
              <span className="text-text-muted/70">Searchable</span>
              <span className="text-text-primary font-medium text-right">{level.searchable ?? '— not required'}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-text-muted/70">Retrievable</span>
              <span className="text-text-primary font-medium text-right">{level.retrievable}</span>
            </div>
          </div>
        </div>

        <MRow label="Log management" value={level.metrics.logManagement} />
      </dl>

      <span className="mt-4 inline-flex items-center text-sm text-accent-teal">
        View architecture →
      </span>
    </Link>
  )
}

function MRow({ label, value }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="shrink-0 text-text-muted">{label}</dt>
      <dd className="text-text-primary font-medium text-right">{value}</dd>
    </div>
  )
}


const MARKER_STYLES = {
  'accent-teal':   { bar: 'bg-accent-teal',   text: 'text-accent-teal'   },
  'accent-blue':   { bar: 'bg-accent-blue',   text: 'text-accent-blue'   },
  'pink':          { bar: 'bg-accent-purple',  text: 'text-accent-purple' },
  'accent-coral':  { bar: 'bg-accent-coral',  text: 'text-accent-coral'  },
  'gray':          { bar: 'bg-text-muted/60', text: 'text-text-muted'    },
}

function Timeline() {
  const markers = [
    { pct: 14, label: 'Submit Logging Plan', detail: '90 days',  color: 'gray'        },
    { pct: 30, label: 'L1',                  detail: '120 days', color: 'accent-teal'  },
    { pct: 50, label: 'L2',                  detail: '180 days', color: 'accent-blue'  },
    { pct: 76, label: 'L3',                  detail: '320 days', color: 'pink'         },
    { pct: 90, label: 'L4',                  detail: 'ongoing',  color: 'accent-coral' },
  ]
  return (
    <div className="relative pt-2 pb-10">
      <div className="h-1 w-full rounded-full bg-line" />
      <div className="absolute right-0 -top-3 text-xs text-text-muted">
        <span>≈ 1 year+</span>
      </div>

      <div className="absolute" style={{ left: 0, top: 0 }}>
        <svg className="text-accent-coral" width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: '1px' }}>
          <polyline points="4,4 10,10 4,16"/>
          <polyline points="10,4 16,10 10,16"/>
        </svg>
        <div className="mt-1 text-center">
          <p className="text-xs text-text-muted whitespace-nowrap">LRA publication</p>
        </div>
      </div>

      <div
        className="absolute top-0 h-1 rounded-r-full bg-gradient-to-r from-accent-coral/15 to-accent-coral/70"
        style={{ left: '76%', right: 0 }}
      />

      {markers.map((m) => {
        const s = MARKER_STYLES[m.color]
        return (
          <div key={m.pct} className="absolute" style={{ left: `${m.pct}%`, top: 0 }}>
            <div className={`h-4 w-px ${s.bar}`} />
            <div className="mt-1 -translate-x-1/2 text-center">
              <p className={`text-xs font-semibold ${s.text} whitespace-nowrap`}>{m.label}</p>
              <p className="text-xs text-text-muted whitespace-nowrap">{m.detail}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
