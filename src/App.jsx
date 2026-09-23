import React from 'react'
import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import Nav from './components/Nav.jsx'
import LevelView from './components/LevelView.jsx'
import MaturityView from './components/MaturityView.jsx'
import Capabilities from './components/Capabilities.jsx'
import CompliancePage from './components/CompliancePage.jsx'
import DemoGuide from './components/DemoGuide.jsx'
import EnablementHub from './components/EnablementHub.jsx'
import SalesEnablement from './components/SalesEnablement.jsx'
import SAEnablement from './components/SAEnablement.jsx'
import { ENABLEMENT_ON } from './flags.js'

function MaturitySizeRedirect() {
  const { size } = useParams()
  return <Navigate to={`/maturity/${size}/1`} replace />
}

export default function App() {
  return (
    <div className="min-h-screen bg-ink-900 text-text-primary pb-8">
      <Nav />
      <Routes>
        {/* Compliance — home */}
        <Route path="/" element={<CompliancePage />} />

        {/* Requirements redirects to home (now a tab in CompliancePage) */}
        <Route path="/requirements" element={<Navigate to="/" replace />} />

        {/* Legacy redirect */}
        <Route path="/compliance" element={<Navigate to="/" replace />} />

        {/* Maturity × org-size view */}
        <Route path="/maturity" element={<Navigate to="/maturity/small/1" replace />} />
        <Route path="/maturity/:size" element={<MaturitySizeRedirect />} />
        <Route path="/maturity/:size/:level" element={<MaturityView />} />

        {/* Per-level detail view (existing) */}
        <Route path="/level/:id" element={<Navigate to="small" replace />} />
        <Route path="/level/:id/:size" element={<LevelView />} />

        {/* Readiness Pack: three tabs (capabilities, asset inventory, walkthrough) */}
        <Route path="/capabilities/:tab?" element={<Capabilities />} />
        {/* Legacy redirects: the mirrored asset browser was retired (design call D-31); the walkthrough is now a tab. */}
        <Route path="/asset-inventory" element={<Navigate to="/capabilities/assets" replace />} />
        <Route path="/demo-guide" element={<Navigate to="/capabilities/walkthrough" replace />} />
        {/* Living reference-architecture document (markdown, same file the PDF was printed from; the PDF stays the marketing-approved July 2026 copy). */}
        <Route path="/reference-architecture" element={<DemoGuide src="/docs/Elastic%20M-26-14%20Reference%20Architectures.md" />} />

        {/* Field enablement — reached via the hidden logo link. Internal-only:
            mounted when the build sets VITE_ENABLEMENT=on (design call DC-8);
            the deployed customer build leaves it out and these paths fall to "/". */}
        {ENABLEMENT_ON && <Route path="/enablement" element={<EnablementHub />} />}
        {ENABLEMENT_ON && <Route path="/enablement/sales" element={<SalesEnablement />} />}
        {ENABLEMENT_ON && <Route path="/enablement/sa" element={<SAEnablement />} />}

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <footer className="fixed bottom-0 inset-x-0 z-10 border-t border-line bg-ink-900/90 backdrop-blur py-1.5 text-center text-[11px] text-text-muted/60">
        © 2026 Elastic · M-26-14 Logging Readiness Package · Static UI · No data is collected or transmitted.
      </footer>
    </div>
  )
}
