// Inline SVG icon set — no icon library (per spec). Each icon inherits color via
// `currentColor` and scales with font-size (1em). Stroke style matches the
// Raycast/Linear feather-ish look: 1.6 width, round caps.

const paths = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  doc: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h6" /></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  users: <><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6" /><path d="M17.5 20a5.5 5.5 0 0 0-3-4.9" /></>,
  gear: <><circle cx="12" cy="12" r="3.2" /><path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8 6 18M18 6l1.8-1.8" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></>,
  command: <><path d="M8 6a2 2 0 1 0 2 2V6a2 2 0 0 0-2 0Z" /><path d="M18 8a2 2 0 1 0-2-2v2a2 2 0 0 0 2 0Z" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" /></>,
  moon: <><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" /></>,
  monitor: <><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  link: <><path d="M9.5 14.5 14.5 9.5" /><path d="M8 12 6 14a3.5 3.5 0 0 0 5 5l2-2" /><path d="M16 12l2-2a3.5 3.5 0 0 0-5-5l-2 2" /></>,
  check: <><path d="m5 12.5 4.5 4.5L19 7" /></>,
  arrowRight: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  cornerDownLeft: <><path d="M9 10 5 14l4 4" /><path d="M19 6v5a3 3 0 0 1-3 3H5" /></>,
  chevronRight: <><path d="m9 6 6 6-6 6" /></>,
  sidebar: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /></>,
  palette: <><path d="M12 3a9 9 0 1 0 0 18 2.5 2.5 0 0 0 2-4 2.5 2.5 0 0 1 2-4h1a4 4 0 0 0 4-4 8 8 0 0 0-9-6Z" /><circle cx="7.5" cy="11" r="1" /><circle cx="12" cy="7.5" r="1" /><circle cx="16.5" cy="11" r="1" /></>,
  bell: <><path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" /><path d="M13.5 20a2 2 0 0 1-3 0" /></>,
  logout: <><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 12h10M17 9l3 3-3 3" /></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>,
  sparkle: <><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /></>,
}

export default function Icon({ name, className, strokeWidth = 1.6 }) {
  const glyph = paths[name]
  if (!glyph) return null
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {glyph}
    </svg>
  )
}
