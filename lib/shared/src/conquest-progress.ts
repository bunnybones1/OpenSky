import { ConquestMatchResult } from '@opensky/proto'

const UINT64_MAX = 18_446_744_073_709_551_615n
const MALFORMED_PROGRESS = 'Conquest match progress is malformed'

/**
 * Mirrors the source's JSONB scan into map[uint64]ConquestMatchResult.
 * Invalid map shapes/keys/value types fail, while nil maps, uint64 key
 * canonicalization, and unknown enum strings retain generated-Go behavior.
 */
export const parseConquestMatchProgress = (
  value: string
): Record<string, ConquestMatchResult> => {
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    throw new Error(MALFORMED_PROGRESS)
  }
  if (parsed === null) return {}
  if (typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(MALFORMED_PROGRESS)
  }

  const progress: Record<string, ConquestMatchResult> = {}
  for (const [key, result] of Object.entries(parsed)) {
    if (!/^\+?\d+$/.test(key)) throw new Error(MALFORMED_PROGRESS)
    const numericKey = key.startsWith('+') ? key.slice(1) : key
    const canonicalKey = numericKey.replace(/^0+(?=\d)/, '')
    if (BigInt(canonicalKey) > UINT64_MAX) {
      throw new Error(MALFORMED_PROGRESS)
    }
    if (result !== null && typeof result !== 'string') {
      throw new Error(MALFORMED_PROGRESS)
    }

    const normalized = [
      ConquestMatchResult.UNKNOWN,
      ConquestMatchResult.WIN,
      ConquestMatchResult.LOSS,
      ConquestMatchResult.DRAW
    ].includes(result as ConquestMatchResult)
      ? (result as ConquestMatchResult)
      : ConquestMatchResult.UNKNOWN
    progress[BigInt(canonicalKey).toString()] = normalized
  }
  return progress
}
