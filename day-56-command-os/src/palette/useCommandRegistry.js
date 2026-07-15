import { navItems, people } from '../dashboard/dashboardData.js'

// Accent options shown on the theme page (id must match [data-accent] in CSS).
const ACCENTS = [
  { id: 'violet', label: 'Violet', tint: '#8b5cf6' },
  { id: 'magenta', label: 'Magenta', tint: '#ec4899' },
  { id: 'blue', label: 'Blue', tint: '#3b82f6' },
  { id: 'emerald', label: 'Emerald', tint: '#10b981' },
]

// The nested "Change theme" page: appearance + accent, two groups.
function themePanel(actions) {
  return {
    id: 'theme',
    title: 'Change theme',
    groups: [
      {
        id: 'appearance',
        label: 'Appearance',
        items: [
          { id: 'theme-light', label: 'Light', icon: 'sun', keywords: 'bright day', run: () => actions.setTheme('light') },
          { id: 'theme-dark', label: 'Dark', icon: 'moon', keywords: 'night', run: () => actions.setTheme('dark') },
          { id: 'theme-system', label: 'System', icon: 'monitor', keywords: 'auto os', run: () => actions.setTheme('system') },
        ],
      },
      {
        id: 'accent',
        label: 'Accent',
        items: ACCENTS.map((a) => ({
          id: `accent-${a.id}`,
          label: a.label,
          swatch: a.tint,
          preview: { accent: a.id },
          keywords: 'color highlight',
          run: () => actions.setAccent(a.id),
        })),
      },
    ],
  }
}

// The nested "Assign to…" page: the workspace people, assigning the top doc.
function assignPanel(actions, documents) {
  const target = documents[0]
  return {
    id: 'assign',
    title: target ? `Assign · ${target.title}` : 'Assign to',
    async: true, // people are "fetched" (shimmer) — see the palette's loader
    groups: [
      {
        id: 'people',
        label: 'People',
        items: people.map((p) => ({
          id: `assign-${p.id}`,
          label: p.name,
          hint: p.role,
          avatar: { initials: p.initials, hue: p.hue },
          keywords: `assign owner ${p.role}`,
          run: () => actions.assignTopDoc(p.id),
        })),
      },
    ],
  }
}

// Builds the root grouped command list from the current app state + actions.
// Each command: { id, label, icon, hint?, keywords?, run } for leaves, or
// { …, panel } to push a nested page. ⌘+number jumps to the Nth group.
export function buildCommandGroups({ actions, documents }) {
  const groups = []

  groups.push({
    id: 'actions',
    label: 'Actions',
    items: [
      { id: 'create-document', label: 'Create document', icon: 'plus', hint: '⌘N', keywords: 'new add file draft', run: () => actions.createDocument() },
      { id: 'copy-link', label: 'Copy page link', icon: 'link', keywords: 'share url clipboard address', run: () => actions.copyLink() },
      { id: 'change-theme', label: 'Change theme…', icon: 'palette', keywords: 'appearance dark light accent color mode', panel: themePanel(actions) },
      { id: 'assign', label: 'Assign to…', icon: 'users', keywords: 'owner person people reassign', panel: assignPanel(actions, documents) },
      { id: 'toggle-sidebar', label: 'Toggle sidebar', icon: 'sidebar', hint: '⌘.', keywords: 'hide show collapse expand nav', run: () => actions.toggleSidebar() },
    ],
  })

  groups.push({
    id: 'navigation',
    label: 'Navigation',
    items: navItems.map((n) => ({
      id: `nav-${n.id}`,
      label: `Go to ${n.label}`,
      icon: n.icon,
      keywords: 'navigate open page section',
      run: () => actions.navigate(n.id),
    })),
  })

  groups.push({
    id: 'documents',
    label: 'Documents',
    items: documents.map((d) => ({
      id: `doc-${d.id}`,
      label: d.title,
      icon: 'doc',
      hint: d.type,
      keywords: `open document ${d.status}`,
      run: () => actions.openDoc(d.id),
    })),
  })

  return groups
}
