import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { sizingTable, SIZE_ORDER } from '../data/sizing.js'
import DeploymentInfographic from './DeploymentInfographic.jsx'

// ─── Data ─────────────────────────────────────────────────────────────────────

const POSTURES = [
  {
    id: 'full',
    label: 'Full Elastic Collection',
    tag: 'Greenfield / New Build',
    tagColor: 'text-accent-teal border-accent-teal/40 bg-accent-teal/10',
    accentBorder: 'border-accent-teal/40',
    accentText: 'text-accent-teal',
    tools: [
      'Elastic Agent + Fleet (central policy management)',
      'Elastic Defend (EDR — Appendix B: D, F, G, H)',
      'Filebeat, Winlogbeat, Auditbeat modules',
      'Logstash input plugins (syslog, Kafka, JDBC, S3)',
    ],
    desc: 'Elastic owns the full collection stack. Fleet centrally manages all agent policies and coverage gaps. Best for new builds targeting complete Appendix B coverage from day one.',
    levels: [1, 2, 3, 4],
  },
  {
    id: 'hybrid',
    label: 'Hybrid Collection',
    tag: 'Most Common',
    tagColor: 'text-accent-blue border-accent-blue/40 bg-accent-blue/10',
    accentBorder: 'border-accent-blue/40',
    accentText: 'text-accent-blue',
    tools: [
      'Elastic Agent alongside existing SIEM agents',
      'Logstash to ingest from Splunk / QRadar / Sentinel',
      'Kafka or S3 pipeline bridge (existing collector → Elastic)',
      'Fleet enrollment for net-new sources only',
    ],
    desc: 'Elastic indexes alongside existing collection tools. Logstash or Kafka translates formats to ECS. Minimizes disruption to existing SOC workflows while closing Appendix B gaps.',
    levels: [1, 2, 3, 4],
  },
  {
    id: 'index-only',
    label: 'Index / Connect Only',
    tag: 'Modernize Existing Archive',
    tagColor: 'text-accent-purple border-accent-purple/40 bg-accent-purple/10',
    accentBorder: 'border-accent-purple/40',
    accentText: 'text-accent-purple',
    tools: [
      'S3 / GCS / Azure Blob connector (frozen searchable snapshots)',
      'JDBC ingest from existing log databases',
      'Reindex API from legacy Elasticsearch clusters',
      'Logstash S3 input to re-stream archived data',
    ],
    desc: 'Elastic makes existing long-term storage searchable without re-ingesting raw logs. Frozen-tier searchable snapshots allow CEM and THIRF queries against data already in object storage — meeting retention windows at minimal cost.',
    levels: [2, 3, 4],
  },
]


const ILM_TIERS = [
  {
    name: 'Hot',
    accentText: 'text-accent-coral',
    accentBg: 'bg-accent-coral/10 border-accent-coral/40',
    desc: 'Real-time ingest and full-speed query. SSD-backed data nodes. Primary CEM window.',
    retention: 'CEM window (L1: none req\'d · L3: ≥3mo · L4: ≥6mo)',
    levels: 'L1–L4',
  },
  {
    name: 'Cold',
    accentText: 'text-accent-purple',
    accentBg: 'bg-accent-purple/10 border-accent-purple/40',
    desc: 'Infrequent access. Fully searchable with reduced replication. Lower per-GB cost.',
    retention: 'THIRF buffer before frozen rollover',
    levels: 'L3–L4',
  },
  {
    name: 'Frozen',
    accentText: 'text-text-primary',
    accentBg: 'bg-ink-700 border-line/60',
    desc: 'Partially mounted from object storage (S3/GCS/Azure Blob). Lowest cost per GB.',
    retention: 'THIRF archive (L1: ≥6mo · L2: ≥12mo · L3/L4: ≥12mo)',
    levels: 'L1–L4',
  },
]

const SNAPSHOT_TYPES = [
  {
    name: 'Standard Snapshots',
    badge: 'THIRF Backup',
    badgeColor: 'text-accent-coral border-accent-coral/40 bg-accent-coral/10',
    desc: 'Full index backup written to object storage. Must be restored before search — not directly queryable. Lowest storage cost. Meets THIRF retrievable SLA (hours to restore depending on size).',
    uses: ['Disaster recovery and data durability', 'Long-term compliance archive beyond frozen tier', 'Cross-region replication for geo-redundancy'],
  },
  {
    name: 'Searchable Snapshots',
    badge: 'CEM + THIRF',
    badgeColor: 'text-accent-purple border-accent-purple/40 bg-accent-purple/10',
    desc: 'Index partially mounted directly from S3 into the frozen tier. Queryable without restoration. Dramatically reduces on-node storage while maintaining Kibana searchability for THIRF and extended CEM windows.',
    uses: ['Frozen-tier queries from Kibana with no restore step', 'Cost-efficient multi-month CEM extension (L3/L4)', 'On-demand forensic access to historical data'],
  },
]


const LEVEL_COLORS = {
  1: 'text-accent-teal border-accent-teal/30 bg-accent-teal/10',
  2: 'text-accent-blue border-accent-blue/30 bg-accent-blue/10',
  3: 'text-accent-purple border-accent-purple/30 bg-accent-purple/10',
  4: 'text-accent-coral border-accent-coral/30 bg-accent-coral/10',
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DeploymentOptions() {
  const [sizingOpen, setSizingOpen] = useState(true)

  return (
    <main className="mx-auto max-w-[1800px] px-8 py-10 space-y-10">

      {/* Page header */}
      <header>
        <h1 className="text-3xl font-semibold text-text-primary">Deployment Options</h1>
        <p className="mt-3 text-base text-text-muted leading-relaxed max-w-4xl">
          Elastic supports M-26-14 across the full spectrum of agency deployment postures — from
          FedRAMP High GovCloud to air-gapped enclaves. Select a deployment model to see how each
          architectural layer addresses the six M-26-14 compliance concerns: sources, collection,
          storage, indexing/search, CEM, and THIRF.
        </p>
      </header>

      {/* ── Deployment Architecture Diagrams ── */}
      <section>
        <SectionHeader
          label="Deployment Architecture"
          description="Six compliance layers — Sources, Collectors, Storage, Indexing/Search, CEM, and THIRF — mapped to Elastic capabilities for each deployment model. Select a model from the left to switch diagrams."
        />
        <div className="mt-4 rounded-lg border border-line bg-ink-800 p-5" style={{ borderStyle: 'solid' }}>
          <DeploymentInfographic />
        </div>
      </section>

      {/* ── 1. Collection Posture ── */}
      <section>
        <SectionHeader
          label="Collection Posture"
          description="How much of the Appendix B collection stack Elastic owns. All three postures satisfy M-26-14 — the right choice depends on existing tooling and timeline."
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {POSTURES.map((p, i) => (
            <div
              key={p.id}
              className={`rounded-lg border ${p.accentBorder} bg-ink-800 p-6 flex flex-col gap-4`}
              style={{ borderStyle: 'solid' }}
            >
              {/* Spectrum position indicator */}
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  {[0, 1, 2].map(j => (
                    <div
                      key={j}
                      className={`h-1.5 w-6 rounded-full ${j <= i ? `${p.accentText.replace('text-', 'bg-')}` : 'bg-line/40'}`}
                    />
                  ))}
                </div>
                <span className="text-xs text-text-muted">{i === 0 ? 'full stack' : i === 1 ? 'hybrid' : 'index only'}</span>
              </div>

              <div>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${p.tagColor}`}
                  style={{ borderStyle: 'solid' }}>
                  {p.tag}
                </span>
                <h3 className={`mt-2 text-base font-semibold ${p.accentText}`}>{p.label}</h3>
                <p className="mt-2 text-sm text-text-muted leading-relaxed">{p.desc}</p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">Collection Tools</p>
                <ul className="space-y-1.5">
                  {p.tools.map(t => (
                    <li key={t} className="flex items-start gap-2 text-sm text-text-primary">
                      <span className={`mt-1 shrink-0 w-1.5 h-1.5 rounded-full ${p.accentText.replace('text-', 'bg-')}`} />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-auto pt-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">Applicable levels</p>
                <div className="flex gap-1.5">
                  {p.levels.map(l => (
                    <span key={l} className={`text-xs font-bold px-2 py-0.5 rounded border ${LEVEL_COLORS[l]}`}
                      style={{ borderStyle: 'solid' }}>L{l}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 2. Retention & Cost ── */}
      <section>
        <SectionHeader
          label="Retention &amp; Cost Optimization"
          description="Elastic's ILM tiering and snapshot architecture maps directly to M-26-14 searchable and retrievable retention windows, scaling cost down as data ages."
        />

        {/* ILM tier flow */}
        <div className="mt-4 rounded-lg border border-line bg-ink-800 p-6" style={{ borderStyle: 'solid' }}>
          <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-4">ILM Tier Pipeline</p>
          <div className="flex flex-col md:flex-row gap-3 items-stretch">
            {ILM_TIERS.map((tier, i) => (
              <React.Fragment key={tier.name}>
                <div className={`flex-1 rounded-lg border ${tier.accentBg} p-4 flex flex-col gap-2`} style={{ borderStyle: 'solid' }}>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-bold ${tier.accentText}`}>{tier.name}</span>
                    <span className="text-[10px] text-text-muted bg-ink-900/60 px-1.5 py-0.5 rounded">{tier.levels}</span>
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed">{tier.desc}</p>
                  <p className={`text-xs font-medium ${tier.accentText} mt-auto`}>{tier.retention}</p>
                </div>
                {i < ILM_TIERS.length - 1 && (
                  <div className="hidden md:flex items-center text-text-muted/40 shrink-0">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M4 8h8M9 5l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
          <p className="mt-3 text-xs text-text-muted/70 italic">
            Cost per GB decreases hot → frozen by ~10–20×. Object storage (S3/GCS/Blob) in frozen tier typically costs $0.02–0.04/GB-month.
          </p>
        </div>

        {/* Snapshot types */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {SNAPSHOT_TYPES.map(s => (
            <div key={s.name} className="rounded-lg border border-line bg-ink-800 p-6 flex flex-col gap-3" style={{ borderStyle: 'solid' }}>
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-semibold text-text-primary">{s.name}</h3>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border shrink-0 ${s.badgeColor}`}
                  style={{ borderStyle: 'solid' }}>
                  {s.badge}
                </span>
              </div>
              <p className="text-sm text-text-muted leading-relaxed">{s.desc}</p>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">Use Cases</p>
                <ul className="space-y-1">
                  {s.uses.map(u => (
                    <li key={u} className="flex items-start gap-2 text-sm text-text-primary">
                      <span className="mt-1.5 shrink-0 w-1 h-1 rounded-full bg-text-muted/60" />
                      {u}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 3. Org Sizing ── */}
      <section>
        <button
          className="w-full flex items-center gap-3 text-left group"
          onClick={() => setSizingOpen(o => !o)}
        >
          <SectionHeader
            label="Organization Size Tiers"
            description="Reference deployment sizing across Small, Medium, and Large agency footprints. Click any row to explore the full architecture for that tier."
            noMargin
          />
          <svg
            className={`shrink-0 text-text-muted transition-transform ${sizingOpen ? 'rotate-90' : ''}`}
            width="16" height="16" viewBox="0 0 16 16" fill="none"
          >
            <path d="M5 3l6 5-6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {sizingOpen && (
          <div className="mt-4 rounded-lg border border-line bg-ink-800 p-6" style={{ borderStyle: 'solid' }}>
            <SizingTable />
            <p className="mt-3 text-sm text-text-muted italic">
              Organizations ingesting &gt; 25 TB/day (e.g., CISA, VA) should treat the Large tier as a
              starting point and engage Elastic Professional Services for custom sizing.
            </p>
          </div>
        )}
      </section>

    </main>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ label, description, noMargin }) {
  return (
    <div className={noMargin ? '' : 'mb-0'}>
      <h2
        className="text-sm font-semibold uppercase tracking-wider text-text-primary"
        dangerouslySetInnerHTML={{ __html: label }}
      />
      {description && (
        <p className="mt-1 text-sm text-text-muted leading-relaxed max-w-3xl">{description}</p>
      )}
    </div>
  )
}

// ─── Sizing table ─────────────────────────────────────────────────────────────

function SizingTable() {
  const navigate = useNavigate()
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-base border-collapse">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-text-muted">
            <th className="border-b border-line py-2 pr-4 pl-4">Size</th>
            <th className="border-b border-line py-2 pr-4">Daily ingest</th>
            <th className="border-b border-line py-2 pr-4">Hot nodes</th>
            <th className="border-b border-line py-2 pr-4">
              Cold nodes{' '}
              <span className="text-xs normal-case italic text-text-muted">(L3 / L4)</span>
            </th>
            <th className="border-b border-line py-2 pr-4">Frozen nodes</th>
            <th className="border-b border-line py-2">S3 stored</th>
          </tr>
        </thead>
        <tbody>
          {SIZE_ORDER.map((key) => {
            const s = sizingTable[key]
            return (
              <tr
                key={key}
                onClick={() => navigate(`/maturity/${key}/1`)}
                className="text-text-primary hover:bg-accent-blue/10 transition-colors cursor-pointer"
              >
                <td className="border-b border-line/60 py-4 pr-4 pl-4 font-semibold text-accent-blue">{s.label}</td>
                <td className="border-b border-line/60 py-4 pr-4">{s.ingestRange}</td>
                <td className="border-b border-line/60 py-4 pr-4">{s.hotNodes}</td>
                <td className="border-b border-line/60 py-4 pr-4">{s.coldNodes}</td>
                <td className="border-b border-line/60 py-4 pr-4">{s.frozenNodes}</td>
                <td className="border-b border-line/60 py-4">{s.s3StoredTB.toLocaleString()} TB</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
