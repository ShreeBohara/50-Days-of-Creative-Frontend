import { DNA_QUERY_KEY, encodeGenome, type PlantGenomeV1 } from '../domain/genome'

const SVG_NS = 'http://www.w3.org/2000/svg'

function fileSeed(seed: string) {
  return seed.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'specimen'
}

export function serializeArtwork(svg: SVGSVGElement, genome: PlantGenomeV1): string {
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute('xmlns', SVG_NS)
  clone.setAttribute('width', '800')
  clone.setAttribute('height', '1000')
  clone.setAttribute('viewBox', '0 0 800 1000')
  clone.removeAttribute('class')
  clone.removeAttribute('aria-labelledby')

  const background = document.createElementNS(SVG_NS, 'rect')
  background.setAttribute('width', '800')
  background.setAttribute('height', '1000')
  background.setAttribute('fill', '#fbf7ef')
  const firstGraphic = Array.from(clone.children).find((child) => !['title', 'desc', 'metadata'].includes(child.tagName))
  clone.insertBefore(background, firstGraphic ?? null)

  const metadata = document.createElementNS(SVG_NS, 'metadata')
  metadata.textContent = JSON.stringify({ generator: 'FLORA LAB / Day 42', dna: genome })
  clone.insertBefore(metadata, background)

  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}`
}

export function buildShareUrl(genome: PlantGenomeV1, baseUrl = window.location.href): string {
  const url = new URL(baseUrl)
  url.search = ''
  url.hash = ''
  url.searchParams.set(DNA_QUERY_KEY, encodeGenome(genome))
  return url.toString()
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export function downloadSvg(svg: SVGSVGElement, genome: PlantGenomeV1) {
  const markup = serializeArtwork(svg, genome)
  downloadBlob(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }), `flora-${fileSeed(genome.seed)}.svg`)
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('The browser could not encode this specimen.'))
    }, 'image/png')
  })
}

export async function downloadPng(svg: SVGSVGElement, genome: PlantGenomeV1) {
  const markup = serializeArtwork(svg, genome)
  const source = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }))

  try {
    const image = new Image()
    image.decoding = 'sync'
    image.src = source
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = 2400
    canvas.height = 3000
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas export is unavailable in this browser.')
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    downloadBlob(await canvasBlob(canvas), `flora-${fileSeed(genome.seed)}-2400x3000.png`)
  } finally {
    URL.revokeObjectURL(source)
  }
}

export async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  textarea.remove()
  if (!copied) throw new Error('Clipboard access was denied.')
}
