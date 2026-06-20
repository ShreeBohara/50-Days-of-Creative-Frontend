import { useCallback, useEffect, useRef } from 'react'

/**
 * Drives per-glyph variable-font reactivity outside of React's render loop.
 *
 * Glyph nodes register themselves; a single rAF loop reads the pointer and the
 * active behavior, then writes inline styles directly to the DOM for 60fps
 * smoothness. Base glyph centers are measured (transform-free, via offset
 * metrics) only when the layout actually changes.
 */
export function useKineticEngine({ behaviorRef, paramsRef, reducedMotion }) {
  const glyphMap = useRef(new Map())
  const glyphList = useRef([])
  const posterEl = useRef(null)
  const needMeasure = useRef(true)
  const pointer = useRef({
    x: typeof window !== 'undefined' ? window.innerWidth / 2 : 0,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 : 0,
    vx: 0,
    vy: 0,
    active: false,
  })

  // Glyphs register by stable index so unmounts (text edits) clean up correctly.
  const registerGlyph = useCallback((index, node, char) => {
    if (node) {
      glyphMap.current.set(index, {
        node,
        index,
        char,
        localX: 0,
        localY: 0,
        cx: 0,
        cy: 0,
        wght: 360,
        opsz: 26,
        soft: 0,
        scale: 1,
        tx: 0,
        ty: 0,
        rot: 0,
        opacity: 1,
        seed: Math.random(),
      })
    } else {
      glyphMap.current.delete(index)
    }
    needMeasure.current = true
  }, [])

  const measure = useCallback(() => {
    const list = [...glyphMap.current.values()].sort((a, b) => a.index - b.index)
    if (!list.length) {
      glyphList.current = list
      needMeasure.current = false
      return
    }
    // Reset transforms so we read true rest positions.
    for (const g of list) {
      g.node.style.transform = 'none'
      g.node.style.fontVariationSettings = ''
    }
    const poster = list[0].node.offsetParent || list[0].node.parentElement
    posterEl.current = poster
    const pr = poster.getBoundingClientRect()
    for (const g of list) {
      const r = g.node.getBoundingClientRect()
      g.localX = r.left + r.width / 2 - pr.left
      g.localY = r.top + r.height / 2 - pr.top
    }
    glyphList.current = list
    needMeasure.current = false
  }, [])

  useEffect(() => {
    const onMove = (e) => {
      const p = pointer.current
      p.vx = e.clientX - p.x
      p.vy = e.clientY - p.y
      p.x = e.clientX
      p.y = e.clientY
      p.active = true
    }
    const onLeave = () => {
      pointer.current.active = false
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onMove, { passive: true })
    window.addEventListener('pointerleave', onLeave)
    window.addEventListener('blur', onLeave)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onMove)
      window.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('blur', onLeave)
    }
  }, [])

  // Re-measure when the viewport changes size (also covers font load reflow).
  useEffect(() => {
    const onResize = () => {
      needMeasure.current = true
    }
    window.addEventListener('resize', onResize)
    document.fonts?.ready.then(onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (reducedMotion) {
      // Static, legible specimen — no animation loop.
      if (needMeasure.current) measure()
      for (const g of glyphList.current) {
        g.node.style.transform = 'none'
        g.node.style.fontVariationSettings =
          '"opsz" 110, "wght" 440, "SOFT" 0, "WONK" 0'
      }
      return
    }

    let raf = 0
    let last = performance.now()
    const frame = (now) => {
      if (needMeasure.current) measure()
      const list = glyphList.current
      const poster = posterEl.current
      if (poster && list.length) {
        const r = poster.getBoundingClientRect()
        const p = pointer.current
        const beh = behaviorRef.current
        const params = paramsRef.current
        const ctx = {
          px: p.x,
          py: p.y,
          vx: p.vx,
          vy: p.vy,
          active: p.active,
          t: now / 1000,
          dt: Math.min(0.05, (now - last) / 1000),
          radius: params.radius,
          intensity: params.intensity,
          baseWeight: params.baseWeight,
          w: window.innerWidth,
          h: window.innerHeight,
          count: list.length,
        }
        for (const g of list) {
          g.cx = r.left + g.localX
          g.cy = r.top + g.localY
          beh.step(g, ctx)
        }
      }
      last = now
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [behaviorRef, paramsRef, reducedMotion, measure])

  return { registerGlyph, pointer }
}
