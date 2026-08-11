import cardLibrary from './generated/card-library.json'

type LibraryCard = (typeof cardLibrary.cards)[number]

const cards = cardLibrary.cards as LibraryCard[]
const cardsById = new Map(cards.map(card => [card.id, card]))

const deckClasses: Record<string, string[]> = {
  STR: ['STR'],
  HRT: ['HRT'],
  AGY: ['AGY'],
  INT: ['INT'],
  WIS: ['WIS'],
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

const base58Alphabet =
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
const base58Values = new Map(
  Array.from(base58Alphabet, (character, index) => [character, index])
)

const decodeBase58 = (encoded: string): Uint8Array => {
  const littleEndianBytes = [0]
  for (const character of encoded) {
    const value = base58Values.get(character)
    if (value === undefined) throw new Error('invalid base58 character')
    let carry = value
    for (let index = 0; index < littleEndianBytes.length; index += 1) {
      carry += littleEndianBytes[index] * 58
      littleEndianBytes[index] = carry & 0xff
      carry >>= 8
    }
    while (carry > 0) {
      littleEndianBytes.push(carry & 0xff)
      carry >>= 8
    }
  }
  for (
    let index = 0;
    encoded[index] === '1' && index < encoded.length - 1;
    index += 1
  ) {
    littleEndianBytes.push(0)
  }
  return Uint8Array.from(littleEndianBytes.reverse())
}

const validateDeckClasses = (deckClass: string, selected: LibraryCard[]) => {
  const allowed = deckClasses[deckClass]
  if (!allowed) throw new Error(`deck class '${deckClass}' is unknown`)
  const required = new Set(selected.map(card => card.class))
  if (required.size === 0) return
  if (
    required.size > 2 ||
    required.size !== allowed.length ||
    !Array.from(required).every(cardClass => allowed.includes(cardClass))
  ) {
    throw new Error('decoded deck class does not match its cards')
  }
}

export const allLibraryCards = (): LibraryCard[] => cards

export const libraryCardsByIds = (ids: number[]): LibraryCard[] =>
  ids.flatMap(id => {
    const card = cardsById.get(id)
    return card ? [card] : []
  })

export const libraryCardsFromDeckString = (
  deckString: string
): LibraryCard[] => {
  if (deckString.length < 8 || !deckString.startsWith('SWx')) {
    throw new Error('invalid OpenSky deck string')
  }
  const deckClass = deckString.slice(3, 6)
  const version = deckString.slice(6, 8)
  if (version !== '02') throw new Error(`deckstring version '${version}' not recognized`)
  const encoded = deckString.slice(8)
  const decoded = encoded ? decodeBase58(encoded) : new Uint8Array()
  const ids = Array.from(
    { length: Math.floor(decoded.length / 2) },
    (_, index) => decoded[index * 2] | (decoded[index * 2 + 1] << 8)
  )
  if (new Set(ids).size !== ids.length) {
    throw new Error('cannot have duplicate card ids')
  }
  const selected = libraryCardsByIds(ids)
  if (selected.length !== ids.length) throw new Error('invalid deck, missing cards')
  validateDeckClasses(deckClass, selected)
  return selected
}

export const cardLibrarySource = {
  migration: cardLibrary.source,
  sha256: cardLibrary.sourceSha256,
  count: cards.length
}
