import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'

// The single-file build (npm run build:single) is served as one static page with
// no rewrite rules, so it routes on the hash instead of the path.
const Router = import.meta.env.VITE_HASH_ROUTER === '1' ? HashRouter : BrowserRouter
import { EuiProvider } from '@elastic/eui'
import { ThemeProvider, useTheme } from './ThemeContext.jsx'
import App from './App.jsx'
import './index.css'

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
