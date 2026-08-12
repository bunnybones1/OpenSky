// Mirrors github.com/google/uuid.Parse, which is the UUID decoder used by the
// source Go matchmaker. In addition to canonical RFC 4122 text it accepts raw
// hex, URNs, and the package's 38-byte Microsoft-style wrapper, then marshals
// every accepted value back to canonical lowercase text.
export const normalizeGoogleUUID = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined

  let hex: string
  switch (value.length) {
    case 32:
      hex = value
      break
    case 36:
      hex = value.replaceAll('-', '')
      if (
        value[8] !== '-' ||
        value[13] !== '-' ||
        value[18] !== '-' ||
        value[23] !== '-'
      ) {
        return undefined
      }
      break
    case 38: {
      // google/uuid deliberately examines only the middle 36 bytes; it does
      // not require the wrapper itself to be braces.
      const middle = value.slice(1, 37)
      if (
        middle[8] !== '-' ||
        middle[13] !== '-' ||
        middle[18] !== '-' ||
        middle[23] !== '-'
      ) {
        return undefined
      }
      hex = middle.replaceAll('-', '')
      break
    }
    case 45: {
      if (value.slice(0, 9).toLowerCase() !== 'urn:uuid:') return undefined
      const uuid = value.slice(9)
      if (
        uuid[8] !== '-' ||
        uuid[13] !== '-' ||
        uuid[18] !== '-' ||
        uuid[23] !== '-'
      ) {
        return undefined
      }
      hex = uuid.replaceAll('-', '')
      break
    }
    default:
      return undefined
  }

  if (!/^[0-9a-f]{32}$/i.test(hex)) return undefined
  const canonical = hex.toLowerCase()
  return `${canonical.slice(0, 8)}-${canonical.slice(8, 12)}-${canonical.slice(12, 16)}-${canonical.slice(16, 20)}-${canonical.slice(20)}`
}
