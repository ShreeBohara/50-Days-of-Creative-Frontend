import { useEffect, useRef, useState } from 'react'
import { Check, FileImage, FileCode2, Link2 } from 'lucide-react'
import type { WindowSpec } from '../domain/compose'
import { downloadPng } from '../utils/exportPng'
import { downloadSvg } from '../utils/exportSvg'
import { buildShareHash, buildShareUrl } from '../utils/share'

interface Props {
  spec: WindowSpec
}

export default function ExportToolbar({ spec }: Props) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const copyLink = async () => {
    const url = buildShareUrl(spec.genome)
    history.replaceState(null, '', buildShareHash(spec.genome))
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), 1800)
    } catch {
      // clipboard may be blocked — the hash is already in the address bar
    }
  }

  return (
    <div className="export" role="group" aria-label="Export and share">
      <button type="button" className="btn-ghost export__btn" onClick={copyLink}>
        {copied ? (
          <Check size={15} strokeWidth={2} aria-hidden="true" />
        ) : (
          <Link2 size={15} strokeWidth={1.8} aria-hidden="true" />
        )}
        <span>{copied ? 'Link copied' : 'Copy link'}</span>
      </button>
      <button type="button" className="btn-ghost export__btn" onClick={() => downloadSvg(spec)}>
        <FileCode2 size={15} strokeWidth={1.8} aria-hidden="true" />
        <span>SVG</span>
      </button>
      <button type="button" className="btn-ghost export__btn" onClick={() => void downloadPng(spec)}>
        <FileImage size={15} strokeWidth={1.8} aria-hidden="true" />
        <span>PNG</span>
      </button>
    </div>
  )
}
