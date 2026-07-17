const DEFAULT_DURATION = 900
const DEFAULT_STAGGER = 120

const hasWindow = () => typeof window !== 'undefined'

const defaultNow = () => {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now()
  }

  return Date.now()
}

const defaultRequestFrame = (callback) => {
  if (!hasWindow() || typeof window.requestAnimationFrame !== 'function') return null
  return window.requestAnimationFrame(callback)
}

const defaultCancelFrame = (id) => {
  if (id == null || !hasWindow() || typeof window.cancelAnimationFrame !== 'function') return
  window.cancelAnimationFrame(id)
}

export function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value))
}

export function capDevicePixelRatio(value = 1) {
  return clamp(Number.isFinite(value) ? value : 1, 1, 2)
}

export function easeInOutCubic(value) {
  const t = clamp(value, 0, 1)
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export function transitionValue(from, to, elapsed, duration, easing = easeInOutCubic) {
  if (duration <= 0) return to
  return from + (to - from) * easing(clamp(elapsed / duration, 0, 1))
}

function resolveCanvasSize(source, fallbackCanvas) {
  const rect = source?.contentRect ?? source

  if (Number.isFinite(rect?.width) && Number.isFinite(rect?.height)) {
    return { width: rect.width, height: rect.height }
  }

  if (fallbackCanvas && typeof fallbackCanvas.getBoundingClientRect === 'function') {
    const bounds = fallbackCanvas.getBoundingClientRect()
    return { width: bounds.width, height: bounds.height }
  }

  return { width: 0, height: 0 }
}

function makeParticle(source, index, width, height) {
  const x = Number.isFinite(source?.x) ? source.x : width / 2
  const y = Number.isFinite(source?.y) ? source.y : height / 2

  return {
    ...source,
    id: source?.id ?? index,
    x,
    y,
    targetX: Number.isFinite(source?.targetX) ? source.targetX : x,
    targetY: Number.isFinite(source?.targetY) ? source.targetY : y,
    radius: Number.isFinite(source?.radius) ? source.radius : 2.2,
    alpha: Number.isFinite(source?.alpha) ? source.alpha : 0.86,
    color: source?.color ?? '#6f4028',
    ambientPhase: Number.isFinite(source?.ambientPhase)
      ? source.ambientPhase
      : (index * 2.399963229728653) % (Math.PI * 2),
    ambientScale: Number.isFinite(source?.ambientScale)
      ? source.ambientScale
      : 0.55 + ((index * 37) % 45) / 100,
    transition: null,
    pulse: null,
  }
}

function resolveTarget(targets, particle, index) {
  if (typeof targets === 'function') return targets(particle, index)
  if (targets instanceof Map) return targets.get(particle.id)
  return targets?.[index]
}

function normalisedRank(index, count, order, particle) {
  if (typeof order === 'function') {
    return clamp(order(particle, index, count), 0, 1)
  }

  if (count <= 1) return 0
  return index / (count - 1)
}

function pulseAmount(pulse, now) {
  if (!pulse) return 0
  const progress = clamp((now - pulse.startedAt) / pulse.duration, 0, 1)
  return Math.sin(progress * Math.PI) * pulse.strength
}

function defaultParticleRenderer(context, particle, frame) {
  const pulse = frame.pulse
  const radius = Math.max(0, particle.radius * (1 + pulse * 0.32))

  if (radius === 0 || particle.alpha <= 0) return

  context.beginPath()
  context.globalAlpha = clamp(particle.alpha * (1 + pulse * 0.18), 0, 1)
  context.fillStyle = particle.color
  context.arc(frame.x, frame.y, radius, 0, Math.PI * 2)
  context.fill()
}

/**
 * A small, layout-agnostic canvas particle runtime.
 *
 * Particle objects are created once and keep their identity for the lifetime of
 * the engine. Layout modules only send new targets; the engine owns interruption,
 * timing, DPR scaling, ambient offsets, pulses, and frame scheduling.
 */
export class ParticleEngine {
  constructor(options = {}) {
    this.canvas = options.canvas ?? null
    this.context = options.context
      ?? (this.canvas && typeof this.canvas.getContext === 'function'
        ? this.canvas.getContext('2d')
        : null)

    this.width = 0
    this.height = 0
    this.dpr = 1
    this.reducedMotion = Boolean(options.reducedMotion)
    this.destroyed = false
    this.frameId = null
    this.overlayHooks = new Set(options.overlays ?? [])
    this.pauseReasons = new Set()
    this.pausedAt = null
    this.resizeObserver = null
    this.visibilityDocument = null
    this.overlayWantsFrame = false

    this.clock = options.now ?? defaultNow
    this.requestFrame = options.requestAnimationFrame ?? defaultRequestFrame
    this.cancelFrame = options.cancelAnimationFrame ?? defaultCancelFrame
    this.getDevicePixelRatio = options.getDevicePixelRatio ?? (() => (
      hasWindow() ? window.devicePixelRatio : 1
    ))
    this.renderParticle = options.renderParticle ?? defaultParticleRenderer
    this.clear = options.clear !== false
    this.onResize = options.onResize ?? null
    this.ambient = {
      enabled: Boolean(options.ambient?.enabled),
      amplitude: Number.isFinite(options.ambient?.amplitude)
        ? options.ambient.amplitude
        : 1.5,
      speed: Number.isFinite(options.ambient?.speed)
        ? options.ambient.speed
        : 0.0007,
    }

    const initialSize = resolveCanvasSize(options.size, this.canvas)
    this.width = Math.max(0, initialSize.width)
    this.height = Math.max(0, initialSize.height)

    const particleSources = options.particles
      ?? Array.from({ length: options.count ?? 0 }, () => ({}))
    this.particles = particleSources.map((source, index) => (
      makeParticle(source, index, this.width, this.height)
    ))

    this._tick = this._tick.bind(this)
    this._handleVisibilityChange = this._handleVisibilityChange.bind(this)

    if (this.canvas) this.resize(options.size)
    if (options.observeResize) this.observeResize(options.resizeTarget)
    if (options.observeVisibility) this.observeVisibility(options.document)
  }

  resize(source, explicitHeight) {
    if (this.destroyed) return false

    const size = Number.isFinite(source) && Number.isFinite(explicitHeight)
      ? { width: source, height: explicitHeight }
      : resolveCanvasSize(source, this.canvas)
    const width = Math.max(0, size.width)
    const height = Math.max(0, size.height)

    if (width === 0 || height === 0) return false

    const previous = { width: this.width, height: this.height, dpr: this.dpr }
    const dpr = capDevicePixelRatio(this.getDevicePixelRatio())
    const changed = width !== this.width || height !== this.height || dpr !== this.dpr

    this.width = width
    this.height = height
    this.dpr = dpr

    if (this.canvas) {
      const pixelWidth = Math.max(1, Math.round(width * dpr))
      const pixelHeight = Math.max(1, Math.round(height * dpr))

      if (this.canvas.width !== pixelWidth) this.canvas.width = pixelWidth
      if (this.canvas.height !== pixelHeight) this.canvas.height = pixelHeight

      if (this.canvas.style) {
        this.canvas.style.width = `${width}px`
        this.canvas.style.height = `${height}px`
      }
    }

    if (this.context && typeof this.context.setTransform === 'function') {
      this.context.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    if (changed && typeof this.onResize === 'function') {
      this.onResize({ width, height, dpr, previous, engine: this })
    }

    this.render(this.clock())
    return changed
  }

  observeResize(target = this.canvas?.parentElement ?? this.canvas) {
    if (this.destroyed || !target || typeof ResizeObserver === 'undefined') return false

    this.resizeObserver?.disconnect()
    this.resizeObserver = new ResizeObserver((entries) => {
      const entry = entries.find((candidate) => candidate.target === target) ?? entries[0]
      if (entry) this.resize(entry)
    })
    this.resizeObserver.observe(target)
    return true
  }

  observeVisibility(documentObject = (
    typeof document !== 'undefined' ? document : null
  )) {
    if (!documentObject || typeof documentObject.addEventListener !== 'function') return false

    this.visibilityDocument?.removeEventListener(
      'visibilitychange',
      this._handleVisibilityChange,
    )
    this.visibilityDocument = documentObject
    documentObject.addEventListener('visibilitychange', this._handleVisibilityChange)
    this.setVisibility(!documentObject.hidden)
    return true
  }

  _handleVisibilityChange() {
    this.setVisibility(!this.visibilityDocument?.hidden)
  }

  setTargets(targets, options = {}) {
    if (this.destroyed) return

    const now = Number.isFinite(options.now) ? options.now : this.clock()
    this.advance(now, { render: false })

    const duration = Math.max(0, options.duration ?? DEFAULT_DURATION)
    const stagger = Math.max(0, options.stagger ?? DEFAULT_STAGGER)
    const easing = options.easing ?? easeInOutCubic
    const count = this.particles.length

    this.particles.forEach((particle, index) => {
      const target = resolveTarget(targets, particle, index)
      if (!target) return

      const x = Number.isFinite(target.x) ? target.x : particle.x
      const y = Number.isFinite(target.y) ? target.y : particle.y
      const alpha = Number.isFinite(target.alpha) ? target.alpha : particle.alpha
      const radius = Number.isFinite(target.radius) ? target.radius : particle.radius
      const delay = typeof options.stagger === 'function'
        ? Math.max(0, options.stagger(particle, index, count))
        : stagger * normalisedRank(index, count, options.order, particle)

      particle.targetX = x
      particle.targetY = y
      if (target.color != null) particle.color = target.color
      if (target.meta != null) particle.meta = target.meta

      if (this.reducedMotion || duration === 0) {
        particle.x = x
        particle.y = y
        particle.alpha = alpha
        particle.radius = radius
        particle.transition = null
        return
      }

      particle.transition = {
        startedAt: now,
        delay,
        duration,
        easing,
        fromX: particle.x,
        fromY: particle.y,
        fromAlpha: particle.alpha,
        fromRadius: particle.radius,
        toX: x,
        toY: y,
        toAlpha: alpha,
        toRadius: radius,
      }
    })

    this.render(now)
    this.wake()
  }

  snapToTargets() {
    this.particles.forEach((particle) => {
      if (particle.transition) {
        particle.x = particle.transition.toX
        particle.y = particle.transition.toY
        particle.alpha = particle.transition.toAlpha
        particle.radius = particle.transition.toRadius
      } else {
        particle.x = particle.targetX
        particle.y = particle.targetY
      }

      particle.transition = null
      particle.pulse = null
    })

    this.render(this.clock())
    this._cancelScheduledFrame()
  }

  setReducedMotion(reduced) {
    const next = Boolean(reduced)
    if (next === this.reducedMotion) return

    this.reducedMotion = next
    if (next) {
      this.snapToTargets()
    } else {
      this.render(this.clock())
      this.wake()
    }
  }

  setAmbient(config) {
    if (typeof config === 'boolean') {
      this.ambient.enabled = config
    } else if (config) {
      if ('enabled' in config) this.ambient.enabled = Boolean(config.enabled)
      if (Number.isFinite(config.amplitude)) this.ambient.amplitude = config.amplitude
      if (Number.isFinite(config.speed)) this.ambient.speed = config.speed
    }

    this.render(this.clock())
    if (this.ambient.enabled) this.wake()
  }

  pulse(selector, options = {}) {
    const now = Number.isFinite(options.now) ? options.now : this.clock()
    const ids = Array.isArray(selector) || selector instanceof Set
      ? new Set(selector)
      : null
    const matches = (particle, index) => {
      if (typeof selector === 'function') return selector(particle, index)
      if (ids) return ids.has(particle.id)
      if (selector == null) return true
      return particle.id === selector
    }

    this.particles.forEach((particle, index) => {
      if (!matches(particle, index)) return
      particle.pulse = this.reducedMotion
        ? null
        : {
            startedAt: now,
            duration: Math.max(1, options.duration ?? 900),
            strength: Math.max(0, options.strength ?? 0.8),
          }
    })

    this.render(now)
    this.wake()
  }

  addOverlay(renderer) {
    if (typeof renderer !== 'function') {
      throw new TypeError('ParticleEngine overlays must be functions.')
    }

    this.overlayHooks.add(renderer)
    this.wake()
    return () => this.removeOverlay(renderer)
  }

  removeOverlay(renderer) {
    this.overlayHooks.delete(renderer)
    this.render(this.clock())
  }

  advance(now = this.clock(), options = {}) {
    if (this.destroyed) return false

    let active = false

    this.particles.forEach((particle) => {
      const transition = particle.transition
      if (transition) {
        const elapsed = now - transition.startedAt - transition.delay
        const progress = transition.duration <= 0
          ? 1
          : clamp(elapsed / transition.duration, 0, 1)
        const eased = transition.easing(progress)

        particle.x = transition.fromX + (transition.toX - transition.fromX) * eased
        particle.y = transition.fromY + (transition.toY - transition.fromY) * eased
        particle.alpha = transition.fromAlpha
          + (transition.toAlpha - transition.fromAlpha) * eased
        particle.radius = transition.fromRadius
          + (transition.toRadius - transition.fromRadius) * eased

        if (progress >= 1) {
          particle.x = transition.toX
          particle.y = transition.toY
          particle.alpha = transition.toAlpha
          particle.radius = transition.toRadius
          particle.transition = null
        } else {
          active = true
        }
      }

      if (particle.pulse) {
        if (now - particle.pulse.startedAt >= particle.pulse.duration) {
          particle.pulse = null
        } else {
          active = true
        }
      }
    })

    if (options.render !== false) this.render(now)
    return active
  }

  render(now = this.clock()) {
    if (this.destroyed || !this.context || this.width <= 0 || this.height <= 0) {
      return false
    }

    const context = this.context
    if (this.clear && typeof context.clearRect === 'function') {
      context.clearRect(0, 0, this.width, this.height)
    }

    if (typeof context.save === 'function') context.save()
    this.particles.forEach((particle, index) => {
      const ambient = this.ambient.enabled && !this.reducedMotion
        ? this.ambient.amplitude * particle.ambientScale
        : 0
      const phase = particle.ambientPhase + now * this.ambient.speed
      const frame = {
        x: particle.x + Math.cos(phase) * ambient,
        y: particle.y + Math.sin(phase * 0.91) * ambient,
        pulse: this.reducedMotion ? 0 : pulseAmount(particle.pulse, now),
        now,
        index,
        width: this.width,
        height: this.height,
        dpr: this.dpr,
        engine: this,
      }

      this.renderParticle(context, particle, frame)
    })

    this.overlayWantsFrame = false
    const overlayFrame = {
      now,
      width: this.width,
      height: this.height,
      dpr: this.dpr,
      particles: this.particles,
      engine: this,
    }
    this.overlayHooks.forEach((renderer) => {
      if (renderer(context, overlayFrame) === true) this.overlayWantsFrame = true
    })

    if (typeof context.restore === 'function') context.restore()
    if ('globalAlpha' in context) context.globalAlpha = 1
    return true
  }

  isAnimating(now = this.clock()) {
    if (this.reducedMotion || this.destroyed) return false
    if (this.ambient.enabled || this.overlayWantsFrame) return true

    return this.particles.some((particle) => (
      particle.transition
      || (particle.pulse && now - particle.pulse.startedAt < particle.pulse.duration)
    ))
  }

  wake() {
    if (
      this.destroyed
      || this.frameId != null
      || this.pauseReasons.size > 0
      || this.reducedMotion
    ) return

    const id = this.requestFrame(this._tick)
    if (id != null) this.frameId = id
  }

  _tick(timestamp) {
    this.frameId = null
    if (this.destroyed || this.pauseReasons.size > 0) return

    const now = Number.isFinite(timestamp) ? timestamp : this.clock()
    const active = this.advance(now, { render: true })
    if (active || this.ambient.enabled || this.overlayWantsFrame) this.wake()
  }

  _cancelScheduledFrame() {
    if (this.frameId == null) return
    this.cancelFrame(this.frameId)
    this.frameId = null
  }

  pause(reason = 'manual', now = this.clock()) {
    if (this.destroyed || this.pauseReasons.has(reason)) return

    if (this.pauseReasons.size === 0) this.pausedAt = now
    this.pauseReasons.add(reason)
    this._cancelScheduledFrame()
  }

  resume(reason = 'manual', now = this.clock()) {
    if (this.destroyed || !this.pauseReasons.has(reason)) return

    this.pauseReasons.delete(reason)
    if (this.pauseReasons.size > 0) return

    const pausedDuration = Math.max(0, now - (this.pausedAt ?? now))
    this.particles.forEach((particle) => {
      if (particle.transition) particle.transition.startedAt += pausedDuration
      if (particle.pulse) particle.pulse.startedAt += pausedDuration
    })
    this.pausedAt = null
    this.render(now)
    this.wake()
  }

  setVisibility(visible, now = this.clock()) {
    if (visible) {
      this.resume('visibility', now)
    } else {
      this.pause('visibility', now)
    }
  }

  destroy() {
    if (this.destroyed) return

    this._cancelScheduledFrame()
    this.resizeObserver?.disconnect()
    this.visibilityDocument?.removeEventListener(
      'visibilitychange',
      this._handleVisibilityChange,
    )
    this.overlayHooks.clear()
    this.destroyed = true
  }
}

export default ParticleEngine
