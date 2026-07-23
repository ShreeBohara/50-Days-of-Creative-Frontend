// Namespaced storage with an in-memory fallback so private-mode or
// quota failures can never take the page down.

export const NS = "day59:";

export function createStore(backing = null) {
  const memory = new Map();

  function area() {
    if (backing) return backing;
    return globalThis.localStorage ?? null;
  }

  function getRaw(key) {
    const k = NS + key;
    try {
      const a = area();
      if (a) {
        const value = a.getItem(k);
        if (value !== null && value !== undefined) return value;
      }
    } catch {
      // fall through to memory
    }
    return memory.has(k) ? memory.get(k) : null;
  }

  function setRaw(key, value) {
    const k = NS + key;
    memory.set(k, String(value));
    try {
      area()?.setItem(k, String(value));
    } catch {
      // memory already holds it
    }
  }

  function has(key) {
    return getRaw(key) !== null;
  }

  function getJSON(key, fallback) {
    const raw = getRaw(key);
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function setJSON(key, value) {
    setRaw(key, JSON.stringify(value));
  }

  return { getRaw, setRaw, getJSON, setJSON, has };
}
