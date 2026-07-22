#!/usr/bin/env node
// Builds the Elastic Hub "HTML Page" library asset (elastic/elastic-hub#123):
// generate inline content → vite build --mode hub (single self-contained HTML) →
// validate fence-safety → wrap in the Hub's markdown asset envelope.
//
// Outputs:
//   dist-hub/index.html                                  — the standalone page
//   dist-hub/m-26-14-reference-architecture-viewer.md    — Hub library asset
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, statSync } from 'node:fs'
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

const asset = `---
title: M-26-14 Federal Logging Reference Architecture Viewer
description: Interactive reference architecture viewer for OMB M-26-14 — maturity levels, sizing, compliance mappings, and the full deployable asset inventory with docs and screenshots. Click "Present" to open full-screen.
type: html
author: james@jgarside.co.uk
authorName: James Garside
createdAt: "${new Date().toISOString()}"
version: "1"
tags:
  - m-26-14
  - reference-architecture
  - compliance
  - logging
language: html
status: draft
featured: false
---

\`\`\`html
${html.trimEnd()}
\`\`\`
`
const assetPath = join(root, 'dist-hub', 'm-26-14-reference-architecture-viewer.md')
writeFileSync(assetPath, asset)

const mb = p => (statSync(p).size / 1024 / 1024).toFixed(1)
console.log(`\nhub asset built:`)
console.log(`  dist-hub/index.html  ${mb(htmlPath)} MB`)
console.log(`  ${assetPath.replace(root, '').replace(/^\//, '')}  ${mb(assetPath)} MB`)
