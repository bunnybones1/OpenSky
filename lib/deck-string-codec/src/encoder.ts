import * as base58 from 'bs58'
import { DeckClass } from '@opensky/proto'
import { isBigEndian, SW_PREFIX, VERSION } from './constants'

// If a null was returned it means there was an error
export function encode(
  version: string,
  values: string[],
  clazz: DeckClass
): string | null {
  let error = validVersion(version)
  if (error != null) {
    console.log(error)
    return null
  }
  error = validClass(clazz)
  if (error != null) {
    console.log(error)
    return null
  }

  const numbers = values.map(value => parseInt(value, 10))
  for (const [number, idx] of numbers.map((num, index) => [num, index])) {
    if (Number.isNaN(number)) {
      console.log(`Could not convert card ${values[idx]} to number.`)
      return null
    }
  }
  const ua = Uint16Array.from(numbers)
  const buffer = Buffer.from(ua.buffer)
  if (isBigEndian) {
    buffer.swap16()
  }
  const encodedValues = base58.encode(buffer)

  return `${SW_PREFIX}${clazz}${version}${encodedValues}`
}

function validVersion(version: string): string | null {
  return version !== VERSION ? `Unknown version ${version}` : null
}

function validClass(clazz: string): string | null {
  return clazz in DeckClass ? null : `Invalid class/skill ${clazz}`
}
