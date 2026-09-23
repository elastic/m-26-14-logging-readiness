/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          900: 'rgb(var(--ink-900) / <alpha-value>)',
          800: 'rgb(var(--ink-800) / <alpha-value>)',
          700: 'rgb(var(--ink-700) / <alpha-value>)',
          600: 'rgb(var(--ink-600) / <alpha-value>)',
        },
        line: 'rgb(var(--color-line) / <alpha-value>)',
        surface: {
          prepend: 'rgb(var(--surface-prepend) / <alpha-value>)',
        },
        text: {
          primary: 'rgb(var(--text-primary) / <alpha-value>)',
          muted: 'rgb(var(--text-muted) / <alpha-value>)',
          neutral: 'rgb(var(--text-neutral) / <alpha-value>)',
        },
        accent: {
          teal:   'rgb(var(--accent-teal)   / <alpha-value>)',
          blue:   'rgb(var(--accent-blue)   / <alpha-value>)',
          gray:   'rgb(var(--accent-gray)   / <alpha-value>)',
          purple: 'rgb(var(--accent-purple) / <alpha-value>)',
          green:  'rgb(var(--accent-green)  / <alpha-value>)',
          coral:  'rgb(var(--accent-coral)  / <alpha-value>)',
          yellow: 'rgb(var(--accent-yellow) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}
