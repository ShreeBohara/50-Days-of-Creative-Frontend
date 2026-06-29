import { useState } from 'react'
import { Check, Download, ImageDown, Link2 } from 'lucide-react'
import type { WorldParams } from '../domain/world'
import { chartSvgString, downloadString } from '../utils/exportSvg'
import { downloadPng } from '../utils/exportPng'
import { buildShareUrl } from '../utils/share'

function slug(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'chart'
  )
}

export default function ExportToolbar({ params, title }: { params: WorldParams; title: string }) {
  const [copied, setCopied] = useState(false)

  const filename = (ext: string) => `meridian-${slug(title)}.${ext}`

  const onSvg = () => {
    const svg = chartSvgString()
    if (svg) downloadString(svg, filename('svg'), 'image/svg+xml')
  }

  const onPng = () => {
    const svg = chartSvgString()
    if (svg) void downloadPng(svg, filename('png'))
  }

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildShareUrl(params, window.location.href))
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard blocked — nothing to do */
    }
  }

  return (
    <div className="export-bar" role="group" aria-label="Export and share">
      <button type="button" className="export-btn" onClick={onSvg}>
        <Download size={15} strokeWidth={1.7} aria-hidden="true" />
        <span>SVG</span>
      </button>
      <button type="button" className="export-btn" onClick={onPng}>
        <ImageDown size={15} strokeWidth={1.7} aria-hidden="true" />
        <span>PNG</span>
      </button>
      <button type="button" className="export-btn" onClick={onCopy}>
        {copied ? (
          <Check size={15} strokeWidth={2} aria-hidden="true" />
        ) : (
          <Link2 size={15} strokeWidth={1.7} aria-hidden="true" />
        )}
        <span>{copied ? 'Copied' : 'Copy link'}</span>
      </button>
    </div>
  )
}
