import { TFunction } from '@opensky/language-manager'
import {
  getParsedCardDescription,
  joinParsedDescription
} from '@opensky/parse-card-description'
import { BaseCard, getTooltipsForCards } from '@skyweaver/state-metadata'

import { isImageIcon } from '~/shared/components/ImageIcon/ImageIconConfig'
import { CardType } from '~/shared/constants/cards'
import { CardKeywordMeta } from '~/shared/types/cards'

// TODO: Validate this includes keywords correctly. Since a description that is "+1" will match to the enum type.
export const getCardKeywords = (
  card: CardType,
  t: TFunction
): CardKeywordMeta[] | undefined => {
  return getTooltipsForCards([
    {
      base: `${card.baseId}` as BaseCard
    }
  ]).map((tooltip) => {
    return {
      icon:
        tooltip.vocab.icon && isImageIcon(tooltip.vocab.icon)
          ? tooltip.vocab.icon
          : undefined,
      description: joinParsedDescription(
        getParsedCardDescription(
          t(`vocab:${tooltip.vocabID as 'draw'}.text`),
          () => {
            throw new Error('card IDs not supported in vocab')
          },
          t
        )
      ),
      name: joinParsedDescription(
        getParsedCardDescription(
          t(`vocab:${tooltip.vocabID as 'draw'}.title`),
          () => {
            throw new Error('card IDs not supported in vocab')
          },
          t
        )
      )
    }
  })
}
