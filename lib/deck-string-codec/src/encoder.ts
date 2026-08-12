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
  const buffer = new Uint8Array(ua.buffer, ua.byteOffset, ua.byteLength)
  if (isBigEndian) {
    swap16(buffer)
  }
  const encodedValues = base58.encode(buffer)

  return `${SW_PREFIX}${clazz}${version}${encodedValues}`
}

function swap16(bytes: Uint8Array): void {
  for (let index = 0; index < bytes.length; index += 2) {
    const first = bytes[index]
    bytes[index] = bytes[index + 1]
    bytes[index + 1] = first
  }
}

function validVersion(version: string): string | null {
  return version !== VERSION ? `Unknown version ${version}` : null
}

function validClass(clazz: string): string | null {
  return clazz in DeckClass ? null : `Invalid class/skill ${clazz}`
}
