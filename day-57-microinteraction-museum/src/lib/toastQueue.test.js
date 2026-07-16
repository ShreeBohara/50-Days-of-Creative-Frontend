import { describe, expect, it } from 'vitest'
import {
  MAX_VISIBLE_TOASTS,
  TOAST_DURATION_MS,
  createToast,
  dismissToast,
  enqueueToast,
  seedToastQueue,
  splitToastQueue,
  tickVisibleToasts,
} from './toastQueue.js'

describe('toast queue helpers', () => {
  it('rotates through the five catalog messages', () => {
    expect(createToast(0, 1).title).toBe('Object archived')
    expect(createToast(5, 2).title).toBe('Object archived')
    expect(createToast(4, 3).remainingMs).toBe(TOAST_DURATION_MS)
  })

  it('places a new toast at the front and enforces a queue cap', () => {
    const queue = seedToastQueue(3, 100)
    const next = createToast(3, 4, 100)

    expect(enqueueToast(queue, next, 3).map(({ id }) => id)).toEqual([
      'toast-4',
      'toast-3',
      'toast-2',
    ])
  })

  it('limits the visible stack and reports hidden overflow', () => {
    const queue = seedToastQueue(5, 100)
    const stack = splitToastQueue(queue)

    expect(stack.visible).toHaveLength(MAX_VISIBLE_TOASTS)
    expect(stack.hidden).toHaveLength(2)
    expect(stack.overflowCount).toBe(2)
  })

  it('promotes the first hidden toast when a visible toast is dismissed', () => {
    const queue = seedToastQueue(5, 100)
    const before = splitToastQueue(queue)
    const after = splitToastQueue(dismissToast(queue, before.visible[1].id))

    expect(after.visible).toHaveLength(3)
    expect(after.visible[2].id).toBe(before.hidden[0].id)
    expect(after.overflowCount).toBe(1)
  })

  it('ticks only visible toasts so queued items retain their full lifetime', () => {
    const queue = seedToastQueue(4, 100)
    const ticked = tickVisibleToasts(queue, 250)

    expect(ticked.slice(0, 3).every(({ remainingMs }) => remainingMs === 4750)).toBe(true)
    expect(ticked[3].remainingMs).toBe(TOAST_DURATION_MS)
  })

  it('removes a visible toast once its lifetime is exhausted', () => {
    const queue = seedToastQueue(4, 100)
    const ticked = tickVisibleToasts(queue, TOAST_DURATION_MS)

    expect(ticked).toHaveLength(1)
    expect(ticked[0].remainingMs).toBe(TOAST_DURATION_MS)
  })
})
