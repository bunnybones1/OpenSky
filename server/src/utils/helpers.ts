import {
  CLASS_LEN,
  DECK_CLASS_MAPPINGS,
  SW_PREFIX,
  VERSION
} from '@opensky/deck-string-codec'
import { DeckClass } from '@opensky/proto'
import { Prism } from '@skyweaver/state-metadata'

export const getInt64Bytes = (x: number): Uint8Array => {
  const y = x / 2 ** 32
  const arr = new Uint8Array(8)
  arr.set(
    [y, y << 8, y << 16, y << 24, x, x << 8, x << 16, x << 24].map(
      z => z >>> 24
    )
  )
  return arr
}

export const randomDeckStringCheck = new RegExp(
  `^${SW_PREFIX}[A-Z]{${CLASS_LEN}}${VERSION}$`,
  'g'
)

export const prismsToDeckClass = (prisms: Prism[]): DeckClass | null => {
  const mappings = Object.entries(DECK_CLASS_MAPPINGS)
  const prismsAsDeckClasses = prisms.map(p => p.toUpperCase()).sort()
  for (const [key, deckClasses] of mappings) {
    if (prismsAsDeckClasses.length !== deckClasses.length) {
      continue
    }
    const sortedPrisms = [...deckClasses].sort()
    if (prismsAsDeckClasses.every((item, i) => item === sortedPrisms[i])) {
      return key as DeckClass
    }
  }
  return null
}

export const datetimeDebugFormat = (date: Date) => {
  return date.toLocaleString('en-US', { timeZone: 'America/Toronto' })
}
