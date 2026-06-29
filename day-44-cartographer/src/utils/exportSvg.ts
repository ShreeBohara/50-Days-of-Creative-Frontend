// Serialize the live chart <svg> to a standalone, self-contained SVG document.
// The painted base layer is an embedded data-URL <image>, so the file needs no
// external assets.

const CHART_ID = 'meridian-chart'
const SIZE = 1000

export function chartSvgString(): string | null {
  const el = document.getElementById(CHART_ID)
  if (!el) return null
  const clone = el.cloneNode(true) as SVGElement
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')
  clone.setAttribute('width', String(SIZE))
  clone.setAttribute('height', String(SIZE))
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(clone)
}

export function downloadString(content: string, filename: string, type: string): void {
  downloadBlob(new Blob([content], { type }), filename)
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
