import {
  GetNiftyswapUnitPricesWithQuantitiesReturn,
  SwapType
} from '@0xsequence/metadata'
import { ChainId } from '@0xsequence/network'
import { ItemType } from '@opensky/proto'
import { useQuery } from '@tanstack/react-query'
import { BigNumber } from 'ethers'
import { chunk } from 'lodash-es'
import { useMemo } from 'react'

import { APIClient, AuthenticationClient, GlobalQueryClient } from '../clients'
import { AllCardBackIds } from '../constants/card-backs'
import { GoldCards, SilverCards } from '../constants/cards'
import { VALID_MARKET_ITEM_TYPES } from '../constants/market'
import {
  getTokenPriceAndSupplyKey,
  getTokensSortedByPriceKey
} from '../constants/react-query-keys'
import { AllStickerIds } from '../constants/stickers'
import { ONE_MINUTE } from '../constants/time'
import { isDefined } from '../helpers/is-defined-is-not-null'
import { formatNiftySwapSupply } from '../helpers/market/format-niftyswap-supply'
import { getPriceWithoutFees } from '../helpers/market/get-price-without-fees'
import { BalanceItem, MarketMode, PriceAndSupply } from '../types/market'
import { useTokenBalances } from './useTokenBalances'

const validGoldCardTokenIds = GoldCards.filter(
  (card) => card.prism !== 'tok' && card.prism !== 'tut'
).map((card) => card.id)

const validSilverCardTokenIds = SilverCards.filter(
  (card) => card.prism !== 'tok' && card.prism !== 'tut'
).map((card) => card.id)

interface GetIdsToUseParams {
  mode: MarketMode
  itemType: ItemType
  balances?: BalanceItem[] | null | undefined
}

const getValidIds = (itemType: ItemType) => {
  if (!VALID_MARKET_ITEM_TYPES.includes(itemType)) return
  if (itemType === ItemType.SW_GOLD_CARDS) return validGoldCardTokenIds
  if (itemType === ItemType.SW_SILVER_CARDS) return validSilverCardTokenIds
  if (itemType === ItemType.SW_STICKERS) return AllStickerIds
  if (itemType === ItemType.SW_CARD_BACKS) return AllCardBackIds

  return
}

const getIdsToUse = ({
  mode,
  itemType,
  balances
}: GetIdsToUseParams): number[] | undefined => {
  if (mode === SwapType.BUY) {
    const allIds = getValidIds(itemType)

    if (!!allIds?.length) {
      // Only return IDs that we havent fetched already
      return allIds.filter((id) => {
        const priceAndSupply = GlobalQueryClient.getQueryData<
          PriceAndSupply | null | undefined
        >(getTokenPriceAndSupplyKey({ mode, quantity: 1, id }))
        return !priceAndSupply
      })
    } else {
      return
    }
  }

  if (mode === SwapType.SELL) {
    return balances?.map((balance) => balance.tokenID)
  }
  return
}

const fetchTokensSortedByPrice =
  (
    mode: MarketMode,
    itemType: ItemType,
    balances: BalanceItem[] | null | undefined
  ) =>
  async () => {
    const idsToUse = getIdsToUse({
      mode,
      itemType,
      balances
    })

    if (!idsToUse || !idsToUse.length) return null

    const chunkedIds = chunk(idsToUse, 90)

    const contracts = AuthenticationClient.wallet?.contracts

    if (!contracts) return null

    const priceChunks = await Promise.all(
      chunkedIds.map((chunk) =>
        APIClient.metadata.getNiftyswapUnitPricesWithQuantities({
          contractAddress: contracts.NiftyswapExchange.address,
          chainID: String(ChainId.POLYGON),
          req: {
            swapType: mode,
            ids: chunk.map(String),
            amounts: chunk.map(() => '100')
          },
          fresh: true
        })
      )
    )

    const priceObj = priceChunks.reduce((prev, curr) => {
      return {
        prices: {
          ...prev.prices,
          ...curr.prices
        }
      }
    }, {} as GetNiftyswapUnitPricesWithQuantitiesReturn)

    const fetchedPrices = Object.entries(priceObj.prices)
      .map(([id, price]) => {
        if (!price?.unitPrice) return
        return {
          id: Number(id),
          price: getPriceWithoutFees(
            BigNumber.from(price.unitPrice),
            mode
          ).toNumber(),
          supply: formatNiftySwapSupply(price.availableAmount)
        }
      })
      .filter(isDefined)
      .filter((_price) => {
        return !!_price.supply && _price.supply >= 1
      })

    if (mode === SwapType.SELL) {
      return fetchedPrices.sort((a, b) => {
        return b.price - a.price
      })
    } else {
      // Because we only fetched prices for tokens we didnt already have cached prices for
      // we have to grab that cached data for sorting
      const allIds = getValidIds(itemType)

      // This check should always pass, but just in case
      if (!allIds) return null

      return allIds
        .map((id) => {
          const fetchedPrice = fetchedPrices.find((price) => price.id === id)

          if (!!fetchedPrice) return fetchedPrice

          const cachedPrice = GlobalQueryClient.getQueryData<
            PriceAndSupply | null | undefined
          >(getTokenPriceAndSupplyKey({ mode, quantity: 1, id }))

          if (!!cachedPrice) return { ...cachedPrice, id }

          return
        })
        .filter(isDefined)
        .sort((a, b) => {
          return b.price - a.price
        })
    }
  }

export const useTokensSortedByPrice = (
  mode: MarketMode,
  itemType: ItemType,
  disabled?: boolean
) => {
  const { data: balances } = useTokenBalances(itemType)

  const isEnabled = useMemo(() => {
    if (mode === SwapType.SELL) return !!balances

    return true
  }, [mode, balances])

  return useQuery({
    queryKey: getTokensSortedByPriceKey(mode, itemType),
    queryFn: fetchTokensSortedByPrice(mode, itemType, balances),
    enabled: isEnabled && !disabled,
    staleTime: ONE_MINUTE * 5,
    onSuccess: (data) => {
      data?.forEach((priceAndSupply) => {
        GlobalQueryClient.setQueryData<PriceAndSupply | null | undefined>(
          getTokenPriceAndSupplyKey({ mode, quantity: 1, id: priceAndSupply.id }),
          { price: priceAndSupply.price, supply: priceAndSupply.supply }
        )
      })
    }
  })
}
