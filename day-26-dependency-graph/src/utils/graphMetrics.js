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
