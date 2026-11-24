// Single-file build: one self-contained index.html for hosts that accept a
// single static page and no folder (npm run build:single -> dist-single/index.html).
//
// What gets inlined and how:
//   - JS and CSS: vite-plugin-singlefile (all lazy chunks merged into the page).
//   - Imported images (logos): Vite data URIs (assetsInlineLimit raised by the plugin).
//   - public/docs/*.md: embedded as text; a fetch() shim answers the app's own
//     fetch('/docs/...') calls from memory.
//   - public/screenshots/*.png: recompressed to JPEG at build time with macOS
//     `sips` (SINGLE_SHOT_WIDTH, default 1600; SINGLE_SHOT_QUALITY low|normal|high,
//     default low), embedded base64, served as blob: URLs. Thumbnails reuse the
//     same image.
//   - public/docs/*.pdf: NOT embedded (3.4 MB, the page has a 10 MB ceiling on the
//     host). Links are rewritten to the public GitHub repo, which renders PDFs.
//   - SINGLE_NO_EXTERNAL=1 drops the Google Fonts links and the favicon (compat build).
//   - Routing: main.jsx switches to HashRouter under VITE_HASH_ROUTER=1 because a
//     single page has no server rewrite for deep links.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { readFileSync, readdirSync, mkdtempSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, basename } from 'node:path'
import { tmpdir } from 'node:os'

const DOCS_BASE = 'https://github.com/elastic/m-26-14-logging-readiness/blob/main/public/docs/'
const SHOT_WIDTH = process.env.SINGLE_SHOT_WIDTH || '1600'
const SHOT_QUALITY = process.env.SINGLE_SHOT_QUALITY || 'low'
const NO_EXTERNAL = process.env.SINGLE_NO_EXTERNAL === '1'

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

function inlinePublicAssets() {
  return {
    name: 'm2614-inline-public-assets',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const text = {}
        const docs = {}
        for (const f of walk('public/docs')) {
          if (basename(f).startsWith('.')) continue
          const rel = f.slice('public'.length) // "/docs/..."
          if (rel.endsWith('.md')) text[rel] = readFileSync(f, 'utf8')
          const sub = rel.slice('/docs/'.length)
          docs[rel] = DOCS_BASE + sub.split('/').map(encodeURIComponent).join('/')
        }
        const images = {}
        const tmp = mkdtempSync(join(tmpdir(), 'm2614-shots-'))
        for (const f of readdirSync('public/screenshots')) {
          if (!f.endsWith('.png')) continue
          const out = join(tmp, f.replace(/\.png$/, '.jpg'))
          execFileSync('sips', ['-Z', SHOT_WIDTH, '-s', 'format', 'jpeg', '-s', 'formatOptions', SHOT_QUALITY,
            join('public/screenshots', f), '--out', out], { stdio: 'ignore' })
          images[basename(f, '.png')] = readFileSync(out).toString('base64')
        }
        // Text payload travels base64-wrapped so no host-side template engine,
        // sanitizer or re-serializer can touch markdown punctuation ({{ }}, </, <!--).
        // Images are already base64, so their map is emitted as plain JSON.
        const textB64 = Buffer.from(JSON.stringify({ text, docs }), 'utf8').toString('base64')
        const imagesJson = JSON.stringify(images)
        const shim = `(function(){
(function(){var mem=function(){var m={};return{getItem:function(k){return Object.prototype.hasOwnProperty.call(m,k)?m[k]:null},setItem:function(k,v){m[k]=String(v)},removeItem:function(k){delete m[k]},clear:function(){m={}},key:function(i){return Object.keys(m)[i]||null},get length(){return Object.keys(m).length}}};["localStorage","sessionStorage"].forEach(function(n){try{window[n].getItem("__probe")}catch(e){try{Object.defineProperty(window,n,{value:mem(),configurable:true})}catch(e2){}}})})();
var A=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob("${textB64}"),function(c){return c.charCodeAt(0)})));A.images=${imagesJson};var blobs={};
function shot(id){if(!blobs[id]){var b=atob(A.images[id]),u=new Uint8Array(b.length);for(var i=0;i<b.length;i++)u[i]=b.charCodeAt(i);blobs[id]=URL.createObjectURL(new Blob([u],{type:'image/jpeg'}))}return blobs[id]}
function path(u){try{return decodeURIComponent(new URL(String(u),location.href).pathname)}catch(e){return String(u)}}
function docKey(p){var i=p.indexOf('/docs/');return i>=0?p.slice(i):null}
function map(u){if(u==null)return u;var s=String(u);if(/^(data|blob|https?|mailto):|^#/.test(s))return u;
var p=path(s);var m=p.match(/\\/screenshots\\/(?:thumbs\\/)?([^\\/]+)\\.(png|jpg)$/);if(m&&A.images[m[1]])return shot(m[1]);
var k=docKey(p);if(k&&A.docs[k])return A.docs[k];return u}
window.__M2614_INLINE__=A;
var of=window.fetch;window.fetch=function(input,init){var s=typeof input==='string'?input:(input&&input.url);var k=s?docKey(path(s)):null;
if(k&&A.text[k]!=null)return Promise.resolve(new Response(A.text[k],{status:200,headers:{'Content-Type':'text/markdown; charset=utf-8'}}));return of.apply(this,arguments)};
var sa=Element.prototype.setAttribute;Element.prototype.setAttribute=function(n,v){if(n==='src'||n==='href')v=map(v);return sa.call(this,n,v)};
[[HTMLImageElement,'src'],[HTMLAnchorElement,'href']].forEach(function(pr){var d=Object.getOwnPropertyDescriptor(pr[0].prototype,pr[1]);if(d&&d.set)Object.defineProperty(pr[0].prototype,pr[1],{get:d.get,set:function(v){d.set.call(this,map(v))},configurable:true})});
})();`
        if (NO_EXTERNAL) {
          // Compatibility variant: no <link> to Google Fonts or a favicon at all,
          // matching the head shape of the earlier hand-uploaded page.
          html = html.replace(/\s*<link[^>]*(fonts\.googleapis|fonts\.gstatic|favicon\.svg)[^>]*>/g, '')
        } else {
          const favicon = 'data:image/svg+xml;base64,' + readFileSync('public/favicon.svg').toString('base64')
          html = html.replace('href="/favicon.svg"', `href="${favicon}"`)
        }
        // Shim goes right after <title> so the head reads title-first like the earlier page.
        return html.replace('</title>', `</title>\n    <script>${shim}</script>`)
      },
    },
  }
}

export default defineConfig({
  plugins: [react(), inlinePublicAssets(), viteSingleFile({ removeViteModuleLoader: true })],
  build: { outDir: 'dist-single', emptyOutDir: true },
})
