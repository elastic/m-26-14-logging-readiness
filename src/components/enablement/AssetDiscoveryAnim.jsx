import React from 'react'

// Reference animated visual for Pillar 1 (Asset Visibility).
// Managed endpoints report via agent; unmanaged devices are found by a network
// scan; both converge into the single m_26_14-assets record. Pure CSS/SVG, no
// deps, honours the app's color tokens, and respects prefers-reduced-motion.
export default function AssetDiscoveryAnim() {
  return (
    <div className="relative w-full rounded-xl border border-line/40 bg-ink-800/40 p-6 overflow-hidden">
      <style>{`
        @keyframes ad-flow { 0% { stroke-dashoffset: 44; } 100% { stroke-dashoffset: 0; } }
        @keyframes ad-pulse { 0%,100% { opacity: .35; } 50% { opacity: 1; } }
        @keyframes ad-sweep { 0% { transform: rotate(-42deg); } 100% { transform: rotate(42deg); } }
        @keyframes ad-pop { 0%,60% { opacity: 0; transform: scale(.4); } 75% { opacity: 1; transform: scale(1.15); } 100% { opacity: 1; transform: scale(1); } }
        .ad-line { stroke-dasharray: 6 6; animation: ad-flow 1.1s linear infinite; }
        .ad-managed { animation: ad-pulse 2.4s ease-in-out infinite; }
        .ad-sweep { transform-origin: 84px 150px; animation: ad-sweep 2.8s ease-in-out infinite alternate; }
        .ad-unknown { animation: ad-pop 3.2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .ad-line, .ad-managed, .ad-sweep, .ad-unknown { animation: none; }
          .ad-unknown { opacity: 1; }
        }
      `}</style>
      <svg viewBox="0 0 520 300" className="w-full h-auto" role="img" aria-label="Managed and unmanaged devices converging into one asset record">
        {/* labels */}
        <text x="84" y="26" textAnchor="middle" className="fill-[currentColor] text-text-muted" fontSize="12" fill="currentColor" opacity="0.7">Managed (osquery)</text>
        <text x="84" y="196" textAnchor="middle" fontSize="12" fill="currentColor" opacity="0.7">Network discovery</text>
        <text x="430" y="26" textAnchor="middle" fontSize="12" fill="currentColor" opacity="0.7">m_26_14-assets</text>

        {/* managed endpoints */}
        {[60, 96, 132].map((y, i) => (
          <g key={`m${i}`} className="ad-managed" style={{ animationDelay: `${i * 0.4}s` }}>
            <rect x="52" y={y} width="64" height="24" rx="4" fill="#0B64DD" opacity="0.25" />
            <rect x="52" y={y} width="64" height="24" rx="4" fill="none" stroke="#0B64DD" strokeWidth="1.5" />
            <circle cx="64" cy={y + 12} r="3.5" fill="#00BFB3" />
          </g>
        ))}

        {/* radar sweep + unknown devices */}
        <circle cx="84" cy="150" r="0" />
        <g opacity="0.5">
          <line x1="84" y1="150" x2="84" y2="150" />
          <path className="ad-sweep" d="M84 150 L84 96 A54 54 0 0 1 130 150 Z" fill="#F04E98" opacity="0.12" />
        </g>
        {[[150, 250], [176, 232], [162, 268]].map(([y, x], i) => (
          <g key={`u${i}`} className="ad-unknown" style={{ animationDelay: `${i * 0.9}s` }}>
            <rect x={x - 22} y={y - 10} width="44" height="20" rx="4" fill="#F04E98" opacity="0.18" />
            <rect x={x - 22} y={y - 10} width="44" height="20" rx="4" fill="none" stroke="#F04E98" strokeWidth="1.4" strokeDasharray="3 3" />
            <text x={x} y={y + 4} textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.85">?</text>
          </g>
        ))}

        {/* flow lines into the store */}
        {[72, 108, 150, 176].map((y, i) => (
          <path key={`l${i}`} className="ad-line" d={`M120 ${y} C 240 ${y}, 300 138, 386 138`} fill="none" stroke={i < 3 ? '#0B64DD' : '#F04E98'} strokeWidth="1.6" opacity="0.7" />
        ))}

        {/* canonical asset store cylinder */}
        <g>
          <ellipse cx="430" cy="112" rx="44" ry="12" fill="#00BFB3" opacity="0.25" />
          <path d="M386 112 L386 164 A44 12 0 0 0 474 164 L474 112" fill="#00BFB3" opacity="0.12" />
          <path d="M386 112 L386 164 A44 12 0 0 0 474 164 L474 112" fill="none" stroke="#00BFB3" strokeWidth="1.5" />
          <ellipse cx="430" cy="112" rx="44" ry="12" fill="none" stroke="#00BFB3" strokeWidth="1.5" />
          <text x="430" y="150" textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.85">1 record</text>
          <text x="430" y="150" textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.85" dy="14">/ device</text>
        </g>
      </svg>
      <p className="mt-3 text-xs text-text-muted/70 text-center">
        Agent-reported and network-discovered devices resolve into one canonical asset record.
      </p>
    </div>
  )
}
