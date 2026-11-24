import React, { createContext, useContext, useState, useLayoutEffect } from 'react'

// localStorage throws SecurityError inside a sandboxed iframe (no allow-same-origin),
// which is how the hosted single-file page is embedded. Treat storage as optional.
const readTheme = () => {
  try { return localStorage.getItem('theme') } catch { return null }
}
const writeTheme = (theme) => {
  try { localStorage.setItem('theme', theme) } catch { /* storage unavailable */ }
}

const ThemeContext = createContext({ theme: 'dark', toggleTheme: () => {} })

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'dark'
    return readTheme() || 'dark'
  })

  useLayoutEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    writeTheme(theme)
  }, [theme])

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
