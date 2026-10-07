import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
import { EuiProvider } from '@elastic/eui'
import { ThemeProvider, useTheme } from './ThemeContext.jsx'
import App from './App.jsx'
import './index.css'

// The single-file Hub build is served from an Atrium URL that is not one of this
// app's routes, inside a sandbox with an opaque origin, so it routes in memory.
// That leaves location.hash to the in-page anchors and the #capability and
// #type-<key> deep links the Readiness Pack page reads.
const Router = __HUB_BUILD__ ? MemoryRouter : BrowserRouter

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
