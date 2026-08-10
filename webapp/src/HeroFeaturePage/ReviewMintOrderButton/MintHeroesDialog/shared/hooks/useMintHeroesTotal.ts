import { SwapType } from '@0xsequence/metadata'
import { ItemType } from '@opensky/proto'
import { useQueries } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useAsync } from 'react-use'
import { useSnapshot } from 'valtio'

import { getGoldCardsForHeroMint } from '~/HeroFeaturePage/ReviewMintOrderButton/MintHeroesDialog/MintHeroesModalControls/useConfirmHeroMintOrder/get-gold-cards-for-hero-mint'
import {
  derivedHeroFeatureState,
  heroFeatureState
} from '~/HeroFeaturePage/shared/state'
import { GOLD_CARDS_PER_HERO_SKIN } from '~/shared/constants/market'
import { getHeroSkinMintPriceKey } from '~/shared/constants/react-query-keys'
import { isNotNull } from '~/shared/helpers/is-defined-is-not-null'
import {
  getCheapestGolds,
  getGoldCosts,
  heroSkinMintPriceFetcher
} from '~/shared/queries/hero-skins/useHeroSkinMintCost'
import { useTokensSortedByPrice } from '~/shared/queries/useTokensSortedByPrice'
import { CartItem } from '~/shared/types/market'

export const useMintHeroesTotal = (selectedGolds: CartItem[]) => {
  const { skinIdsInOrder } = useSnapshot(derivedHeroFeatureState)
  const { skinsToMint } = useSnapshot(heroFeatureState)
  const skinsToMintQuantities = useMemo(
    // eslint-disable-next-line valtio/state-snapshot-rule
    () => Object.values(skinsToMint),
    [skinsToMint]
  )

  const { data: cardsSortedByPriceDescending } = useTokensSortedByPrice(
    SwapType.BUY,
    ItemType.SW_GOLD_CARDS
  )

  const cardsSortedByPriceAscending = useMemo(() => {
    if (!cardsSortedByPriceDescending) return
    return [...cardsSortedByPriceDescending].reverse()
  }, [cardsSortedByPriceDescending])

  const heroSkinQueriesInfo = useMemo(() => {
    // eslint-disable-next-line valtio/state-snapshot-rule
    return skinIdsInOrder
      .map((id, index) => {
        const quantity = skinsToMintQuantities[index]

        if (!quantity) return null

        return {
          id,
          quantity,
          key: getHeroSkinMintPriceKey(id, quantity)
        }
      })
      .filter(isNotNull)
  }, [skinIdsInOrder, skinsToMintQuantities])

  const mintPrices = useQueries({
    queries: heroSkinQueriesInfo.map((info) => ({
      queryKey: info.key,
      queryFn: heroSkinMintPriceFetcher(
        info.id,
        info.quantity,
        cardsSortedByPriceAscending
      )
    }))
  })

  const total = useMemo(() => {
    const isMintPriceFetching = mintPrices.some((query) => !query.data)

    if (isMintPriceFetching) return undefined

    return mintPrices.reduce((prev, curr) => {
      if (!curr.data) {
        return prev
      } else {
        return prev + Number(curr.data)
      }
    }, 0)
  }, [mintPrices])

  /**
   * @desc Calculate cost reduction from selected golds
   * @note Will compare cost of total golds to purchase vs cards sold, bought and sent
   */
  const totalGoldReduction = useAsync(async () => {
    if (!selectedGolds.length) return
    if (!selectedGolds) return

    const totalSkinsToMint = skinsToMintQuantities.reduce((prev, curr) => {
      return prev + curr
    }, 0)

    const totalGoldsRequired = totalSkinsToMint * GOLD_CARDS_PER_HERO_SKIN

    const [totalGoldBuyCosts, reductionGoldBuyCosts] = await Promise.all([
      (async () => {
        const cheapestGolds = getCheapestGolds(
          totalGoldsRequired,
          cardsSortedByPriceAscending
        )
        if (!cheapestGolds) return null
        const goldBuyCosts = await getGoldCosts(cheapestGolds, SwapType.BUY)

        if (!goldBuyCosts) return null

        const totalCost = Object.values(goldBuyCosts)
          .map((cost) => Number(cost))
          .reduce((prev, curr) => {
            return prev + curr
          }, 0)

        return totalCost
      })(),
      (async () => {
        const heroMintCards = await getGoldCardsForHeroMint(
          totalGoldsRequired,
          selectedGolds,
          cardsSortedByPriceAscending
        )

        if (!heroMintCards) return null

        const { goldsToBuyAndSend, goldsToSell } = heroMintCards

        // Cost of gold cards to purchase
        const goldBuyCost = Object.keys(goldsToBuyAndSend).reduce((total, id) => {
          return (total += goldsToBuyAndSend[Number(id)].cost)
        }, 0)

        // Revenue from gold cards sold
        const goldSellCost = Object.keys(goldsToSell).reduce((total, id) => {
          return (total += goldsToSell[Number(id)].cost)
        }, 0)

        return goldBuyCost - goldSellCost
      })()
    ])

    if (!totalGoldBuyCosts || (!reductionGoldBuyCosts && reductionGoldBuyCosts != 0))
      return

    return totalGoldBuyCosts - reductionGoldBuyCosts
  }, [skinsToMintQuantities, selectedGolds, total])

  return { total, totalGoldReduction }
}
