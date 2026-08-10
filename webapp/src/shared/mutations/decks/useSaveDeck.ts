import { useMutation, useQueryClient } from '@tanstack/react-query'

import { Deck, DeckClass } from '~/lib/proto'
import { APIClient } from '~/shared/clients'
import { getUserDecksKey } from '~/shared/constants/react-query-keys'
import { trackSaveDeck } from '~/shared/helpers/analytics-old'
import { captureError } from '~/shared/helpers/sentry'
import { authenticationState } from '~/shared/state/authentication-state'

interface UseSaveDeckArgs {
  name: string
  uuid: string
  deckClass: DeckClass
  deckString: string
  art?: string
}

export const useSaveDeck = () => {
  const queryClient = useQueryClient()

  return useMutation(
    async (deckInfo: UseSaveDeckArgs) => {
      const { res } = await APIClient.opensky.updateDeck({
        req: {
          uuid: deckInfo.uuid,
          deck: {
            deckString: deckInfo.deckString,
            name: deckInfo.name,
            class: deckInfo.deckClass,
            art: deckInfo.art
          }
        }
      })
      return res
    },
    {
      onError: (error) => {
        captureError(error, 'Error updating deck')
      },
      onSuccess: (response) => {
        const address = authenticationState.userAddress

        if (!!address) {
          queryClient.setQueryData<Deck[] | undefined>(
            getUserDecksKey(address),
            (data) => {
              if (!data) return []

              return data.map((deck) => {
                if (deck.uuid === response.uuid) {
                  return {
                    ...deck,
                    ...response
                  }
                }
                return deck
              })
            }
          )
        }
        trackSaveDeck(false, response.cardIds, {
          prism: response.class,
          id: response.uuid,
          deckString: response.deckString
        })
      }
    }
  )
}
