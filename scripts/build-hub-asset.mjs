#!/usr/bin/env node
// Builds the single self-contained HTML page that the build-hub-asset workflow
// publishes to the Elastic Hub Atrium assets (field and GPS hubs) and commits to
// hub/: generate inline content, run vite build --mode hub, then validate the page.
//
// Atrium serves the page under a sandbox CSP without allow-same-origin, so it must
// load nothing from the network, and it refuses uploads over 10 MB. The page also
// stays free of literal ``` sequences so it can still be pasted into a Hub Library
// "HTML Page" asset, which wraps the HTML in a fenced code block.
import { execFileSync } from 'node:child_process'
import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const run = (cmd, args) => execFileSync(cmd, args, { cwd: root, stdio: 'inherit' })

const MAX_BYTES = 10 * 1024 * 1024 // Atrium's default MAX_UPLOAD_BYTES

run('node', ['scripts/check-catalog.mjs'])
run('node', ['scripts/generate-inline-content.mjs'])
run('npx', ['vite', 'build', '--mode', 'hub'])

const htmlPath = join(root, 'dist-hub', 'index.html')
const html = readFileSync(htmlPath, 'utf8')
const fail = msg => {
  console.error(`FAIL: ${msg}`)
  process.exit(1)
}

if (html.includes('```')) {
  fail('built HTML contains a literal ``` sequence, which would break a Hub Library fence.')
}
// Self-containment: nothing the browser fetches on load may point off the page.
if (/fonts\.googleapis|fonts\.gstatic/.test(html)) {
  fail('built HTML still references Google Fonts; the strip-external-links plugin did not run.')
}
const external = html.match(/<(?:script|link|img|iframe)\b[^>]*\b(?:src|href)=["']?(?:https?:)?\/\/[^"'\s>]*/gi)
if (external) {
  fail(`built HTML loads external resources:\n  ${external.join('\n  ')}`)
}
const size = statSync(htmlPath).size
if (size > MAX_BYTES) {
  fail(`built HTML is ${(size / 1024 / 1024).toFixed(1)} MB, over Atrium's 10 MB upload limit.`)
}

console.log(`\nhub page built: dist-hub/index.html  ${(size / 1024 / 1024).toFixed(1)} MB`)
