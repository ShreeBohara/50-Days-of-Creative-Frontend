export const SCROLLY_STEP_COUNT = 8

export function clampStepIndex(index, count = SCROLLY_STEP_COUNT) {
  if (count <= 0) return -1
  const numericIndex = Number.isFinite(index) ? Math.trunc(index) : 0
  return Math.min(count - 1, Math.max(0, numericIndex))
}

export function getScrollDirection(previousPosition, nextPosition, fallback = 'down') {
  if (nextPosition > previousPosition) return 'down'
  if (nextPosition < previousPosition) return 'up'
  return fallback
}

export function makeTriggerRootMargin(triggerPoint = 0.5, bandSize = 0.08) {
  const trigger = Math.min(1, Math.max(0, triggerPoint))
  const band = Math.min(1, Math.max(0.01, bandSize))
  const halfBand = band / 2
  const top = Math.max(0, trigger - halfBand) * 100
  const bottom = Math.max(0, 1 - trigger - halfBand) * 100

  return `-${top.toFixed(2)}% 0px -${bottom.toFixed(2)}% 0px`
}

/**
 * Selects the last narrative step whose top has crossed the trigger line.
 * The same calculation works in both directions, avoiding forward-only state.
 */
export function findActiveStepIndex(rectangles, triggerY, fallbackIndex = 0) {
  if (!rectangles?.length) return fallbackIndex

  let active = -1
  rectangles.forEach((rectangle, index) => {
    if (Number.isFinite(rectangle?.top) && rectangle.top <= triggerY) active = index
  })

  return active >= 0 ? active : 0
}

export function pickIntersectingStep(indices, currentIndex, direction, count) {
  if (!indices?.length) return null

  const valid = indices
    .filter((index) => Number.isInteger(index) && index >= 0 && index < count)
    .sort((a, b) => a - b)

  if (!valid.length) return null
  return direction === 'up' ? valid[0] : valid[valid.length - 1]
}

export function getStepScrollOptions(reducedMotion) {
  return {
    behavior: reducedMotion ? 'auto' : 'smooth',
    block: 'center',
  }
}

function toArray(collection) {
  return Array.from(collection ?? [])
}

function readScrollPosition(windowObject, root) {
  if (root && Number.isFinite(root.scrollTop)) return root.scrollTop
  return windowObject?.scrollY ?? windowObject?.pageYOffset ?? 0
}

function resolveReducedMotion(value, windowObject) {
  if (typeof value === 'boolean') return { value, media: null }
  if (typeof windowObject?.matchMedia !== 'function') return { value: false, media: null }

  const media = windowObject.matchMedia('(prefers-reduced-motion: reduce)')
  return { value: media.matches, media }
}

function getObserverConstructor(options, windowObject) {
  if (options.IntersectionObserver) return options.IntersectionObserver
  if (windowObject?.IntersectionObserver) return windowObject.IntersectionObserver
  if (typeof IntersectionObserver !== 'undefined') return IntersectionObserver
  return null
}

/**
 * IntersectionObserver-driven controller for the eight-step coffee essay.
 * It owns only navigation state; chart/layout work stays in the caller's
 * `onStepChange` callback.
 */
export class ScrollyController {
  constructor(options = {}) {
    this.document = options.document ?? (
      typeof document !== 'undefined' ? document : null
    )
    this.window = options.window ?? (
      typeof window !== 'undefined' ? window : null
    )
    this.root = options.root ?? null
    this.steps = toArray(options.steps ?? this.document?.querySelectorAll('[data-step]'))
    this.railItems = toArray(
      options.railItems ?? this.document?.querySelectorAll('[data-step-target]'),
    )
    this.count = options.count ?? SCROLLY_STEP_COUNT
    this.triggerPoint = options.triggerPoint ?? 0.5
    this.bandSize = options.bandSize ?? 0.08
    this.onStepChange = options.onStepChange ?? (() => {})
    this.activeIndex = clampStepIndex(options.initialIndex ?? 0, this.count)
    this.lastScrollPosition = readScrollPosition(this.window, this.root)
    this.direction = 'down'
    this.destroyed = false
    this.observer = null
    this.cleanupCallbacks = []
    this.fallbackFrame = null

    if (options.enforceCount !== false) {
      if (this.steps.length !== this.count || this.railItems.length !== this.count) {
        throw new RangeError(
          `ScrollyController expected ${this.count} steps and ${this.count} rail items; `
          + `received ${this.steps.length} and ${this.railItems.length}.`,
        )
      }
    }

    const motion = resolveReducedMotion(options.reducedMotion, this.window)
    this.reducedMotion = motion.value
    this.motionMedia = motion.media
    this._handleMotionPreference = (event) => {
      this.reducedMotion = event.matches
    }

    if (this.motionMedia) {
      if (typeof this.motionMedia.addEventListener === 'function') {
        this.motionMedia.addEventListener('change', this._handleMotionPreference)
        this.cleanupCallbacks.push(() => (
          this.motionMedia.removeEventListener('change', this._handleMotionPreference)
        ))
      } else if (typeof this.motionMedia.addListener === 'function') {
        this.motionMedia.addListener(this._handleMotionPreference)
        this.cleanupCallbacks.push(() => (
          this.motionMedia.removeListener(this._handleMotionPreference)
        ))
      }
    }

    this._handleIntersections = this._handleIntersections.bind(this)
    this._handleFallbackScroll = this._handleFallbackScroll.bind(this)
    this._bindRail()
    this._createObserver(options)
    this.setActive(this.activeIndex, { reason: 'initial', force: true })
  }

  _bindRail() {
    this.railItems.forEach((item, index) => {
      const handler = (event) => {
        event?.preventDefault?.()
        this.scrollToStep(index)
      }

      item.addEventListener?.('click', handler)
      this.cleanupCallbacks.push(() => item.removeEventListener?.('click', handler))
    })
  }

  _createObserver(options) {
    const Observer = getObserverConstructor(options, this.window)

    if (Observer) {
      this.observer = new Observer(this._handleIntersections, {
        root: this.root,
        rootMargin: makeTriggerRootMargin(this.triggerPoint, this.bandSize),
        threshold: [0, 0.01],
      })
      this.steps.forEach((step) => this.observer.observe(step))
      return
    }

    this.window?.addEventListener?.('scroll', this._handleFallbackScroll, { passive: true })
    this.window?.addEventListener?.('resize', this._handleFallbackScroll)
    this.cleanupCallbacks.push(() => {
      this.window?.removeEventListener?.('scroll', this._handleFallbackScroll)
      this.window?.removeEventListener?.('resize', this._handleFallbackScroll)
    })
  }

  _handleIntersections(entries) {
    if (this.destroyed) return

    const position = readScrollPosition(this.window, this.root)
    this.direction = getScrollDirection(
      this.lastScrollPosition,
      position,
      this.direction,
    )
    this.lastScrollPosition = position

    const intersecting = entries
      .filter((entry) => entry.isIntersecting)
      .map((entry) => this.steps.indexOf(entry.target))
    const observedIndex = pickIntersectingStep(
      intersecting,
      this.activeIndex,
      this.direction,
      this.count,
    )

    const nextIndex = observedIndex ?? this._measureActiveIndex()
    this.setActive(nextIndex, { reason: 'observer', direction: this.direction })
  }

  _handleFallbackScroll() {
    if (this.destroyed || this.fallbackFrame != null) return

    const requestFrame = this.window?.requestAnimationFrame
      ?? ((callback) => setTimeout(callback, 16))
    this.fallbackFrame = requestFrame(() => {
      this.fallbackFrame = null
      this.refresh('scroll-fallback')
    })
  }

  _measureActiveIndex() {
    const rootRect = this.root?.getBoundingClientRect?.()
    const viewportTop = rootRect?.top ?? 0
    const viewportHeight = rootRect?.height ?? this.window?.innerHeight ?? 0
    const triggerY = viewportTop + viewportHeight * this.triggerPoint
    const rectangles = this.steps.map((step) => step.getBoundingClientRect())

    return findActiveStepIndex(rectangles, triggerY, this.activeIndex)
  }

  refresh(reason = 'refresh') {
    if (this.destroyed) return this.activeIndex

    const position = readScrollPosition(this.window, this.root)
    this.direction = getScrollDirection(
      this.lastScrollPosition,
      position,
      this.direction,
    )
    this.lastScrollPosition = position

    const nextIndex = this._measureActiveIndex()
    this.setActive(nextIndex, { reason, direction: this.direction })
    return nextIndex
  }

  setActive(index, options = {}) {
    if (this.destroyed) return false

    const nextIndex = clampStepIndex(index, this.count)
    const previousIndex = this.activeIndex
    const changed = nextIndex !== previousIndex
    this.activeIndex = nextIndex

    this.railItems.forEach((item, itemIndex) => {
      const active = itemIndex === nextIndex
      item.classList?.toggle('is-active', active)
      if (active) {
        item.setAttribute?.('aria-current', 'step')
      } else {
        item.removeAttribute?.('aria-current')
      }
    })

    this.steps.forEach((step, stepIndex) => {
      step.classList?.toggle('is-active', stepIndex === nextIndex)
    })

    if (changed || options.force) {
      this.onStepChange(nextIndex, {
        previousIndex,
        direction: options.direction ?? this.direction,
        reason: options.reason ?? 'programmatic',
        step: this.steps[nextIndex] ?? null,
        controller: this,
      })
    }

    return changed
  }

  scrollToStep(index) {
    if (this.destroyed) return false

    const nextIndex = clampStepIndex(index, this.count)
    const step = this.steps[nextIndex]
    if (!step || typeof step.scrollIntoView !== 'function') return false

    this.setActive(nextIndex, { reason: 'rail' })
    step.scrollIntoView(getStepScrollOptions(this.reducedMotion))
    return true
  }

  setReducedMotion(reduced) {
    this.reducedMotion = Boolean(reduced)
  }

  destroy() {
    if (this.destroyed) return

    this.observer?.disconnect()
    this.cleanupCallbacks.splice(0).forEach((cleanup) => cleanup())

    if (this.fallbackFrame != null) {
      if (typeof this.window?.cancelAnimationFrame === 'function') {
        this.window.cancelAnimationFrame(this.fallbackFrame)
      } else {
        clearTimeout(this.fallbackFrame)
      }
    }

    this.fallbackFrame = null
    this.destroyed = true
  }
}

export function createScrollyController(options) {
  return new ScrollyController(options)
}

export default ScrollyController
