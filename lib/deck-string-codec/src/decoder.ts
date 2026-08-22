import * as base58 from 'bs58'
import {
  SW_PREFIX_LEN,
  CLASS_LEN,
  VERSION_LEN,
  VERSION,
  isBigEndian
} from './constants'
import { DeckClass, CardClass } from '@opensky/proto'
import { CardLibrary, BaseCard } from '@skyweaver/state-metadata'
export { DECK_CLASS_MAPPINGS } from './mappings'

// If return is type string there was an error and the string is the error message
export function decode(
  lib: typeof CardLibrary,
  deckString: string
): [string, DeckClass, string[]] | string {
  if (deckString.length < SW_PREFIX_LEN + CLASS_LEN + VERSION_LEN) {
    return 'invalid deck string length'
  }
  const clazz = parseClass(deckString)
  if (clazz == null) {
    return 'Invalid format, could not parse class'
  }
  const version = parseVersion(deckString)
  if (version == null) {
    return 'Invalid format, could not parse version'
  }
  const values = parseValues(lib, deckString, clazz)
  if (values == null) {
    return 'Invalid format, could not parse values'
  }

  return [version, clazz, values]
}

function parseValues(
  lib: typeof CardLibrary,
  deckString: string,
  clazz: string
): string[] | null {
  try {
    const base58EncodedValues = deckString.substr(
      SW_PREFIX_LEN + CLASS_LEN + VERSION_LEN
    )
    const cc = parseCardClass(clazz)
    const bytes = base58.decode(base58EncodedValues)
    if (isBigEndian) {
      swap16(bytes)
    }
    const numbers = new Uint16Array(
      bytes.buffer,
      bytes.byteOffset,
      bytes.length / 2
    )

    return Array.from(numbers)
      .map(num => `${num}`)
      .filter(id => {
        const card = lib.get(id as BaseCard)
        return card && cc.includes(card.prism.toUpperCase())
      })
  } catch (e) {
    return null
  }
}

function swap16(bytes: Uint8Array): void {
  for (let index = 0; index < bytes.length; index += 2) {
    const first = bytes[index]
    bytes[index] = bytes[index + 1]
    bytes[index + 1] = first
  }
}

function parseClass(deckString: string): DeckClass | null {
  const clazz = deckString.substr(SW_PREFIX_LEN, CLASS_LEN)
  return (clazz as DeckClass) ? (clazz as DeckClass) : null
}

function parseVersion(deckString: string): string | null {
  const version = deckString.substr(SW_PREFIX_LEN + CLASS_LEN, VERSION_LEN)
  return version === VERSION ? version : null
}

function parseCardClass(clazz: string): [string, string] {
  const c = clazz.toUpperCase()
  let class1 = '',
    class2 = ''

  // same class validation as in cards.go
  switch (c) {
    case DeckClass.STR:
    case DeckClass.STH:
    case DeckClass.STA:
    case DeckClass.STI:
    case DeckClass.STW:
      class1 = CardClass.STR
      break
    case DeckClass.HRT:
    case DeckClass.HRA:
    case DeckClass.HRI:
    case DeckClass.HRW:
      class1 = CardClass.HRT
      break
    case DeckClass.AGY:
    case DeckClass.AGI:
    case DeckClass.AGW:
      class1 = CardClass.AGY
      break
    case DeckClass.INT:
    case DeckClass.INW:
      class1 = CardClass.INT
      break
    case DeckClass.WIS:
      class1 = CardClass.WIS
      break
  }

  switch (c) {
    case DeckClass.STW:
    case DeckClass.HRW:
    case DeckClass.AGW:
    case DeckClass.INW:
      class2 = CardClass.WIS
      break
    case DeckClass.STI:
    case DeckClass.HRI:
    case DeckClass.AGI:
      class2 = CardClass.INT
      break
    case DeckClass.STA:
    case DeckClass.HRA:
      class2 = CardClass.AGY
      break
    case DeckClass.STH:
      class2 = CardClass.HRT
      break
  }

  return [class1, class2]
}
