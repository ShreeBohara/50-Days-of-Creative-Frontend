export const MAX_VISIBLE_TOASTS = 3
export const TOAST_DURATION_MS = 5000
export const MAX_TOAST_QUEUE = 8

export const TOAST_SAMPLES = [
  {
    eyebrow: 'Collection',
    title: 'Object archived',
    detail: 'Study 04 moved to the quiet room.',
    tone: 'vermilion',
    glyph: 'archive',
  },
  {
    eyebrow: 'Field note',
    title: 'Annotation saved',
    detail: 'Your observation joined the catalog.',
    tone: 'cobalt',
    glyph: 'note',
  },
  {
    eyebrow: 'Museum radio',
    title: 'Guided loop ready',
    detail: 'A seven-minute listening route is queued.',
    tone: 'ink',
    glyph: 'play',
  },
  {
    eyebrow: 'Studio',
    title: 'Replica published',
    detail: 'The interaction is now on public view.',
    tone: 'success',
    glyph: 'check',
  },
  {
    eyebrow: 'Closing bell',
    title: 'Visit remembered',
    detail: 'Your place in the collection is secure.',
    tone: 'acid',
    glyph: 'dot',
  },
]

export function createToast(sampleIndex, id, now = Date.now()) {
  const sample = TOAST_SAMPLES[sampleIndex % TOAST_SAMPLES.length]

  return {
    ...sample,
    id: `toast-${id}`,
    createdAt: now,
    remainingMs: TOAST_DURATION_MS,
  }
}

export function seedToastQueue(count = 2, now = Date.now()) {
  return Array.from({ length: Math.max(0, count) }, (_, index) => (
    createToast(index, index + 1, now)
  )).reverse()
}

export function enqueueToast(queue, toast, limit = MAX_TOAST_QUEUE) {
  return [toast, ...queue].slice(0, Math.max(0, limit))
}

export function dismissToast(queue, toastId) {
  return queue.filter(({ id }) => id !== toastId)
}

export function splitToastQueue(queue, visibleLimit = MAX_VISIBLE_TOASTS) {
  const limit = Math.max(0, visibleLimit)

  return {
    visible: queue.slice(0, limit),
    hidden: queue.slice(limit),
    overflowCount: Math.max(0, queue.length - limit),
  }
}

export function tickVisibleToasts(queue, elapsedMs, visibleLimit = MAX_VISIBLE_TOASTS) {
  if (elapsedMs <= 0 || queue.length === 0) return queue

  return queue
    .map((toast, index) => (
      index < visibleLimit
        ? { ...toast, remainingMs: toast.remainingMs - elapsedMs }
        : toast
    ))
    .filter(({ remainingMs }) => remainingMs > 0)
}
