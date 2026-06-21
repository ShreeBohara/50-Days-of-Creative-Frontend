import { Download, FileImage, Share2 } from 'lucide-react'
import { useState, type RefObject } from 'react'
import type { PlantGenomeV1 } from '../domain/genome'
import { useFloraStore } from '../store/useFloraStore'
import { buildShareUrl, copyText, downloadPng, downloadSvg } from '../utils/exportSpecimen'

interface ExportToolbarProps {
  genome: PlantGenomeV1
  artworkRef: RefObject<SVGSVGElement | null>
}

export function ExportToolbar({ genome, artworkRef }: ExportToolbarProps) {
  const announce = useFloraStore((state) => state.announce)
  const [exportingPng, setExportingPng] = useState(false)

  const requireArtwork = () => {
    if (!artworkRef.current) {
      announce('The specimen is still preparing. Please try again.')
      return null
    }
    return artworkRef.current
  }

  const exportSvg = () => {
    const artwork = requireArtwork()
    if (!artwork) return
    downloadSvg(artwork, genome)
    announce('Vector specimen downloaded as SVG.')
  }

  const exportPng = async () => {
    const artwork = requireArtwork()
    if (!artwork || exportingPng) return
    setExportingPng(true)
    try {
      await downloadPng(artwork, genome)
      announce('2400 by 3000 pixel specimen downloaded as PNG.')
    } catch (error) {
      announce(error instanceof Error ? error.message : 'PNG export failed.')
    } finally {
      setExportingPng(false)
    }
  }

  const shareDna = async () => {
    try {
      await copyText(buildShareUrl(genome))
      announce('Reproducible DNA link copied to the clipboard.')
    } catch (error) {
      announce(error instanceof Error ? error.message : 'The DNA link could not be copied.')
    }
  }

  return (
    <div className="export-toolbar" aria-label="Specimen export options">
      <span>Take this specimen</span>
      <div>
        <button type="button" onClick={exportSvg}><Download aria-hidden="true" /> SVG</button>
        <button type="button" onClick={exportPng} disabled={exportingPng}>
          <FileImage aria-hidden="true" /> {exportingPng ? 'Rendering…' : 'PNG'}
        </button>
        <button type="button" onClick={shareDna}><Share2 aria-hidden="true" /> Share DNA</button>
      </div>
    </div>
  )
}
