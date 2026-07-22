import React, { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { loadText, assetUrl } from '@app-content'

function ScreenshotImage({ src, alt }) {
  return (
    <figure className="my-8">
      <img
        src={assetUrl(src)}
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

const MD_COMPONENTS = {
  img: ({ src, alt }) => <ScreenshotImage src={src} alt={alt} />,
}

export default function DemoGuide() {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadText('/docs/demo-guide.md')
      .then(t => { setText(t); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-text-muted text-sm">
        Loading…
      </div>
    )
  }

  return (
    <main className="mx-auto max-w-5xl px-8 py-12">
      <div className="
        [&_h1]:text-4xl [&_h1]:font-bold [&_h1]:mt-0 [&_h1]:mb-4 [&_h1]:text-text-primary [&_h1]:leading-tight
        [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:mt-14 [&_h2]:mb-4 [&_h2]:text-text-primary [&_h2]:leading-snug
        [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-10 [&_h3]:mb-3 [&_h3]:text-text-primary
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
        [&_hr]:border-line [&_hr]:my-10 [&_hr]:border-t">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
          {text}
        </ReactMarkdown>
      </div>
    </main>
  )
}
