import React, { useRef, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { EuiToolTip } from '@elastic/eui'
import { useTheme } from '../ThemeContext.jsx'
import logoColor from '../img/logo-elastic-horizontal-color.svg'
import logoReverse from '../img/logo-elastic-horizontal-color-reverse.svg'

const HomeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
    <path fillRule="evenodd" d="M13 9.414V13.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V9.414l1-1V13h2v-3a1 1 0 0 1 1-1h2l.103.005A1 1 0 0 1 10 10v3h2V8.414l1 1ZM7 13h2v-3H7v3Z" clipRule="evenodd"/>
    <path d="M8.048 2.002a1.002 1.002 0 0 1 .659.291l6 6L14 9 8 3 2 9l-.707-.707 6-6 .076-.068a.994.994 0 0 1 .679-.223ZM13 5.172l-1-1V2h1v3.172Z"/>
  </svg>
)

const DocumentsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
    <path fillRule="evenodd" d="M4 1a1 1 0 0 1 1-1h4.707L14 4.293V13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V1Zm5 0H5v12h8V5h-3a1 1 0 0 1-1-1V1Zm1 .707L12.293 4H10V1.707Z" clipRule="evenodd"/>
    <path d="M3 15V2H2v13a1 1 0 0 0 1 1h9v-1H3Z"/>
  </svg>
)

const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
    <path d="M4.05 12.95A6.982 6.982 0 0 1 2 8c0-1.79.684-3.583 2.05-4.95A6.982 6.982 0 0 1 9 1a1 1 0 0 1 .708 1.707 4.982 4.982 0 0 0-1.465 3.536 4.98 4.98 0 0 0 1.465 3.535 4.98 4.98 0 0 0 3.535 1.465 1 1 0 0 1 .707 1.707A6.981 6.981 0 0 1 9 15a6.983 6.983 0 0 1-4.95-2.05Zm.708-.707A5.983 5.983 0 0 0 9 14c1.535 0 3.07-.586 4.242-1.757a5.98 5.98 0 0 1-4.018-1.545L9 10.485a5.982 5.982 0 0 1-1.758-4.242A5.986 5.986 0 0 1 9 2a5.983 5.983 0 0 0-4.243 1.757A5.98 5.98 0 0 0 3 8l.006.288a5.978 5.978 0 0 0 1.75 3.955Z"/>
  </svg>
)

const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
    <path d="M8.5 15h-1v-2h1v2Zm-3.674-3.107-1.414 1.414-.707-.707 1.414-1.415.707.708Zm8.479.707-.707.707-1.414-1.414.707-.708 1.414 1.415Z"/>
    <path fillRule="evenodd" d="M8 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm0 1a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" clipRule="evenodd"/>
    <path d="M3.005 8.505h-2v-1h2v1Zm12 0h-2v-1h2v1ZM4.82 4.114l-.708.707-1.414-1.414.707-.707L4.82 4.114Zm8.492-.707-1.414 1.414-.708-.707L12.605 2.7l.707.707ZM8.5 3h-1V1h1v2Z"/>
  </svg>
)

const NAV_ITEMS = [
  { label: 'Maturity Levels', to: '/maturity/small/1', matchPrefix: '/maturity' },
  { label: 'Asset Inventory', to: '/asset-inventory',  matchPrefix: '/asset-inventory' },
]

export default function Nav() {
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const headerRef = useRef(null)
  const [printablesOpen, setPrintablesOpen] = useState(false)

  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const update = () => document.documentElement.style.setProperty('--nav-height', `${el.getBoundingClientRect().height}px`)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const isHome = location.pathname === '/'

  return (
    <>
    <header ref={headerRef} className="sticky top-0 z-50 border-b border-line bg-ink-900/95 backdrop-blur">
      <div className="mx-auto max-w-[1800px] px-8 py-4 flex items-center gap-6">
        {/* Logo + title */}
        <div className="flex items-center gap-3 shrink-0">
          <img
            src={theme === 'dark' ? logoReverse : logoColor}
            alt="Elastic"
            className="h-8 w-auto"
          />
          <div className="h-7 w-px bg-line" />
          <h1 className="text-xl font-bold text-text-primary leading-tight">
            Elastic M-26-14 Reference Architecture
          </h1>
        </div>

        {/* Nav + controls */}
        <div className="ml-auto flex items-center gap-1">
          {/* Home — Compliance */}
          <Link
            to="/"
            className={
              `flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors ` +
              (isHome
                ? 'bg-accent-teal/15 text-accent-teal'
                : 'text-text-muted hover:text-text-primary hover:bg-ink-700')
            }
          >
            <HomeIcon />
            <span>M-26-14 Compliance</span>
          </Link>

          {NAV_ITEMS.map((item) => (
            <React.Fragment key={item.to}>
              <span className="px-1 text-text-muted/40 text-xs select-none">|</span>
              <Link
                to={item.to}
                className={
                  `px-3 py-1.5 rounded text-sm font-medium transition-colors ` +
                  (location.pathname.startsWith(item.matchPrefix)
                    ? 'bg-accent-teal/15 text-accent-teal'
                    : 'text-text-muted hover:text-text-primary hover:bg-ink-700')
                }
              >
                {item.label}
              </Link>
            </React.Fragment>
          ))}

          {/* Theme toggle */}
          <EuiToolTip content={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} position="bottom">
            <button
              onClick={toggleTheme}
              className="ml-2 p-2 rounded hover:bg-ink-700 text-text-muted hover:text-text-primary transition-colors"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
          </EuiToolTip>

          {/* Printables */}
          <button
            onClick={() => setPrintablesOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-colors text-text-muted hover:text-text-primary hover:bg-ink-700"
          >
            <span>Printables</span>
            <DocumentsIcon />
          </button>
        </div>
      </div>
    </header>

    {printablesOpen && (
      <PrintablesFlyout onClose={() => setPrintablesOpen(false)} />
    )}
    </>
  )
}

const PRINTABLES = [
  {
    title: 'Elastic M-26-14 Reference Architecture',
    description: 'Elastic reference architecture diagrams and deployment guidance for achieving M-26-14 compliance across all four maturity levels.',
    detail: 'PDF · Reference Architecture',
    href: '/docs/Elastic%20M-26-14%20Reference%20Architectures.pdf',
  },
  {
    title: 'OMB M-26-14 Memorandum: Ensuring Effective and Efficient Agency Logging and Network Visibility to Defend Against Evolving Cyber Threats',
    description: 'The official OMB memorandum establishing the M-26-14 Logging Maturity Model requirements for federal agencies.',
    detail: 'PDF · Official OMB Memorandum',
    href: 'https://www.whitehouse.gov/wp-content/uploads/2026/05/M-26-14-Ensuring-Effective-and-Efficient-Agency-Logging-and-Network-Visibility-to-Defend-Against-Evolving-Cyber-Threats.pdf',
  },
  {
    title: 'CISA M-26-14 Logging Reference Architecture',
    description: 'CISA\'s official Logging Reference Architecture (LRA) resource page, the authoritative technical baseline for M-26-14 compliance.',
    detail: 'Web · CISA Resource',
    href: 'https://www.cisa.gov/resources-tools/resources/logging-reference-architecture',
  },
]

function PrintablesFlyout({ onClose }) {
  const overlayRef = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex justify-end"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-md h-full bg-ink-900 border-l border-line shadow-2xl flex flex-col overflow-y-auto"
        style={{ borderStyle: 'solid' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-line/40">
          <div className="flex items-center gap-2 text-text-primary font-semibold text-lg">
            <DocumentsIcon />
            <span>Printables</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-ink-700 text-text-muted hover:text-text-primary transition-colors"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2.293 2.293a1 1 0 0 1 1.414 0L8 6.586l4.293-4.293a1 1 0 1 1 1.414 1.414L9.414 8l4.293 4.293a1 1 0 0 1-1.414 1.414L8 9.414l-4.293 4.293a1 1 0 0 1-1.414-1.414L6.586 8 2.293 3.707a1 1 0 0 1 0-1.414Z"/>
            </svg>
          </button>
        </div>

        <p className="px-6 pt-4 pb-2 text-sm text-text-muted leading-relaxed">
          Printable and shareable overviews and reference guides for how Elastic can be your organization's M-26-14 compliance accelerator.
        </p>

        {/* Printable cards */}
        <div className="flex flex-col gap-3 px-6 py-4">
          {PRINTABLES.map((p) => (
            <a
              key={p.title}
              href={p.href}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-ink-800 p-5 flex flex-col gap-2 hover:bg-ink-700 transition-colors group"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm font-semibold text-text-primary leading-snug">{p.title}</span>
                <svg className="w-4 h-4 text-text-muted group-hover:text-text-primary transition-colors shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
              <p className="text-sm text-text-muted leading-relaxed">{p.description}</p>
              <p className="text-xs text-text-muted/60 italic">{p.detail}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
