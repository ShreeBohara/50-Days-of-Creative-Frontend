export const TICKER_MIN_CENTS = 4_800
export const TICKER_MAX_CENTS = 125_000_099
export const TICKER_INITIAL_CENTS = 1_248_620

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatCurrencyCents(cents) {
  return currencyFormatter.format(Math.round(cents) / 100)
}

export function randomCurrencyCents(
  random = Math.random,
  min = TICKER_MIN_CENTS,
  max = TICKER_MAX_CENTS,
) {
  const sample = Math.min(0.999999999999, Math.max(0, random()))
  return min + Math.floor(sample * (max - min + 1))
}

export function tokenizeCurrency(cents) {
  const formatted = formatCurrencyCents(cents)
  const digitPositions = []

  for (let index = formatted.length - 1; index >= 0; index -= 1) {
    if (/\d/.test(formatted[index])) digitPositions.push(index)
  }

  const slotByPosition = new Map(digitPositions.map((position, slot) => [position, slot]))

  const tokens = Array.from(formatted, (character, index) => {
    if (/\d/.test(character)) {
      const slot = slotByPosition.get(index)
      return { id: `digit-${slot}`, type: 'digit', character, slot }
    }

    if (character === '$') {
      return { id: 'currency', type: 'currency', character }
    }

    if (character === '.') {
      return { id: 'decimal', type: 'decimal', character }
    }

    if (character === ',') {
      const digitsToRight = digitPositions.filter((position) => position > index).length
      return {
        id: `comma-${digitsToRight}`,
        type: 'separator',
        character,
        digitsToRight,
      }
    }

    return { id: `literal-${index}`, type: 'literal', character }
  })

  return { formatted, tokens }
}
