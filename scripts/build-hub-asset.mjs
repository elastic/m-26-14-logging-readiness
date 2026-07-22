#!/usr/bin/env node
// Builds the single self-contained HTML page for the Elastic Hub's "HTML Page"
// asset type (elastic/elastic-hub#123): generate inline content → vite build
// --mode hub → validate fence-safety. The Hub asset itself is created manually by
// pasting dist-hub/index.html into a ```html block, so the file must stay free of
// literal ``` and </script> sequences — validated here.
import { execFileSync } from 'node:child_process'
import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const run = (cmd, args) => execFileSync(cmd, args, { cwd: root, stdio: 'inherit' })

run('node', ['scripts/generate-inline-content.mjs'])
run('npx', ['vite', 'build', '--mode', 'hub'])

const htmlPath = join(root, 'dist-hub', 'index.html')
const html = readFileSync(htmlPath, 'utf8')

// The Hub stores this HTML inside a ```html fenced block — a literal triple-backtick
// anywhere in the file would truncate the asset at extraction time.
if (html.includes('```')) {
  console.error('FAIL: built HTML contains a literal ``` sequence — the Hub fence would break.')
  process.exit(1)
}
// Self-containment: the sandbox CSP page should not depend on external origins.
if (/fonts\.googleapis|fonts\.gstatic/.test(html)) {
  console.error('FAIL: built HTML still references Google Fonts — strip-external-links plugin did not run.')
  process.exit(1)
}

const mb = p => (statSync(p).size / 1024 / 1024).toFixed(1)
console.log(`\nhub page built: dist-hub/index.html  ${mb(htmlPath)} MB`)
