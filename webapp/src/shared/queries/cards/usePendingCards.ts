import { ItemType } from '@opensky/proto'
import { getGoldID, getSilverID } from '@opensky/shared/assetsIDs'
import { useQuery } from '@tanstack/react-query'
import { useSnapshot } from 'valtio'

import { APIClient } from '~/shared/clients'
import { getPendingCardsKey } from '~/shared/constants/react-query-keys'
import { authenticationState } from '~/shared/state/authentication-state'

export const usePendingCards = () => {
  const { userAddress } = useSnapshot(authenticationState)

  return useQuery(
    getPendingCardsKey(userAddress),
    async () => {
      const { res } = await APIClient.opensky.getPendingCards()

      if (res && res.length > 0) {
        return res.map((pending) => ({
          ...pending,
          tokenIDs: pending.cards.map((card) =>
            card.itemType === ItemType.SW_SILVER_CARDS
              ? getSilverID(card.id)
              : getGoldID(card.id)
          )
        }))
      } else {
        return null
      }
    },
    {
      enabled: !!userAddress
    }
  )
}
