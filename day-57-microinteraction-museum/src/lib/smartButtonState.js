export const SMART_BUTTON_TIMINGS = Object.freeze({
  loading: 900,
  success: 1400,
})

export const SMART_BUTTON_LABELS = Object.freeze({
  idle: 'Publish exhibit',
  loading: 'Publishing',
  success: 'Published',
})

export function nextSmartButtonState(state) {
  switch (state) {
    case 'idle':
      return 'loading'
    case 'loading':
      return 'success'
    case 'success':
      return 'idle'
    default:
      return 'idle'
  }
}
