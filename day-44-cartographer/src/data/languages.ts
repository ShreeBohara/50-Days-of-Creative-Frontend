// Place-name "languages" — small syllable grammars that give each world a
// consistent naming flavour. A root word is built from starts/mids/ends, then a
// feature template positions it naturally (`{}` is replaced by the root).
// Assembly lives in names.ts; everything is deterministic from a seeded PRNG.

export interface Language {
  id: string
  name: string
  /** Capitalised name beginnings. */
  starts: string[]
  /** Optional connective middles (occasionally inserted). */
  mids: string[]
  /** Lowercase endings. */
  ends: string[]
  /** Feature templates by site kind; `{}` is the root word. */
  peak: string[]
  cape: string[]
  bay: string[]
  isle: string[]
  /** Settlement templates; `{}` is a short root (a single start syllable). */
  town: string[]
}

export const LANGUAGES: Language[] = [
  {
    id: 'norse',
    name: 'Norse',
    starts: ['Dran', 'Skar', 'Vald', 'Eyr', 'Hrol', 'Fjall', 'Grim', 'Stor', 'Bjar', 'Thorn', 'Sval', 'Ulf'],
    mids: ['a', 'is', 'var', 'und'],
    ends: ['gard', 'vik', 'fjord', 'heim', 'nes', 'dal', 'holm', 'fell', 'oy'],
    peak: ['Mount {}', '{} Fell', '{} Tind'],
    cape: ['Cape {}', '{} Ness', '{} Point'],
    bay: ['{} Bay', '{} Sound', '{} Vik'],
    isle: ['{} Isle', '{} Holm', 'Isle of {}'],
    town: ['{}vik', '{}by', '{}stad', '{}holt'],
  },
  {
    id: 'latin',
    name: 'Latin',
    starts: ['Aqui', 'Vela', 'Cor', 'Mari', 'Terra', 'Sera', 'Luci', 'Albi', 'Porto', 'Nova', 'Vesta', 'Cael'],
    mids: ['an', 'ent', 'or', 'ia'],
    ends: ['nia', 'mar', 'us', 'ium', 'ona', 'ara', 'ena', 'ica'],
    peak: ['Mons {}', 'Mount {}', '{} Alta'],
    cape: ['Cape {}', 'Capo {}', '{} Point'],
    bay: ['{} Bay', 'Gulf of {}', '{} Mare'],
    isle: ['{} Isle', 'Insula {}', 'Isle of {}'],
    town: ['{}polis', '{}ium', '{}ara'],
  },
  {
    id: 'polynesian',
    name: 'Islander',
    starts: ['Mana', 'Lani', 'Kapu', 'Tava', 'Rangi', 'Mau', 'Hiva', 'Vaka', 'Tane', 'Moa', 'Anu', 'Hoki'],
    mids: ['a', 'na', 'lo', 'ki'],
    ends: ['nui', 'roa', 'tea', 'moana', 'rangi', 'iki', 'tapu', 'hina', 'vai'],
    peak: ['Mauna {}', 'Mount {}', '{} Iki'],
    cape: ['Cape {}', '{} Lae', '{} Point'],
    bay: ['{} Bay', '{} Lagoon', '{} Moana'],
    isle: ['{} Isle', 'Motu {}', 'Isle of {}'],
    town: ['{}nui', '{}iki', '{}vai'],
  },
  {
    id: 'albion',
    name: 'Albion',
    starts: ['Ash', 'Black', 'Wend', 'Thorn', 'Marsh', 'Oak', 'Pen', 'Stone', 'Win', 'Cold', 'Hart', 'Brad'],
    mids: ['er', 'en', 'ing', 'over'],
    ends: ['ford', 'wick', 'mere', 'combe', 'moor', 'cliff', 'haven', 'wold', 'bourne'],
    peak: ['Mount {}', '{} Tor', '{} Beacon'],
    cape: ['{} Point', '{} Head', 'Cape {}'],
    bay: ['{} Bay', '{} Cove', '{} Reach'],
    isle: ['{} Isle', '{} Eyot', 'Isle of {}'],
    town: ['{}ton', '{}by', '{}port', '{}wich'],
  },
]

const BY_ID = new Map(LANGUAGES.map((l) => [l.id, l]))

export function getLanguage(id: string): Language {
  return BY_ID.get(id) ?? LANGUAGES[0]
}
