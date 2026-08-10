import { DECKCLASS_HEROES } from '@opensky/shared/constants'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { DeckClass } from '~/lib/proto'

export const useDeckName = (
  isStarterDeck: boolean,
  name?: string,
  deckClass?: DeckClass
) => {
  const { t } = useTranslation()
  return useMemo(() => {
    if (isStarterDeck && deckClass && deckClass !== DeckClass.UNKNOWN_CLASS) {
      return t(`play.premadeDecks.${deckClass}.starterDeckName`)
    } else if (!!name) {
      return name
    } else if (!!deckClass) {
      return `${DECKCLASS_HEROES[deckClass]}`
    }
    return t('skypass.deck')
  }, [deckClass, isStarterDeck, name, t])
}
