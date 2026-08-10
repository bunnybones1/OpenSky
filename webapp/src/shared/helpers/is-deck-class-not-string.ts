import { DeckClass } from '@opensky/proto'
import { COMBINED_CODES_ORDERED } from '@opensky/shared/constants'

export const isDeckClassNotString = (
  toCheck: string | DeckClass
): toCheck is DeckClass => {
  return COMBINED_CODES_ORDERED.includes(toCheck as DeckClass)
}
