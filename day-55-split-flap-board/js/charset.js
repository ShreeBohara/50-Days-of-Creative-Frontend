export const FLAP_CHARSET = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:•→";

export function toFlapCharacter(value) {
  const character = String(value ?? " ").charAt(0).toUpperCase() || " ";
  return FLAP_CHARSET.includes(character) ? character : " ";
}

export function nextFlapCharacter(character) {
  const safeCharacter = toFlapCharacter(character);
  const index = FLAP_CHARSET.indexOf(safeCharacter);
  return FLAP_CHARSET[(index + 1) % FLAP_CHARSET.length];
}

export function getForwardDistance(fromCharacter, toCharacter) {
  const fromIndex = FLAP_CHARSET.indexOf(toFlapCharacter(fromCharacter));
  const toIndex = FLAP_CHARSET.indexOf(toFlapCharacter(toCharacter));
  return (toIndex - fromIndex + FLAP_CHARSET.length) % FLAP_CHARSET.length;
}

export function getForwardSequence(fromCharacter, toCharacter) {
  const distance = getForwardDistance(fromCharacter, toCharacter);
  const sequence = [];
  let character = toFlapCharacter(fromCharacter);

  for (let index = 0; index < distance; index += 1) {
    character = nextFlapCharacter(character);
    sequence.push(character);
  }

  return sequence;
}

export function getCellVariance(index) {
  const value = Math.sin((Number(index) + 1) * 12.9898) * 43758.5453;
  const normalized = value - Math.floor(value);
  return 0.9 + normalized * 0.2;
}

export function getStaggerDelay(row, column, staggered = true) {
  if (!staggered) return 0;
  return Math.max(0, Number(column) || 0) * 25 + Math.max(0, Number(row) || 0) * 4;
}
