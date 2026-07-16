import { describe, expect, it } from 'vitest'
import {
  SMART_BUTTON_LABELS,
  SMART_BUTTON_TIMINGS,
  nextSmartButtonState,
} from './smartButtonState.js'

describe('smart button state model', () => {
  it('cycles through loading and success before returning to idle', () => {
    expect(nextSmartButtonState('idle')).toBe('loading')
    expect(nextSmartButtonState('loading')).toBe('success')
    expect(nextSmartButtonState('success')).toBe('idle')
  })

  it('keeps the requested timing and accessible labels explicit', () => {
    expect(SMART_BUTTON_TIMINGS).toEqual({ loading: 900, success: 1400 })
    expect(SMART_BUTTON_LABELS.success).toBe('Published')
  })
})
