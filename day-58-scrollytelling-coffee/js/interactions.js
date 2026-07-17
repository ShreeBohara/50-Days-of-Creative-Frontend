export function clampIndex(index, count) {
  if (count <= 0) return -1;
  return Math.min(count - 1, Math.max(0, Math.trunc(Number(index) || 0)));
}

export function gridIndexForKey(currentIndex, key, columns = 40, count = 1000) {
  const current = clampIndex(currentIndex, count);
  if (current < 0) return -1;

  switch (key) {
    case "ArrowLeft":
      return clampIndex(current - 1, count);
    case "ArrowRight":
      return clampIndex(current + 1, count);
    case "ArrowUp":
      return clampIndex(current - columns, count);
    case "ArrowDown":
      return clampIndex(current + columns, count);
    case "Home":
      return Math.floor(current / columns) * columns;
    case "End":
      return Math.min(count - 1, Math.floor(current / columns) * columns + columns - 1);
    default:
      return current;
  }
}

export function findNearestParticle(particles, x, y, maximumDistance = 14) {
  if (!particles?.length || !Number.isFinite(x) || !Number.isFinite(y)) return -1;

  const limitSquared = maximumDistance * maximumDistance;
  let closestIndex = -1;
  let closestDistance = limitSquared;

  particles.forEach((particle, index) => {
    const offsetX = particle.x - x;
    const offsetY = particle.y - y;
    const distance = offsetX * offsetX + offsetY * offsetY;
    if (distance <= closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });

  return closestIndex;
}

export function positionTooltip(anchor, size, bounds, padding = 12) {
  const gap = 14;
  const width = Math.max(0, size?.width ?? 0);
  const height = Math.max(0, size?.height ?? 0);
  const maxX = Math.max(padding, (bounds?.width ?? 0) - width - padding);
  const maxY = Math.max(padding, (bounds?.height ?? 0) - height - padding);
  const preferredX = (anchor?.x ?? 0) + gap;
  const preferredY = (anchor?.y ?? 0) - height / 2;

  return {
    x: Math.min(maxX, Math.max(padding, preferredX)),
    y: Math.min(maxY, Math.max(padding, preferredY)),
  };
}

export function formatCoffeeTooltip(record) {
  if (!record) return { title: "Coffee", detail: "No purchase selected." };

  const date = new Date(`${record.date}T00:00:00.000Z`);
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    weekday: "short",
    timeZone: "UTC",
  }).format(date);
  const minutes = Number.isInteger(record.minute) ? record.minute : 0;
  const formattedTime = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2025, 0, 1, record.hour, minutes)));
  const drink = record.drink ?? record.drinkType ?? "coffee";

  return {
    title: drink[0].toUpperCase() + drink.slice(1),
    detail: `${formattedDate} · ${formattedTime} · $${Number(record.price).toFixed(2)}`,
  };
}
