import { TFunction } from '@opensky/language-manager'
import { CardDescriptionToken } from '@opensky/parse-card-description'

import { CardType } from '~/shared/constants/cards'
import { getCardTexts } from '~/shared/hooks/cards/useCardTexts'

import { isNotNull } from '../is-defined-is-not-null'

export const getMentionedCard = (card: CardType, t: TFunction) => {
  const { description } = getCardTexts(card.baseId, t)

  if (!description) {
    return
  }

  const mentionedCardTokens: CardDescriptionToken[] = []

  description.forEach((token) => {
    const { type, value } = token
    if (
      type === 'card' &&
      !!value.cardId &&
      Number(value.cardId) !== Number(card.baseId)
    ) {
      mentionedCardTokens.push(token)
    }
  })

  return mentionedCardTokens
    .map((token) => {
      if (!!token?.value && 'cardId' in token.value) return token.value.cardId
      return null
    })
    .filter(isNotNull)
}
