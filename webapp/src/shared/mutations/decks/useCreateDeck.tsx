import { useMutation, useQueryClient } from '@tanstack/react-query'

import { Deck, DeckClass } from '~/lib/proto'
import { APIClient } from '~/shared/clients'
import { getUserDecksKey } from '~/shared/constants/react-query-keys'
import { trackSaveDeck } from '~/shared/helpers/analytics-old'
import { captureError } from '~/shared/helpers/sentry'
import { getDecodedDeckString } from '~/shared/hooks/decks/useDecodedDeckString'
import { authenticationState } from '~/shared/state/authentication-state'

interface UseCreateDeckArgs {
  name: string
  deckClass: DeckClass
  deckString: string
  art?: string
}

export const useCreateDeck = () => {
  const queryClient = useQueryClient()

  return useMutation(
    async (deckInfo: UseCreateDeckArgs) => {
      const { cardIds, deckClass } = getDecodedDeckString(deckInfo.deckString)

      if (!cardIds) {
        throw new Error(`Unable to parse deckstring: ${deckInfo.deckString}`)
      }

      if (deckClass !== deckInfo.deckClass) {
        throw new Error(
          `Parsed class ${deckClass} does not match supplied class ${deckInfo.deckClass}`
        )
      }

      return await APIClient.opensky.createDeck({
        req: {
          name: deckInfo.name,
          class: deckInfo.deckClass,
          cardIds: cardIds.map((id) => Number(id)),
          art: deckInfo.art
        }
      })
    },
    {
      onError: (error) => {
        captureError(error, 'Error creating deck')
      },
      onSuccess: ({ res }) => {
        const authedAddress = authenticationState.userAddress

        if (authedAddress) {
          queryClient.setQueryData<Deck[] | undefined>(
            getUserDecksKey(authedAddress),
            (data) => {
              if (!data) return [res]
              return [...data, res]
            }
          )
        }

        trackSaveDeck(true, res.cardIds, {
          prism: res.class,
          id: res.uuid,
          deckString: res.deckString
        })
      }
    }
  )
}
