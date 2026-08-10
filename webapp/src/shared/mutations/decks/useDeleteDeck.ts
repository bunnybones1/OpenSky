import { useMutation, useQueryClient } from '@tanstack/react-query'

import { Deck } from '~/lib/proto'
import { APIClient } from '~/shared/clients'
import { getUserDecksKey } from '~/shared/constants/react-query-keys'
import { trackDeleteDeck } from '~/shared/helpers/analytics-old'
import { captureError } from '~/shared/helpers/sentry'
import { authenticationState } from '~/shared/state/authentication-state'
import { playState, updatePlayState } from '~/shared/state/play-state'

interface UseDeleteDeckArgs {
  uuid: string
}

export const useDeleteDeck = (onMutate?: () => void) => {
  const queryClient = useQueryClient()

  return useMutation(
    async ({ uuid }: UseDeleteDeckArgs) => {
      return await APIClient.opensky.deleteDeck({
        req: {
          uuid
        }
      })
    },
    {
      onMutate: ({ uuid }) => {
        if (onMutate) onMutate()
        let previousDeck: Deck | undefined
        const authedAddress = authenticationState.userAddress

        if (authedAddress) {
          queryClient.setQueryData<Deck[] | undefined>(
            getUserDecksKey(authedAddress),
            (data) => {
              if (!data) return data

              return data.filter((deck) => {
                if (deck.uuid === uuid) {
                  previousDeck = deck
                  return false
                }
                return true
              })
            }
          )
        }
        return previousDeck
      },
      onError: (error, _, previousDeck) => {
        const authedAddress = authenticationState.userAddress

        if (previousDeck && authedAddress) {
          queryClient.setQueryData<Deck[] | undefined>(
            getUserDecksKey(authedAddress),
            (data) => {
              if (!data || data.some((deck) => deck.uuid === previousDeck.uuid))
                return data

              return [...data, previousDeck]
            }
          )
        }
        captureError(error, 'Error deleting deck')
      },
      onSuccess: (_, { uuid }, previousDeck) => {
        if (playState.selectedDeck === uuid) {
          updatePlayState('selectedDeck', undefined)
        }
        if (playState.selectedConquestDeck === uuid) {
          updatePlayState('selectedConquestDeck', undefined)
        }
        if (previousDeck) {
          trackDeleteDeck(previousDeck.cardIds, {
            id: uuid,
            prism: previousDeck.class,
            deckString: previousDeck.deckString
          })
        }
      }
    }
  )
}
