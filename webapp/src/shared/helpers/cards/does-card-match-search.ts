import { TFunction } from '@opensky/language-manager'

import { CardType } from '~/shared/constants/cards'
import { getCardTexts } from '~/shared/hooks/cards/useCardTexts'

export const doesCardMatchSearch = (
  card: CardType,
  text: string,
  t: TFunction
): boolean => {
  const { name, parsedDescription } = getCardTexts(card.baseId, t)

  if (name?.toLowerCase().includes(text)) return true

  if (!!parsedDescription && parsedDescription.toLowerCase().includes(text))
    return true
  if (card.traits && card.traits.length) {
    return card.traits.some((keyword) => keyword.toLowerCase().includes(text))
  }
  return false
}
