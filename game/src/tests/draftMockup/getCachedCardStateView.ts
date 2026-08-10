import { RelaxedCardInstance } from '~/components/CardInstanceComponent'
import { getFakeCardTagView } from '~/utils/card'

import { DraftStateCard } from './DraftState'

const __reg = new Map<DraftStateCard, RelaxedCardInstance>()
export function getCachedCardStateView(card: DraftStateCard) {
  if (!__reg.has(card)) {
    __reg.set(card, getFakeCardTagView(card.base, card.rarity))
  }
  return __reg.get(card)!
}
