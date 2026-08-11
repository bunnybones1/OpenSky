const encoder = new TextEncoder()
const decoder = new TextDecoder()

export const utf8 = (value: string) => encoder.encode(value)

export const base64UrlEncode = (value: string | Uint8Array): string => {
  const bytes = typeof value === 'string' ? utf8(value) : value
  let binary = ''

  for (const byte of bytes) binary += String.fromCharCode(byte)

  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

export const base64UrlDecode = (value: string): Uint8Array => {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/').padEnd(
    Math.ceil(value.length / 4) * 4,
    '='
  )
  const binary = atob(padded)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

export const base64UrlDecodeText = (value: string): string =>
  decoder.decode(base64UrlDecode(value))
