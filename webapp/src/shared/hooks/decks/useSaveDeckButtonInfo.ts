import { DECK_CARDS_REQUIRED } from '@opensky/shared/deckConsts'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { useDecodedDeckString } from '~/shared/hooks/decks/useDecodedDeckString'

export const useSaveDeckButtonInfo = (
  deckString?: string,
  isCreate?: boolean,
  isDisabledBecauseOfQueue?: boolean
) => {
  const { t } = useTranslation()

  const { cardIds } = useDecodedDeckString(deckString)

  return useMemo(() => {
    const missingCards = !!cardIds ? DECK_CARDS_REQUIRED - cardIds.length : null

    let buttonText = isCreate ? t('decks.CreateDeck') : t('decks.SaveDeck')

    if (!!missingCards) {
      if (missingCards < 0) {
        buttonText = t('decks.TooManyCards', {
          count: Math.abs(missingCards)
        })
      } else {
        buttonText = t('decks.MissingCards', {
          count: missingCards
        })
      }
    }

    if (isDisabledBecauseOfQueue) {
      buttonText = t('decks.InQueue')
    }

    return {
      buttonText,
      isDisabled: !!missingCards || isDisabledBecauseOfQueue
    }
  }, [cardIds, isCreate, isDisabledBecauseOfQueue, t])
}
