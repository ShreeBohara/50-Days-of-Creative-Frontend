// Recently-run commands, persisted to localStorage. Stored as lightweight
// display entries ({ id, label, icon }); the live `run` handler is looked up
// from the registry at render time, so stale ids (e.g. a deleted doc) simply
// drop out. All access is best-effort — storage can be unavailable or full.

const KEY = 'commandos:recents'
const MAX = 5

export function loadRecents() {
  try {
    const raw = localStorage.getItem(KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr.slice(0, MAX) : []
  } catch {
    return []
  }
}

export function pushRecent(entry) {
  try {
    const list = loadRecents().filter((e) => e.id !== entry.id)
    list.unshift({ id: entry.id, label: entry.label, icon: entry.icon })
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)))
  } catch {
    /* storage unavailable — recents are non-essential, so ignore. */
  }
}
