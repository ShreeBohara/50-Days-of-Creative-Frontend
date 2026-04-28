/* ═══════════════════════════════════════════════════════
   Kanban Store — Zustand state management
   Columns, cards, CRUD, ordering
   ═══════════════════════════════════════════════════════ */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/* ---- helpers ---- */
let _id = Date.now()
const uid = () => `card-${++_id}`
const colUid = () => `col-${++_id}`

/* Deterministic gradient avatar based on card id */
const avatarGradients = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
  'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
]

const pickAvatar = (id) => {
  const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return avatarGradients[hash % avatarGradients.length]
}

/* ---- label colors ---- */
export const LABELS = [
  { id: 'red',    color: '#EF4444' },
  { id: 'orange', color: '#F97316' },
  { id: 'yellow', color: '#EAB308' },
  { id: 'green',  color: '#22C55E' },
  { id: 'blue',   color: '#3B82F6' },
  { id: 'purple', color: '#A855F7' },
]

export const PRIORITIES = [
  { id: 'low',    label: 'Low',    color: '#3B82F6' },
  { id: 'medium', label: 'Medium', color: '#EAB308' },
  { id: 'high',   label: 'High',   color: '#F97316' },
  { id: 'urgent', label: 'Urgent', color: '#EF4444' },
]

/* ---- seed data ---- */
const seedColumns = [
  { id: 'col-backlog',    title: 'Backlog',     collapsed: false },
  { id: 'col-inprogress', title: 'In Progress', collapsed: false },
  { id: 'col-review',     title: 'Review',      collapsed: false },
  { id: 'col-done',       title: 'Done',        collapsed: false },
]

const seedCards = [
  // Backlog
  { id: 'card-s1',  columnId: 'col-backlog', order: 0, title: 'Design system tokens',          description: 'Define color palette, spacing scale, and typography for the new dashboard.',        label: 'blue',   priority: 'medium', dueDate: '2026-05-03', subtasks: { total: 5, done: 1 } },
  { id: 'card-s2',  columnId: 'col-backlog', order: 1, title: 'API rate limiter',               description: 'Implement token-bucket rate limiting middleware for REST endpoints.',                label: 'red',    priority: 'high',   dueDate: '2026-05-01', subtasks: { total: 3, done: 0 } },
  { id: 'card-s3',  columnId: 'col-backlog', order: 2, title: 'Onboarding email sequence',      description: 'Draft 5-email drip campaign for new trial signups.',                                 label: 'yellow', priority: 'low',    dueDate: '2026-05-10', subtasks: { total: 5, done: 0 } },
  { id: 'card-s4',  columnId: 'col-backlog', order: 3, title: 'Accessibility audit',            description: 'Run axe-core scan on all public pages and fix critical issues.',                     label: 'purple', priority: 'medium', dueDate: '2026-05-07', subtasks: { total: 8, done: 2 } },
  // In Progress
  { id: 'card-s5',  columnId: 'col-inprogress', order: 0, title: 'User profile page',          description: 'Build responsive profile page with avatar upload and settings form.',                label: 'green',  priority: 'high',   dueDate: '2026-04-30', subtasks: { total: 6, done: 3 } },
  { id: 'card-s6',  columnId: 'col-inprogress', order: 1, title: 'Search autocomplete',         description: 'Add debounced typeahead search with fuzzy matching and keyboard nav.',               label: 'blue',   priority: 'medium', dueDate: '2026-05-02', subtasks: { total: 4, done: 2 } },
  { id: 'card-s7',  columnId: 'col-inprogress', order: 2, title: 'Dark mode toggle',            description: 'Implement system-preference-aware dark mode with smooth CSS transitions.',           label: 'purple', priority: 'low',    dueDate: '2026-05-05', subtasks: { total: 3, done: 1 } },
  // Review
  { id: 'card-s8',  columnId: 'col-review', order: 0, title: 'Payment integration',             description: 'Stripe checkout flow with webhook handling and receipt generation.',                  label: 'orange', priority: 'urgent', dueDate: '2026-04-29', subtasks: { total: 7, done: 6 } },
  { id: 'card-s9',  columnId: 'col-review', order: 1, title: 'Mobile nav refactor',             description: 'Replace hamburger menu with bottom tab bar on mobile viewports.',                    label: 'green',  priority: 'medium', dueDate: '2026-05-01', subtasks: { total: 4, done: 3 } },
  // Done
  { id: 'card-s10', columnId: 'col-done', order: 0, title: 'CI/CD pipeline',                    description: 'GitHub Actions workflow for lint, test, build, and deploy to staging.',               label: 'green',  priority: 'high',   dueDate: '2026-04-25', subtasks: { total: 5, done: 5 } },
  { id: 'card-s11', columnId: 'col-done', order: 1, title: 'Landing page hero',                 description: 'Animated hero section with typed headline and scroll-triggered stat counters.',       label: 'blue',   priority: 'medium', dueDate: '2026-04-24', subtasks: { total: 4, done: 4 } },
  { id: 'card-s12', columnId: 'col-done', order: 2, title: 'Database migration v2',             description: 'Migrate user table to support multi-tenancy with org-level permissions.',             label: 'red',    priority: 'urgent', dueDate: '2026-04-23', subtasks: { total: 6, done: 6 } },
]

/* Add avatar gradients to seed cards */
const seedCardsWithAvatars = seedCards.map(c => ({ ...c, avatar: pickAvatar(c.id) }))

/* ──────────────────────────────────────────────────── */
/*  Store                                               */
/* ──────────────────────────────────────────────────── */
const useKanbanStore = create(
  persist(
    (set, get) => ({
  columns: seedColumns,
  cards: seedCardsWithAvatars,

  /* ---- Column actions ---- */
  addColumn: (title) => set(state => ({
    columns: [...state.columns, { id: colUid(), title, collapsed: false }]
  })),

  updateColumnTitle: (colId, title) => set(state => ({
    columns: state.columns.map(c => c.id === colId ? { ...c, title } : c)
  })),

  toggleCollapseColumn: (colId) => set(state => ({
    columns: state.columns.map(c => c.id === colId ? { ...c, collapsed: !c.collapsed } : c)
  })),

  deleteColumn: (colId) => set(state => ({
    columns: state.columns.filter(c => c.id !== colId),
    cards: state.cards.filter(c => c.columnId !== colId),
  })),

  /* ---- Card actions ---- */
  addCard: (columnId, data) => {
    const id = uid()
    const cardsInCol = get().cards.filter(c => c.columnId === columnId)
    const newCard = {
      id,
      columnId,
      order: cardsInCol.length,
      title: data.title || 'Untitled',
      description: data.description || '',
      label: data.label || null,
      priority: data.priority || 'medium',
      dueDate: data.dueDate || null,
      subtasks: data.subtasks || { total: 0, done: 0 },
      avatar: pickAvatar(id),
    }
    set(state => ({ cards: [...state.cards, newCard] }))
    return id
  },

  updateCard: (cardId, updates) => set(state => ({
    cards: state.cards.map(c => c.id === cardId ? { ...c, ...updates } : c)
  })),

  deleteCard: (cardId) => set(state => ({
    cards: state.cards.filter(c => c.id !== cardId)
  })),

  /* Move card to a different column (and optionally a new position) */
  moveCard: (cardId, toColumnId, toIndex) => set(state => {
    const card = state.cards.find(c => c.id === cardId)
    if (!card) return state

    /* Remove from current column ordering */
    let updatedCards = state.cards.map(c => {
      if (c.id === cardId) return { ...c, columnId: toColumnId }
      return c
    })

    /* Re-order within target column */
    const colCards = updatedCards
      .filter(c => c.columnId === toColumnId && c.id !== cardId)
      .sort((a, b) => a.order - b.order)

    const movedCard = updatedCards.find(c => c.id === cardId)
    colCards.splice(toIndex, 0, movedCard)

    /* Reassign orders */
    const reordered = colCards.map((c, i) => ({ ...c, order: i }))
    const otherCards = updatedCards.filter(c => c.columnId !== toColumnId)

    return { cards: [...otherCards, ...reordered] }
  }),

  /* Reorder within same column */
  reorderCard: (cardId, toIndex) => set(state => {
    const card = state.cards.find(c => c.id === cardId)
    if (!card) return state

    const colCards = state.cards
      .filter(c => c.columnId === card.columnId)
      .sort((a, b) => a.order - b.order)

    const fromIndex = colCards.findIndex(c => c.id === cardId)
    if (fromIndex === toIndex) return state

    colCards.splice(fromIndex, 1)
    colCards.splice(toIndex, 0, card)

    const reordered = colCards.map((c, i) => ({ ...c, order: i }))
    const otherCards = state.cards.filter(c => c.columnId !== card.columnId)

    return { cards: [...otherCards, ...reordered] }
  }),

  /* Get cards for a column, sorted by order */
  getColumnCards: (columnId) => {
    return get().cards
      .filter(c => c.columnId === columnId)
      .sort((a, b) => a.order - b.order)
  },
    }),
    {
      name: 'kanban-board-storage',
      version: 1,
    }
  )
)

export default useKanbanStore
