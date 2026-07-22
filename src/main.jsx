import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import { EuiProvider } from '@elastic/eui'
import { ThemeProvider, useTheme } from './ThemeContext.jsx'
import App from './App.jsx'
import './index.css'

// The Hub single-file build is served from the Hub's Present endpoint URL, where
// path-based routing can't work (and pushState is unreliable on the sandboxed
// opaque origin) — hash routing keeps navigation self-contained.
const Router = __HUB_BUILD__ ? HashRouter : BrowserRouter

function ThemedApp() {
  const { theme } = useTheme()
  return (
    <EuiProvider colorMode={theme === 'dark' ? 'DARK' : 'LIGHT'}>
      <Router>
        <App />
      </Router>
    </EuiProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  </React.StrictMode>,
)
