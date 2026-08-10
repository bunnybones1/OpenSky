import { ItemType } from '@opensky/proto'
import {
  getCardBackID,
  getGradedID,
  getLegacyHeroID,
  getStickerID,
  getUngradedID
} from '@opensky/shared/assetsIDs'
import { useQueries, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useSnapshot } from 'valtio'

import { VALID_MARKET_ITEM_TYPES } from '~/shared/constants/market'
import { authenticationState } from '~/shared/state/authentication-state'

import { APIClient } from '../clients'
import { getTokenBalancesKey } from '../constants/react-query-keys'
import { THIRTY_SECONDS } from '../constants/time'
import { isDefinedAndNotNull } from '../helpers/is-defined-is-not-null'
import { BalanceItem } from '../types/market'

const SHARED_OPTIONS = {
  staleTime: THIRTY_SECONDS * 2,
  refetchInterval: THIRTY_SECONDS * 2
} as const

const tokenBalancesFetch =
  (itemType: ItemType | undefined, address?: string) =>
  async (): Promise<BalanceItem[] | null> => {
    if (!address || !itemType) return null

    if (!VALID_MARKET_ITEM_TYPES.includes(itemType)) {
      throw new Error(
        `Token Balance Error: Unable to fetch balances for token "${itemType}"`
      )
    }

    const { items } = await APIClient.opensky.getItemOwnershipByType({
      itemTypes: [itemType],
      accountAddress: address
    })

    return items.map((item) => {
      let tokenID = item.tokenID
      let id = item.id

      if (
        itemType === ItemType.SW_BASE_CARDS ||
        itemType === ItemType.SW_GOLD_CARDS ||
        itemType === ItemType.SW_SILVER_CARDS
      ) {
        tokenID = getGradedID(tokenID, itemType)
        id = getUngradedID(tokenID)
      }

      if (itemType === ItemType.SW_STICKERS) {
        tokenID = getStickerID(item.tokenID)
        id = item.tokenID
      }

      if (itemType === ItemType.SW_CARD_BACKS) {
        tokenID = getCardBackID(item.tokenID)
        id = item.tokenID
      }

      if (itemType === ItemType.SW_HERO_SKINS) {
        tokenID = getLegacyHeroID(item.tokenID)
        id = item.tokenID
      }

      return {
        ...item,
        balance: Number(item.balance),
        tokenID,
        id
      }
    })
  }

export const useTokenBalances = (itemType: ItemType) => {
  const { userAddress } = useSnapshot(authenticationState)

  return useQuery({
    queryKey: getTokenBalancesKey(itemType, userAddress),
    queryFn: tokenBalancesFetch(itemType, userAddress),
    enabled: !!userAddress,
    ...SHARED_OPTIONS
  })
}

export const useTokenBalance = (itemType: ItemType, id: number) => {
  const { userAddress } = useSnapshot(authenticationState)

  return useQuery({
    queryKey: getTokenBalancesKey(itemType, userAddress),
    queryFn: tokenBalancesFetch(itemType, userAddress),
    enabled: !!userAddress && !!VALID_MARKET_ITEM_TYPES.includes(itemType),
    notifyOnChangeProps: ['data', 'error'],
    select: (data) => {
      if (!data) return

      const tokenBalance = data.find((token) => token.tokenID === id)

      if (!tokenBalance || tokenBalance.balance === 0) return null

      return tokenBalance
    },
    ...SHARED_OPTIONS
  })
}

export const useMultiTypeTokenBalances = (itemTypes: ItemType[]) => {
  const { userAddress } = useSnapshot(authenticationState)

  const validItemTypes = useMemo(() => {
    return itemTypes.filter((itemType) => VALID_MARKET_ITEM_TYPES.includes(itemType))
  }, [itemTypes])

  const queries = useQueries({
    queries: validItemTypes.map((itemType) => ({
      queryKey: getTokenBalancesKey(itemType, userAddress),
      queryFn: tokenBalancesFetch(itemType, userAddress),
      enabled: !!userAddress && !!validItemTypes.length,
      ...SHARED_OPTIONS
    }))
  })

  return useMemo(() => {
    const isFetching = queries.some(
      (query) => !!(query.isLoading || query.data === undefined)
    )

    if (isFetching) return

    return queries.flatMap((query) => query.data).filter(isDefinedAndNotNull)
  }, [queries])
}
