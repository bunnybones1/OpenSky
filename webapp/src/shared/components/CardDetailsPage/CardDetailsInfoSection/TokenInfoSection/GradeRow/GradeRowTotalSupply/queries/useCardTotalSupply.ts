import { useQuery } from '@tanstack/react-query'

import { APIClient } from '~/shared/clients'
import { THIRTY_MINUTES } from '~/shared/constants/time'

const CARD_TOTAL_SUPPLY = 'CARD_TOTAL_SUPPLY'

const getCardTotalSupplyKey = (baseId: number) => [CARD_TOTAL_SUPPLY, { baseId }]

export const useCardTotalSupply = (baseId: number) => {
  return useQuery(
    getCardTotalSupplyKey(baseId),
    async () => {
      const { summary } = await APIClient.opensky.getItemSupply({ tokenID: baseId })
      return summary
    },
    {
      staleTime: THIRTY_MINUTES
    }
  )
}
