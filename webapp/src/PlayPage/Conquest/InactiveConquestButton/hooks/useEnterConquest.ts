import { DECKCLASS_HEROES } from '@opensky/shared/constants'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import { APIClient } from '~/shared/clients'
import { getConquestStatusKey } from '~/shared/constants/react-query-keys'
import { captureError } from '~/shared/helpers/sentry'
import { getUserDecks } from '~/shared/queries/decks/useUserDecks'
import { authenticationState } from '~/shared/state/authentication-state'
import { playState } from '~/shared/state/play-state'
import { addToast } from '~/shared/state/toast-state'

export const useEnterConquest = () => {
  const { selectedConquestDeck } = useSnapshot(playState)
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const enterConquest = useCallback(async () => {
    const decks = getUserDecks()

    if (!selectedConquestDeck || !decks) return

    const deck = decks.find((_deck) => _deck.uuid === selectedConquestDeck)

    if (!deck) return

    let isInConquest = false

    try {
      const { status } = await APIClient.opensky.enterConquest({
        hero: DECKCLASS_HEROES[deck.class]
      })
      isInConquest = status
    } catch (err) {
      isInConquest = false
      captureError(err, 'Entering conquest')
    }

    if (isInConquest) {
      addToast({
        text: t('play.ticketAccepted'),
        icon: 'check-circled',
        iconColor: 'forest4'
      })

      if (!!authenticationState.userAddress) {
        queryClient.invalidateQueries(
          getConquestStatusKey(authenticationState.userAddress)
        )
      }
    } else {
      addToast({
        text: t('play.troubleAccepting'),
        secondaryText: t('play.tryReloading'),
        icon: 'error',
        iconColor: 'warm9',
        isEvergreen: true
      })
    }
  }, [queryClient, selectedConquestDeck, t])

  return { enterConquest }
}
