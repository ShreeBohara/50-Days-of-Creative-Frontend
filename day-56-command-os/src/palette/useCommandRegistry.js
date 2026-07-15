import { navItems } from '../dashboard/dashboardData.js'

// Builds the grouped command list from the current app state + action handlers.
// Each command: { id, label, icon, hint?, keywords?, run }. Groups render in the
// order returned here; ⌘+number jumps to the Nth group.
//
// Actions that mutate the dashboard live in App and are passed in via `actions`,
// so the palette and the UI share one source of truth.
export function buildCommandGroups({ actions, documents }) {
  const groups = []

  groups.push({
    id: 'actions',
    label: 'Actions',
    items: [
      {
        id: 'toggle-sidebar',
        label: 'Toggle sidebar',
        icon: 'sidebar',
        hint: '⌘.',
        keywords: 'hide show collapse expand nav',
        run: () => actions.toggleSidebar(),
      },
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

  const themes = [
    { id: 'theme-light', label: 'Theme: Light', icon: 'sun', run: () => actions.setTheme('light') },
    { id: 'theme-dark', label: 'Theme: Dark', icon: 'moon', run: () => actions.setTheme('dark') },
    { id: 'theme-system', label: 'Theme: System', icon: 'monitor', run: () => actions.setTheme('system') },
    { id: 'accent-violet', label: 'Accent: Violet', icon: 'palette', run: () => actions.setAccent('violet') },
    { id: 'accent-magenta', label: 'Accent: Magenta', icon: 'palette', run: () => actions.setAccent('magenta') },
    { id: 'accent-blue', label: 'Accent: Blue', icon: 'palette', run: () => actions.setAccent('blue') },
    { id: 'accent-emerald', label: 'Accent: Emerald', icon: 'palette', run: () => actions.setAccent('emerald') },
  ]
  groups.push({
    id: 'theme',
    label: 'Theme',
    items: themes.map((t) => ({ ...t, keywords: 'appearance color dark light mode' })),
  })

  return groups
}
