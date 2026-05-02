const adjectives = [
  'Amber',
  'Brisk',
  'Coral',
  'Electric',
  'Golden',
  'Indigo',
  'Jolly',
  'Lunar',
  'Mint',
  'Neon',
  'Pixel',
  'Purple',
  'Solar',
  'Teal',
  'Velvet',
  'Zesty',
]

const nouns = [
  'Beacon',
  'Bolt',
  'Comet',
  'Dash',
  'Echo',
  'Flux',
  'Halo',
  'Keystone',
  'Nova',
  'Orbit',
  'Pixel',
  'Pulse',
  'Signal',
  'Spark',
  'Vector',
  'Wave',
]

export const userColors = [
  '#0d9488',
  '#f97316',
  '#2563eb',
  '#ec4899',
  '#7c3aed',
  '#ca8a04',
  '#059669',
  '#dc2626',
]

const randomFrom = (items) => items[Math.floor(Math.random() * items.length)]

export function createSessionId() {
  if (crypto.randomUUID) {
    return crypto.randomUUID()
  }

  return `user-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function createDisplayName() {
  return `${randomFrom(adjectives)} ${randomFrom(nouns)}`
}

export function pickUserColor(id) {
  const total = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return userColors[total % userColors.length]
}

export function createLocalUser() {
  const id = createSessionId()

  return {
    id,
    name: createDisplayName(),
    color: pickUserColor(id),
    x: 0.5,
    y: 0.5,
    isTyping: false,
    idle: false,
    lastSeen: Date.now(),
  }
}
