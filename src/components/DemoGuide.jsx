import React, { useState, useEffect, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { LIVE_KIBANA_BASE, withAnonHint } from '../data/liveLinks.js'

function ScreenshotImage({ src, alt }) {
  return (
    <figure className="my-8">
      <img
        src={src}
        alt={alt}
        className="rounded-xl border border-line/40 shadow-xl w-full"
        loading="lazy"
      />
      {alt && (
        <figcaption className="mt-2 text-xs text-text-muted/60 text-center">
          {alt}
        </figcaption>
      )}
    </figure>
  )
}

// Table of contents: the h2 headings of the rendered markdown, linked to
// anchors that the h2 renderer below stamps with the same slug.
function slug(s) {
  return s.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-')
}

function textOf(node) {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (node && node.props) return textOf(node.props.children)
  return ''
}

function tocOf(md) {
  const lines = md.split('\n').filter(l => !l.includes('!['))
  const hashes = lines.some(l => /^##\s+\S/.test(l)) ? '##' : '###'
  const re = new RegExp(`^${hashes}\\s+(\\S.*)$`)
  return lines
    .map(l => l.match(re))
    .filter(Boolean)
    .map(m => m[1].replace(/[`*]/g, '').trim())
    .map(t => ({ text: t, id: slug(t) }))
}

// Split the guide at its first section heading so the title and the
// introductory paragraphs render above the table of contents. When the
// generated TOC box is shown, a trailing rule before the first heading is
// dropped (the box already separates them); otherwise the rule is kept.
function splitIntro(md, stripRule) {
  const lines = md.split('\n')
  const first = lines.findIndex(l => /^##\s+\S/.test(l))
  if (first < 0) return { intro: md, rest: '' }
  let end = first
  if (stripRule) while (end > 0 && /^(---\s*)?$/.test(lines[end - 1])) end--
  return { intro: lines.slice(0, end).join('\n'), rest: lines.slice(first).join('\n') }
}

const MD_CLASS = `
        [&_h1]:text-4xl [&_h1]:font-bold [&_h1]:mt-0 [&_h1]:mb-4 [&_h1]:text-text-primary [&_h1]:leading-tight
        [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:mt-14 [&_h2]:mb-4 [&_h2]:text-text-neutral [&_h2]:leading-snug
        [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-10 [&_h3]:mb-3 [&_h3]:text-text-neutral
        [&_h4]:text-base [&_h4]:font-semibold [&_h4]:mt-6 [&_h4]:mb-2 [&_h4]:text-text-primary
        [&_p]:text-base [&_p]:text-text-primary [&_p]:leading-relaxed [&_p]:mb-5
        [&_a]:text-accent-teal [&_a]:no-underline [&_a:hover]:underline
        [&_strong]:text-text-primary [&_strong]:font-semibold
        [&_code]:text-accent-blue [&_code]:bg-ink-700 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono
        [&_pre]:bg-ink-900 [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:text-sm [&_pre]:overflow-x-auto [&_pre]:my-5
        [&_li]:text-base [&_li]:text-text-primary [&_li]:my-1.5 [&_li]:leading-relaxed
        [&_ul]:my-5 [&_ul]:pl-6 [&_ul]:list-disc
        [&_ol]:my-5 [&_ol]:pl-6 [&_ol]:list-decimal
        [&_blockquote]:border-l-2 [&_blockquote]:border-accent-teal/50 [&_blockquote]:pl-5 [&_blockquote]:my-6 [&_blockquote]:text-text-muted [&_blockquote]:not-italic
        [&_blockquote_p]:text-sm [&_blockquote_p]:mb-2
        [&_table]:w-full [&_table]:text-base [&_table]:my-5 [&_table]:border-collapse
        [&_th]:text-sm [&_th]:font-semibold [&_th]:text-text-muted [&_th]:text-left [&_th]:pb-2 [&_th]:border-b [&_th]:border-line
        [&_td]:text-base [&_td]:text-text-primary [&_td]:py-2.5 [&_td]:border-b [&_td]:border-line/30 [&_td]:align-top
        [&_hr]:border-line [&_hr]:my-10 [&_hr]:border-t`

const MD_COMPONENTS = {
  // Demo-cluster links open as the anonymous read-only viewer.
  a: ({ href, children }) => {
    const demo = href?.startsWith(LIVE_KIBANA_BASE)
    return <a href={demo ? withAnonHint(href) : href} {...(demo ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{children}</a>
  },
  img: ({ src, alt }) => <ScreenshotImage src={src} alt={alt} />,
  // Markdown wraps a lone image in a paragraph; the image renders as a
  // <figure>, which is not valid inside <p>, so unwrap that case.
  p: ({ node, children }) => {
    const kids = (node?.children || []).filter(c => !(c.type === 'text' && !c.value.trim()))
    if (kids.length === 1 && kids[0].tagName === 'img') return <>{children}</>
    return <p>{children}</p>
  },
  h2: ({ children }) => <h2 id={slug(textOf(children))} className="scroll-mt-24">{children}</h2>,
  h3: ({ children }) => <h3 id={slug(textOf(children))} className="scroll-mt-24">{children}</h3>,
}

// `embedded`: rendered inside another page's <main> (the Readiness Pack
// walkthrough tab), so no page wrapper of its own.
// `toc`: render the generated "On this page" box. The walkthrough carries its
// own linked section table in the intro, so the tab passes false.
export default function DemoGuide({ src = '/docs/demo-guide.md', embedded = false, toc: showToc = true }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const toc = useMemo(() => tocOf(text), [text])
  const { intro, rest } = useMemo(() => splitIntro(text, showToc), [text, showToc])

  useEffect(() => {
    fetch(src)
      .then(r => r.text())
      .then(t => { setText(t); setLoading(false) })
      .catch(() => setLoading(false))
  }, [src])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-text-muted text-sm">
        Loading…
      </div>
    )
  }

  const Wrap = embedded ? 'div' : 'main'
  return (
    <Wrap className={embedded ? '' : 'mx-auto max-w-5xl px-8 py-12'}>
      <div className={MD_CLASS}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
          {intro}
        </ReactMarkdown>
      </div>
      {showToc && toc.length > 2 && (
        <nav className="my-10 rounded-lg border border-line bg-ink-800 px-6 py-5" style={{ borderStyle: 'solid' }}>
          <p className="text-xs font-bold uppercase tracking-widest text-text-muted mb-3">On this page</p>
          <ol className="list-none pl-0 space-y-1.5">
            {toc.map((h, i) => (
              <li key={`${h.id}-${i}`} className="text-sm">
                <a href={`#${h.id}`} className="text-accent-teal hover:underline">{h.text}</a>
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className={MD_CLASS}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
          {rest}
        </ReactMarkdown>
      </div>
    </Wrap>
  )
}
