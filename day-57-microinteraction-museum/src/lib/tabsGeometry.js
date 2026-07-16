export function measureTabEdges(tabRect, listRect) {
  return {
    left: tabRect.left - listRect.left,
    right: tabRect.right - listRect.left,
  }
}

export function getNextTabIndex(currentIndex, key, tabCount) {
  if (tabCount <= 0) return -1

  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return (currentIndex + 1) % tabCount
    case 'ArrowLeft':
    case 'ArrowUp':
      return (currentIndex - 1 + tabCount) % tabCount
    case 'Home':
      return 0
    case 'End':
      return tabCount - 1
    default:
      return currentIndex
  }
}

export function getInkEdgeSprings(direction, reducedMotion = false) {
  if (reducedMotion) {
    const transition = { duration: 0.12, ease: 'easeOut' }
    return { left: transition, right: transition }
  }

  const leading = { type: 'spring', stiffness: 680, damping: 42, mass: 0.72 }
  const trailing = { type: 'spring', stiffness: 330, damping: 30, mass: 0.9 }

  return direction >= 0
    ? { left: trailing, right: leading }
    : { left: leading, right: trailing }
}
