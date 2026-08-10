import { useQuery } from '@tanstack/react-query'
import { useSnapshot } from 'valtio'

import { Deck, DeckClass } from '~/lib/proto'
import { GlobalQueryClient } from '~/shared/clients'
import { APIClient } from '~/shared/clients'
import { getUserDecksKey } from '~/shared/constants/react-query-keys'
import { ONE_DAY } from '~/shared/constants/time'
import { authenticationState } from '~/shared/state/authentication-state'

export const fetchUserDecks = async () => {
  const { res: decks } = await APIClient.opensky.listDecks({
    page: { pageSize: 500 }
  })
  return decks.filter((deck) => deck.class !== DeckClass.UNKNOWN_CLASS)
}

export const useUserDecks = () => {
  const { userAddress } = useSnapshot(authenticationState)

  return useQuery(getUserDecksKey(userAddress), fetchUserDecks, {
    enabled: !!userAddress,
    staleTime: ONE_DAY
  })
}

export const useUserDeck = (uuid?: string) => {
  const { userAddress } = useSnapshot(authenticationState)

  return useQuery(getUserDecksKey(userAddress), fetchUserDecks, {
    enabled: !!userAddress && !!uuid,
    staleTime: ONE_DAY,
    notifyOnChangeProps: ['data', 'error'],
    select: (data) => {
      if (!uuid) return null
      if (!data) return data

      const deck = data.find((deck) => deck.uuid === uuid)

      return deck || null
    }
  })
}

export const getUserDecks = () => {
  if (!authenticationState.userAddress) return null
  return GlobalQueryClient.getQueryData<Deck[] | undefined>(
    getUserDecksKey(authenticationState.userAddress)
  )
}
