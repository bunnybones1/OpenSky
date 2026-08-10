import { SwapType } from '@0xsequence/metadata'
import { ItemType } from '@opensky/proto'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useSnapshot } from 'valtio'

import { SKYPASS_USDC_PRICE } from '~/shared/constants/react-query-keys'
import {
  SILVER_CARDS_BURN_CONSUMPTION,
  SKYPASS_UNIT_PRICE
} from '~/shared/constants/skypass'
import { THIRTY_SECONDS } from '~/shared/constants/time'
import { silverCardsMintPriceFetcher } from '~/shared/queries/useConquestTicketCost'
import { useTokensSortedByPrice } from '~/shared/queries/useTokensSortedByPrice'
import { authenticationState } from '~/shared/state/authentication-state'

export const useSkypassCost = () => {
  const { userAddress } = useSnapshot(authenticationState)

  const { data: cardSortedByPrice } = useTokensSortedByPrice(
    SwapType.BUY,
    ItemType.SW_SILVER_CARDS
  )

  const ascendingCardPrices = useMemo(() => {
    if (!cardSortedByPrice) return
    return [...cardSortedByPrice].reverse()
  }, [cardSortedByPrice])

  return useQuery(
    SKYPASS_USDC_PRICE,
    silverCardsMintPriceFetcher(
      SILVER_CARDS_BURN_CONSUMPTION,
      ascendingCardPrices,
      SKYPASS_UNIT_PRICE / SILVER_CARDS_BURN_CONSUMPTION
    ),
    {
      enabled: !!userAddress && !!ascendingCardPrices,
      staleTime: THIRTY_SECONDS / 3,
      refetchInterval: THIRTY_SECONDS / 3
    }
  )
}
