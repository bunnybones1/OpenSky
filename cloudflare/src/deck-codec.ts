import type { DeckClass } from '@opensky/proto'

const BASE58_ALPHABET =
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
const DECK_PREFIX = 'SWx'
const DECK_VERSION = '02'

const DECK_CLASSES = new Set([
  'STR',
  'HRT',
  'AGY',
  'INT',
  'WIS',
  'STH',
  'STA',
  'STI',
  'STW',
  'HRA',
  'HRI',
  'HRW',
  'AGI',
  'AGW',
  'INW'
])

const base58Encode = (bytes: number[]): string => {
  let leadingZeros = 0
  while (leadingZeros < bytes.length && bytes[leadingZeros] === 0) {
    leadingZeros++
  }

  let value = 0n
  for (const byte of bytes) value = value * 256n + BigInt(byte)

  let encoded = ''
  while (value > 0n) {
    const remainder = Number(value % 58n)
    encoded = BASE58_ALPHABET[remainder] + encoded
    value /= 58n
  }
  return '1'.repeat(leadingZeros) + encoded
}

const base58Decode = (encoded: string): number[] => {
  let leadingZeros = 0
  while (leadingZeros < encoded.length && encoded[leadingZeros] === '1') {
    leadingZeros++
  }

  let value = 0n
  for (const character of encoded) {
    const digit = BASE58_ALPHABET.indexOf(character)
    if (digit < 0) throw new Error('invalid base58 deck payload')
    value = value * 58n + BigInt(digit)
  }

  const decoded: number[] = []
  while (value > 0n) {
    decoded.unshift(Number(value % 256n))
    value /= 256n
  }
  return [...Array<number>(leadingZeros).fill(0), ...decoded]
}

const validateCardIds = (cardIds: number[]) => {
  if (new Set(cardIds).size !== cardIds.length) {
    throw new Error('cannot have duplicate card IDs')
  }
  if (
    cardIds.some(
      cardId => !Number.isSafeInteger(cardId) || cardId <= 0 || cardId > 65535
    )
  ) {
    throw new Error('invalid card ID')
  }
}

export const encodeDeckString = (
  cardIds: number[],
  deckClass: DeckClass
): string => {
  validateCardIds(cardIds)
  if (!DECK_CLASSES.has(deckClass)) throw new Error('invalid deck class')

  const bytes = cardIds.flatMap(cardId => [cardId & 0xff, (cardId >> 8) & 0xff])
  return `${DECK_PREFIX}${deckClass}${DECK_VERSION}${base58Encode(bytes)}`
}

export const decodeDeckString = (
  deckString: string
): { cardIds: number[]; deckClass: DeckClass } => {
  if (!deckString.startsWith(DECK_PREFIX) || deckString.length < 8) {
    throw new Error('invalid deck string')
  }
  const deckClass = deckString.slice(3, 6) as DeckClass
  if (!DECK_CLASSES.has(deckClass)) throw new Error('invalid deck class')
  if (deckString.slice(6, 8) !== DECK_VERSION) {
    throw new Error('invalid deck version')
  }

  const bytes = base58Decode(deckString.slice(8))
  if (bytes.length % 2 !== 0) throw new Error('invalid deck card payload')
  const cardIds: number[] = []
  for (let index = 0; index < bytes.length; index += 2) {
    cardIds.push(bytes[index] | (bytes[index + 1] << 8))
  }
  validateCardIds(cardIds)
  return { cardIds, deckClass }
}

const cardClassForDeckValidation = (cardId: number): DeckClass => {
  if (cardId >= 4000 && cardId < 5000) return 'INT' as DeckClass
  if (cardId >= 3000 && cardId < 4000) return 'HRT' as DeckClass
  if (cardId >= 2000 && cardId < 3000) return 'WIS' as DeckClass
  if (cardId >= 1000 && cardId < 2000) return 'AGY' as DeckClass
  if (cardId < 1000) return 'STR' as DeckClass
  throw new Error(`card id ${cardId} is invalid`)
}

const dualClass = (classes: Set<DeckClass>): DeckClass | undefined => {
  const has = (deckClass: string) => classes.has(deckClass as DeckClass)
  if (has('STR') && has('HRT')) return 'STH' as DeckClass
  if (has('STR') && has('AGY')) return 'STA' as DeckClass
  if (has('STR') && has('INT')) return 'STI' as DeckClass
  if (has('STR') && has('WIS')) return 'STW' as DeckClass
  if (has('HRT') && has('AGY')) return 'HRA' as DeckClass
  if (has('HRT') && has('INT')) return 'HRI' as DeckClass
  if (has('HRT') && has('WIS')) return 'HRW' as DeckClass
  if (has('AGY') && has('INT')) return 'AGI' as DeckClass
  if (has('AGY') && has('WIS')) return 'AGW' as DeckClass
  if (has('INT') && has('WIS')) return 'INW' as DeckClass
  return undefined
}

export const validateDeckClass = (
  cardIds: number[],
  requestedClass: DeckClass
): void => {
  validateCardIds(cardIds)
  const classes = new Set(cardIds.map(cardClassForDeckValidation))
  if (!classes.size || classes.size > 2) {
    throw new Error(
      `detected ${classes.size} classes in card list; one or two are required`
    )
  }
  const inferred = classes.size === 1 ? [...classes][0] : dualClass(classes)
  if (!inferred) throw new Error('cannot infer deck class')
  if (requestedClass === inferred) return

  const requestedPrisms: Record<string, string[]> = {
    STH: ['STR', 'HRT'],
    STA: ['STR', 'AGY'],
    STI: ['STR', 'INT'],
    STW: ['STR', 'WIS'],
    HRA: ['HRT', 'AGY'],
    HRI: ['HRT', 'INT'],
    HRW: ['HRT', 'WIS'],
    AGI: ['AGY', 'INT'],
    AGW: ['AGY', 'WIS'],
    INW: ['INT', 'WIS']
  }
  if (!requestedPrisms[requestedClass]?.includes(inferred)) {
    throw new Error('invalid deck class')
  }
}
