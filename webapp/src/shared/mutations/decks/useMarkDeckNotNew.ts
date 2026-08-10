import { useMutation, useQueryClient } from '@tanstack/react-query'

import { Deck } from '~/lib/proto'
import { APIClient } from '~/shared/clients'
import { getUserDecksKey } from '~/shared/constants/react-query-keys'
import { captureError } from '~/shared/helpers/sentry'
import { authenticationState } from '~/shared/state/authentication-state'

export const useMarkDeckNotNew = () => {
  const queryClient = useQueryClient()

  return useMutation(
    async (deck: Deck) => {
      if (!deck.isNew) {
        return
      }

      await APIClient.opensky.markDeckNotNew({ uuid: deck.uuid })
    },
    {
      onMutate: (deck) => {
        const address = authenticationState.userAddress
        if (!!address) {
          queryClient.setQueryData<Deck[] | undefined>(
            getUserDecksKey(address),
            (data) => {
              if (!data) return data
              return data.map((_deck) => {
                if (_deck.uuid === deck.uuid) {
                  return { ..._deck, isNew: false }
                }
                return _deck
              })
            }
          )
        }
      },
      onError: (error, deck) => {
        const address = authenticationState.userAddress

        if (!!address) {
          queryClient.setQueryData<Deck[] | undefined>(
            getUserDecksKey(address),
            (data) => {
              if (!data) return data
              return data.map((_deck) => {
                if (_deck.uuid === deck.uuid) {
                  return { ..._deck, isNew: true }
                }
                return _deck
              })
            }
          )
        }

        captureError(error, 'Error marking deck not new')
      }
    }
  )
}
