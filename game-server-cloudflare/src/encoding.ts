export const bytesToHex = (bytes: Uint8Array | number[]) =>
  `0x${[...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`

export const hexToBytes = (value: string) => {
  const hex = value.startsWith('0x') ? value.slice(2) : value
  if (hex.length % 2 !== 0 || !/^[0-9a-f]*$/i.test(hex)) {
    throw new Error('invalid hex data')
  }
  const bytes = new Uint8Array(hex.length / 2)
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16)
  }
  return bytes
}

export const addressBytesToHex = (bytes: number[]) => {
  if (bytes.length !== 20 || bytes.some((byte) => !Number.isInteger(byte) || byte < 0 || byte > 255)) {
    throw new Error('invalid address bytes')
  }
  return bytesToHex(bytes).toLowerCase()
}

export const numberToInt64Bytes = (value: number) => {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('invalid match ID')
  const high = Math.floor(value / 2 ** 32)
  const low = value >>> 0
  return new Uint8Array([
    (high >>> 24) & 0xff,
    (high >>> 16) & 0xff,
    (high >>> 8) & 0xff,
    high & 0xff,
    (low >>> 24) & 0xff,
    (low >>> 16) & 0xff,
    (low >>> 8) & 0xff,
    low & 0xff
  ])
}
