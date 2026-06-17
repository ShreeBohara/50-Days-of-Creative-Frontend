export const TOOLS = [
  { id: 'select', label: 'Select', shortcut: '1', icon: 'select' },
  { id: 'draw', label: 'Draw', shortcut: '2', icon: 'draw' },
  { id: 'line', label: 'Line', shortcut: '3', icon: 'line' },
  { id: 'rectangle', label: 'Rectangle', shortcut: '4', icon: 'rectangle' },
  { id: 'ellipse', label: 'Ellipse', shortcut: '5', icon: 'ellipse' },
  { id: 'arrow', label: 'Arrow', shortcut: '6', icon: 'arrow' },
  { id: 'text', label: 'Text', shortcut: '7', icon: 'text' },
  { id: 'sticky', label: 'Sticky', shortcut: '8', icon: 'sticky' },
  { id: 'eraser', label: 'Eraser', shortcut: '9', icon: 'eraser' },
]

export const TOOL_BY_ID = Object.fromEntries(TOOLS.map((tool) => [tool.id, tool]))

export const COLORS = [
  '#0f766e',
  '#14b8a6',
  '#f97316',
  '#ef4444',
  '#a855f7',
  '#2563eb',
  '#0f172a',
  '#64748b',
  '#facc15',
  '#84cc16',
  '#f9a8d4',
  '#ffffff',
]

export const STICKY_COLORS = ['#fef3c7', '#dcfce7', '#cffafe', '#fae8ff', '#ffe4e6']
export const BRUSH_SIZES = [2, 4, 8, 16]
export const STROKE_STYLES = ['solid', 'dashed', 'dotted']

export const DEFAULT_STYLE = {
  stroke: COLORS[0],
  fill: '#fef3c7',
  stickyColor: STICKY_COLORS[0],
  strokeWidth: 4,
  strokeStyle: 'solid',
  fillEnabled: false,
  fontSize: 24,
  opacity: 1,
}
