/* eslint-disable valtio/state-snapshot-rule */
import { SwapType } from '@0xsequence/metadata'
import { getItemType, getSilverID } from '@opensky/shared/assetsIDs'
import { useQueries } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useSnapshot } from 'valtio'

import { GlobalQueryClient } from '~/shared/clients'
import { VALID_MARKET_ITEM_TYPES } from '~/shared/constants/market'
import {
  getTokenPriceAndSupplyKey,
  getTokensSortedByPriceKey
} from '~/shared/constants/react-query-keys'
import { ONE_MINUTE } from '~/shared/constants/time'
import { isDefined } from '~/shared/helpers/is-defined-is-not-null'
import { useDecodedDeckString } from '~/shared/hooks/decks/useDecodedDeckString'
import { tokenPriceFetcher } from '~/shared/queries/useTokenPriceAndSupply'
import { authenticationState } from '~/shared/state/authentication-state'

import { useDeckOwnedCards } from './useDeckOwnedCards'

export const useDeckCost = (deckString?: string) => {
  const { cardIds } = useDecodedDeckString(deckString)

  const ownedCards = useDeckOwnedCards(cardIds)

  const tokenIds = useMemo(() => {
    if (!cardIds || !ownedCards) return undefined

    const unOwnedCards = cardIds.filter((id) => !ownedCards.includes(id))

    return unOwnedCards.map((id) => getSilverID(id))
  }, [cardIds, ownedCards])

  const { userAddress } = useSnapshot(authenticationState)

  const cardPrices = useQueries({
    queries: (tokenIds || []).map((tokenId) => {
      const itemType = getItemType(tokenId)
      const isValid = !!itemType && VALID_MARKET_ITEM_TYPES.includes(itemType)
      return {
        queryKey: getTokenPriceAndSupplyKey({
          mode: SwapType.BUY,
          quantity: 1,
          id: tokenId
        }),
        queryFn: tokenPriceFetcher({ mode: SwapType.BUY, quantity: 1, tokenId }),
        staleTime: ONE_MINUTE * 3,
        enabled: !!userAddress && isValid,
        onSuccess: () => {
          if (!!itemType && isValid) {
            GlobalQueryClient.invalidateQueries(
              getTokensSortedByPriceKey(SwapType.BUY, itemType)
            )
          }
        }
      }
    })
  })

  const deckCost = useMemo(() => {
    if (!cardPrices) return undefined
    const isFetching = cardPrices.some((result) => result.data === undefined)
    if (isFetching) return undefined

    return cardPrices
      .map((result) => {
        return result.data || undefined
      })
      .filter(isDefined)
      .reduce((prev, curr) => {
        if (!curr?.price) return prev

        return prev + curr.price
      }, 0 as number)
  }, [cardPrices])

  return { deckCost }
}
