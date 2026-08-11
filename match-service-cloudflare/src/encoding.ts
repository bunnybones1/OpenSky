export const bytesToHex = (bytes: Uint8Array | number[]) =>
  `0x${[...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`

export const hexToBytes = (value: string) => {
  if (!/^0x[0-9a-f]{40}$/i.test(value)) throw new Error('invalid game principal')
  const bytes = new Uint8Array(20)
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(2 + index * 2, 4 + index * 2), 16)
  }
  return [...bytes]
}

export const validByteArray = (value: unknown, length: number): value is number[] =>
  Array.isArray(value) &&
  value.length === length &&
  value.every((byte) => Number.isInteger(byte) && byte >= 0 && byte <= 255)
