// Namespaced JSON localStorage wrapper. Everything is defensive: private
// browsing, quota errors, and corrupt JSON all fall back silently.

const NS = "voltage-60";

export function createStore(backend) {
  function get(key, fallback) {
    if (!backend) return fallback;
    try {
      const raw = backend.getItem(`${NS}:${key}`);
      if (raw === null || raw === undefined) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function set(key, value) {
    if (!backend) return false;
    try {
      backend.setItem(`${NS}:${key}`, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  return { get, set };
}

function defaultBackend() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export const store = createStore(defaultBackend());

// --- shared score schema -------------------------------------------------
// whack:  value = points, higher is better
// reflex: value = average ms over best-of-5, lower is better
// memory: value = moves, lower is better (timeMs kept as tiebreak color)
export const SCORE_KEY = "scores";

export const DEFAULT_SCORES = Object.freeze({
  whack: null,
  reflex: null,
  memory: null,
});

export function getScores(s = store) {
  const saved = s.get(SCORE_KEY, {});
  return { ...DEFAULT_SCORES, ...(saved && typeof saved === "object" ? saved : {}) };
}
