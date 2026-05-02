export function getNodeRadius(node) {
  const dependents = node.dependentCount ?? 0
  const dependencies = node.dependencyCount ?? node.dependencies?.length ?? 0

  return Math.min(26, 8 + dependents * 2.4 + dependencies * 0.38)
}

export function getInitialPosition(index, total, width, height) {
  const angle = index * 2.399963229728653
  const ring = Math.sqrt((index + 1) / total)
  const radius = Math.min(width, height) * 0.34 * ring

  return {
    x: width / 2 + Math.cos(angle) * radius,
    y: height / 2 + Math.sin(angle) * radius,
  }
}

export function getEndpointPoint(endpoint) {
  if (!endpoint || typeof endpoint !== 'object') {
    return null
  }

  return {
    x: endpoint.x ?? 0,
    y: endpoint.y ?? 0,
  }
}

export function getCurvedLinkPath(link) {
  const source = getEndpointPoint(link.source)
  const target = getEndpointPoint(link.target)

  if (!source || !target) {
    return ''
  }

  const dx = target.x - source.x
  const dy = target.y - source.y
  const distance = Math.hypot(dx, dy) || 1
  const normalX = -dy / distance
  const normalY = dx / distance
  const bend = Math.min(52, distance * 0.18)
  const midX = (source.x + target.x) / 2 + normalX * bend
  const midY = (source.y + target.y) / 2 + normalY * bend

  return `M ${source.x} ${source.y} Q ${midX} ${midY} ${target.x} ${target.y}`
}
