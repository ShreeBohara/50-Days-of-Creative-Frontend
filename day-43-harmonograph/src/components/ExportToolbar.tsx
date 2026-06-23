import { useEffect, useRef, useState } from 'react'
import { Download, ImageDown, Link2, RotateCcw } from 'lucide-react'
import { getPalette } from '../domain/palettes'
import { useStudioStore } from '../store/useStudioStore'
import { buildFigureSvg, downloadString } from '../utils/exportSvg'
import { downloadPng } from '../utils/exportPng'
import { buildShareUrl } from '../utils/share'
import IconButton from './IconButton'

function safeName(seed: string): string {
  const clean = seed.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 40)
  return clean || 'figure'
}

export default function ExportToolbar() {
  const params = useStudioStore((s) => s.params)
  const palette = getPalette(useStudioStore((s) => s.paletteId))
  const lineWidth = useStudioStore((s) => s.lineWidth)
  const glow = useStudioStore((s) => s.glow)
  const replay = useStudioStore((s) => s.replay)

  const [status, setStatus] = useState('')
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const announce = (message: string) => {
    setStatus(message)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setStatus(''), 2400)
  }

  const fileBase = `pendula-${safeName(params.seed)}`

  const exportSvg = () => {
    const svg = buildFigureSvg(params, palette, { lineWidth, glow })
    downloadString(svg, `${fileBase}.svg`, 'image/svg+xml')
    announce('SVG exported')
  }

  const exportPng = async () => {
    try {
      const svg = buildFigureSvg(params, palette, { lineWidth, glow })
      await downloadPng(svg, `${fileBase}.png`, 1600)
      announce('PNG exported')
    } catch {
      announce('PNG export failed')
    }
  }

  const copyLink = async () => {
    const url = buildShareUrl(params, window.location.href)
    try {
      window.history.replaceState(null, '', new URL(url).hash)
    } catch {
      /* ignore hash update failures */
    }
    try {
      await navigator.clipboard.writeText(url)
      announce('Share link copied')
    } catch {
      announce('Link added to address bar')
    }
  }

  return (
    <>
      <div className="stage__tools">
        <IconButton label="Replay drawing" onClick={replay}>
          <RotateCcw size={16} strokeWidth={1.8} />
        </IconButton>
        <span className="stage__tools-sep" aria-hidden="true" />
        <IconButton label="Export as SVG" onClick={exportSvg}>
          <Download size={16} strokeWidth={1.8} />
        </IconButton>
        <IconButton label="Export as PNG" onClick={exportPng}>
          <ImageDown size={16} strokeWidth={1.8} />
        </IconButton>
        <IconButton label="Copy share link" onClick={copyLink}>
          <Link2 size={16} strokeWidth={1.8} />
        </IconButton>
      </div>
      <div className={`stage__toast ${status ? 'is-shown' : ''}`} role="status" aria-live="polite">
        {status}
      </div>
    </>
  )
}
