import { useMutation, useQueryClient } from '@tanstack/react-query'

import { Deck } from '~/lib/proto'
import { APIClient } from '~/shared/clients'
import { getUserDecksKey } from '~/shared/constants/react-query-keys'
import { captureError } from '~/shared/helpers/sentry'
import { getUserDecks } from '~/shared/queries/decks/useUserDecks'
import { authenticationState } from '~/shared/state/authentication-state'

export const useUnFavouriteDeck = () => {
  const queryClient = useQueryClient()

  return useMutation(
    async (uuid: string) => {
      const decks = getUserDecks()

      if (!decks || !decks.length) {
        throw new Error(
          `Tried to unfavourite deck ${uuid} without any fetched decks.`
        )
      }

      const deck = decks.find((deck) => deck.uuid === uuid)

      if (!deck) {
        throw new Error(`Tried to unfavourite un-fetched deck ${uuid}.`)
      }

      await APIClient.opensky.unfavoriteDeck({ uuid })
    },
    {
      onMutate: (uuid) => {
        const address = authenticationState.userAddress
        if (!!address) {
          queryClient.setQueryData<Deck[] | undefined>(
            getUserDecksKey(address),
            (data) => {
              if (!data) return data
              return data.map((deck) => {
                if (deck.uuid === uuid) {
                  return { ...deck, isFavorite: false }
                }
                return deck
              })
            }
          )
        }
      },
      onError: (error, uuid) => {
        const address = authenticationState.userAddress

        if (!!address) {
          queryClient.setQueryData<Deck[] | undefined>(
            getUserDecksKey(address),
            (data) => {
              if (!data) return data
              return data.map((deck) => {
                if (deck.uuid === uuid) {
                  return { ...deck, isFavorite: true }
                }
                return deck
              })
            }
          )
        }

        captureError(error, 'Error unfavouriting deck')
      }
    }
  )
}
