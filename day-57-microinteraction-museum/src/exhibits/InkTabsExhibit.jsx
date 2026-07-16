import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'motion/react'
import {
  getInkEdgeSprings,
  getNextTabIndex,
  measureTabEdges,
} from '../lib/tabsGeometry.js'
import './InkTabsExhibit.css'

const TABS = [
  {
    id: 'craft',
    label: 'Craft',
    kicker: '01 / Material',
    headline: 'Details carry the weight.',
    copy: 'The indicator behaves like a mark made by hand—not a box moving on rails.',
    stat: '2 edges',
  },
  {
    id: 'timing',
    label: 'Timing',
    kicker: '02 / Tempo',
    headline: 'Speed is never one number.',
    copy: 'A quick leading edge arrives first while the trailing edge catches up behind it.',
    stat: '680 k',
  },
  {
    id: 'physics',
    label: 'Physics',
    kicker: '03 / Tension',
    headline: 'Stretch makes direction visible.',
    copy: 'Independent springs turn distance and direction into a brief, liquid silhouette.',
    stat: '42 d',
  },
  {
    id: 'access',
    label: 'Access',
    kicker: '04 / Input',
    headline: 'The keyboard gets the same tour.',
    copy: 'Arrow, Home, and End keys move selection and focus as one deliberate action.',
    stat: '4 keys',
  },
]

function getDirection(currentIndex, nextIndex, key) {
  if (key === 'ArrowRight' || key === 'ArrowDown' || key === 'End') return 1
  if (key === 'ArrowLeft' || key === 'ArrowUp' || key === 'Home') return -1
  return nextIndex >= currentIndex ? 1 : -1
}

export function InkTabsExhibit() {
  const [activeIndex, setActiveIndex] = useState(0)
  const listRef = useRef(null)
  const tabRefs = useRef([])
  const activeIndexRef = useRef(0)
  const animationsRef = useRef([])
  const reducedMotion = useReducedMotion()
  const leftEdge = useMotionValue(0)
  const rightEdge = useMotionValue(0)
  const indicatorOpacity = useMotionValue(0)
  const indicatorWidth = useTransform(
    [leftEdge, rightEdge],
    ([left, right]) => Math.max(0, right - left),
  )

  const positionIndicator = useCallback((index, direction = 1, instant = false) => {
    const list = listRef.current
    const tab = tabRefs.current[index]
    if (!list || !tab) return

    const edges = measureTabEdges(tab.getBoundingClientRect(), list.getBoundingClientRect())
    animationsRef.current.forEach((animation) => animation.stop())

    if (instant || indicatorOpacity.get() === 0) {
      leftEdge.set(edges.left)
      rightEdge.set(edges.right)
      indicatorOpacity.set(1)
      return
    }

    const springs = getInkEdgeSprings(direction, reducedMotion)
    animationsRef.current = [
      animate(leftEdge, edges.left, springs.left),
      animate(rightEdge, edges.right, springs.right),
    ]
  }, [indicatorOpacity, leftEdge, reducedMotion, rightEdge])

  useLayoutEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      positionIndicator(activeIndexRef.current, 1, true)
    })

    const observer = new ResizeObserver(() => {
      positionIndicator(activeIndexRef.current, 1, true)
    })

    if (listRef.current) observer.observe(listRef.current)
    tabRefs.current.forEach((tab) => {
      if (tab) observer.observe(tab)
    })

    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
      animationsRef.current.forEach((animation) => animation.stop())
    }
  }, [positionIndicator])

  useEffect(() => {
    activeIndexRef.current = activeIndex
  }, [activeIndex])

  const selectTab = (nextIndex, direction, shouldFocus = false) => {
    if (nextIndex === activeIndexRef.current) return
    activeIndexRef.current = nextIndex
    setActiveIndex(nextIndex)
    positionIndicator(nextIndex, direction)
    if (shouldFocus) tabRefs.current[nextIndex]?.focus()
  }

  const handleKeyDown = (event, currentIndex) => {
    const nextIndex = getNextTabIndex(currentIndex, event.key, TABS.length)
    if (nextIndex === currentIndex && !['Home', 'End'].includes(event.key)) return

    event.preventDefault()
    selectTab(nextIndex, getDirection(currentIndex, nextIndex, event.key), true)
  }

  const activeTab = TABS[activeIndex]

  return (
    <div className="ink-tabs">
      <div className="ink-tabs__label-row" aria-hidden="true">
        <span>Elastic index</span>
        <span><i /> Independent edges</span>
      </div>

      <div className="ink-tabs__rail" role="tablist" aria-label="Interaction study lenses" ref={listRef}>
        <motion.span
          className="ink-tabs__indicator"
          aria-hidden="true"
          style={{ x: leftEdge, width: indicatorWidth, opacity: indicatorOpacity }}
        />
        {TABS.map((tab, index) => (
          <button
            className="ink-tabs__tab"
            id={`ink-tab-${tab.id}`}
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeIndex === index}
            aria-controls={`ink-panel-${tab.id}`}
            tabIndex={activeIndex === index ? 0 : -1}
            ref={(node) => { tabRefs.current[index] = node }}
            onClick={() => selectTab(index, getDirection(activeIndexRef.current, index))}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          className="ink-tabs__panel"
          id={`ink-panel-${activeTab.id}`}
          key={activeTab.id}
          role="tabpanel"
          aria-labelledby={`ink-tab-${activeTab.id}`}
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
          transition={{ duration: reducedMotion ? 0.08 : 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="ink-tabs__copy">
            <span>{activeTab.kicker}</span>
            <h3>{activeTab.headline}</h3>
            <p>{activeTab.copy}</p>
          </div>
          <strong aria-label={`${activeTab.stat}, motion notation`}>{activeTab.stat}</strong>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
