import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { fileURLToPath } from 'node:url'

// Hub build: the page must be fully self-contained (it is served by the Elastic Hub
// under a sandboxing CSP), so external font/favicon links are stripped.
const stripExternalLinks = () => ({
  name: 'strip-external-links',
  transformIndexHtml(html) {
    return html.replace(/^\s*<link [^>]*(fonts\.g|favicon)[^>]*>\s*\n/gm, '')
  },
})

// The Hub stores the page inside a ```html fenced block and inlines the bundle
// into a <script> tag, so the emitted JS must contain neither a literal </script>
// (would terminate the tag) nor a literal ``` run (would break the fence — Prism's
// markdown grammar regexes contain them). Both rewrites are identity escapes in
// JS strings and non-unicode regex literals, and valid JS cannot carry these
// sequences outside string/regex/comment contexts.
const fenceSafety = () => ({
  name: 'fence-safety',
  renderChunk(code) {
    return code.replace(/<\/script/gi, '<\\/script').replace(/```/g, '`\\`\\`')
  },
})

export default defineConfig(({ mode }) => {
  const hub = mode === 'hub'
  return {
    plugins: [
      react(),
      ...(hub ? [stripExternalLinks(), fenceSafety(), viteSingleFile({ removeViteModuleLoader: true })] : []),
    ],
    resolve: {
      alias: {
        '@app-content': fileURLToPath(
          new URL(hub ? './src/content/inlineContent.js' : './src/content/fetchContent.js', import.meta.url),
        ),
      },
    },
    define: {
      __HUB_BUILD__: JSON.stringify(hub),
    },
    build: hub ? { outDir: 'dist-hub', chunkSizeWarningLimit: 20000 } : {},
  }
})
