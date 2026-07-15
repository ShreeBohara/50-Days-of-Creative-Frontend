// Fake dataset for the backdrop dashboard. Small on purpose — just enough for
// palette actions (open, assign, create) to visibly change something on screen.

export const people = [
  { id: 'u1', name: 'Ada Okafor', role: 'Product Lead', initials: 'AO', hue: 265 },
  { id: 'u2', name: 'Ravi Menon', role: 'Design Eng', initials: 'RM', hue: 320 },
  { id: 'u3', name: 'Lena Fischer', role: 'Frontend', initials: 'LF', hue: 200 },
  { id: 'u4', name: 'Diego Salas', role: 'Data', initials: 'DS', hue: 150 },
]

export const stats = [
  { id: 's1', label: 'Active docs', value: '128', delta: '+12', trend: 'up' },
  { id: 's2', label: 'In review', value: '9', delta: '+3', trend: 'up' },
  { id: 's3', label: 'Published', value: '74', delta: '+5', trend: 'up' },
  { id: 's4', label: 'Avg. cycle', value: '2.4d', delta: '-0.3d', trend: 'down' },
]

// updatedAt is a sortable epoch-ish number (minutes ago) so "recently updated"
// stays stable without a real clock.
export const documents = [
  { id: 'd1', title: 'Q3 Product Roadmap', type: 'Doc', ownerId: 'u1', updated: '2h ago', status: 'In review' },
  { id: 'd2', title: 'Command Palette Spec', type: 'Spec', ownerId: 'u2', updated: '5h ago', status: 'Draft' },
  { id: 'd3', title: 'Design System Tokens', type: 'Design', ownerId: 'u3', updated: 'Yesterday', status: 'Published' },
  { id: 'd4', title: 'Onboarding Funnel Audit', type: 'Sheet', ownerId: 'u4', updated: 'Yesterday', status: 'In review' },
  { id: 'd5', title: 'Keyboard Shortcut Map', type: 'Doc', ownerId: 'u2', updated: '2d ago', status: 'Draft' },
  { id: 'd6', title: 'Pricing Experiment v4', type: 'Sheet', ownerId: 'u1', updated: '3d ago', status: 'Archived' },
  { id: 'd7', title: 'Accessibility Checklist', type: 'Doc', ownerId: 'u3', updated: '4d ago', status: 'Published' },
  { id: 'd8', title: 'Launch Comms Brief', type: 'Doc', ownerId: 'u4', updated: '6d ago', status: 'Draft' },
]

export const navItems = [
  { id: 'home', label: 'Overview', icon: 'grid' },
  { id: 'docs', label: 'Documents', icon: 'doc' },
  { id: 'analytics', label: 'Analytics', icon: 'chart' },
  { id: 'team', label: 'Team', icon: 'users' },
  { id: 'settings', label: 'Settings', icon: 'gear' },
]

export const statusTone = {
  Draft: 'neutral',
  'In review': 'accent',
  Published: 'positive',
  Archived: 'muted',
}
