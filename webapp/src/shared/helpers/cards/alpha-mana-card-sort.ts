import { TFunction } from '@opensky/language-manager'
import { BaseCard, CardLibrary } from '@skyweaver/state-metadata'

import { getCardTexts } from '../../hooks/cards/useCardTexts'

export const cardAlphaSort = (a: BaseCard, b: BaseCard, t: TFunction) => {
  const aName = getCardTexts(a, t)?.name || ''
  const bName = getCardTexts(b, t)?.name || ''

  if (aName < bName) return -1
  if (aName > bName) return 1
  return 0
}

export const alphaManaCardSort = (cardIds: BaseCard[], t: TFunction) => {
  return cardIds.sort((a, b) => {
    const cardA = CardLibrary.get(a)
    const cardB = CardLibrary.get(b)

    if (!cardA || !cardB) return 0

    const costA = cardA.cost === 'X' ? 100 : Number(cardA.cost)
    const costB = cardB.cost === 'X' ? 100 : Number(cardB.cost)

    if (costA - costB !== 0) return costA - costB

    return cardAlphaSort(a, b, t)
  })
}
