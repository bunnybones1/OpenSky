import { SwapType } from '@0xsequence/metadata'
import { ItemType } from '@opensky/proto'
import { getLegacyHeroID } from '@opensky/shared/assetsIDs'
import { useQueryClient } from '@tanstack/react-query'
import { sequence } from '0xsequence'
import { useCallback, useMemo, useState } from 'react'

import { getGoldCardsForHeroMint } from '~/HeroFeaturePage/ReviewMintOrderButton/MintHeroesDialog/MintHeroesModalControls/useConfirmHeroMintOrder/get-gold-cards-for-hero-mint'
import {
  derivedHeroFeatureState,
  heroFeatureState,
  resetHeroFeatureState
} from '~/HeroFeaturePage/shared/state'
import { AuthenticationClient } from '~/shared/clients'
import { GOLD_CARDS_PER_HERO_SKIN } from '~/shared/constants/market'
import { getTokenBalancesKey } from '~/shared/constants/react-query-keys'
import { MINT_HEROES_DIALOG_ID } from '~/shared/constants/ui'
import { getBuySellOrderTxns } from '~/shared/helpers/market/get-buy-sell-order-txns/get-buy-sell-order-txns'
import { toOpenSkyAssetDecimalAmount } from '~/shared/helpers/market/to-opensky-asset-decimal-amount'
import { captureError } from '~/shared/helpers/sentry'
import { useSendTransactions } from '~/shared/hooks/market/useSendTransactions'
import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'
import { getCheapestGolds } from '~/shared/queries/hero-skins/useHeroSkinMintCost'
import { useTokensSortedByPrice } from '~/shared/queries/useTokensSortedByPrice'
import { authenticationState } from '~/shared/state/authentication-state'
import {
  selectGoldsState,
  updateSelectGoldsState
} from '~/shared/state/select-golds/select-golds-state'
import { CartItem } from '~/shared/types/market'

import { getMintHeroRequestData } from './get-mint-hero-request-data'
import { prepareHeroMintOrder } from './prepare-hero-mint-order'

const useGetHeroMintTxns = () => {
  const { data: cardsSortedByPriceDesc } = useTokensSortedByPrice(
    SwapType.BUY,
    ItemType.SW_GOLD_CARDS
  )

  const cardsSortedByPrice = useMemo(() => {
    return cardsSortedByPriceDesc ? [...cardsSortedByPriceDesc].reverse() : undefined
  }, [cardsSortedByPriceDesc])

  const getHeroMintTxns = useCallback(
    async (authedAddress?: string) => {
      if (!authedAddress || !cardsSortedByPrice) return
      const skinQuantities = Object.values(heroFeatureState.skinsToMint)
      const txns: sequence.transactions.Transaction[] = []
      const userAddress = AuthenticationClient.wallet?.address

      if (!userAddress) {
        throw new Error('Unable to create hero mint order, no user address')
      }

      const normalizedIds =
        derivedHeroFeatureState.skinIdsInOrder.map(getLegacyHeroID)
      const normalizedAmounts = skinQuantities.map(toOpenSkyAssetDecimalAmount)

      // 1. Review USDC allowance
      const { allowanceTxn } = await prepareHeroMintOrder({
        address: authedAddress,
        ids: derivedHeroFeatureState.skinIdsInOrder,
        amounts: skinQuantities,
        cardPrices: cardsSortedByPrice
      })

      if (allowanceTxn) {
        txns.push(allowanceTxn)
      }

      const contracts = AuthenticationClient.wallet?.contracts

      if (!contracts) {
        throw new Error('Unable to create hero mint order, no contracts loaded')
      }

      // 2. Get minting cost for order
      const mintCosts = await contracts.LegacyHeroSale.getMintingTotalCost(
        normalizedIds,
        normalizedAmounts
      )

      const cheapestGolds = getCheapestGolds(
        GOLD_CARDS_PER_HERO_SKIN,
        cardsSortedByPrice
      )

      if (!cheapestGolds) {
        throw new Error('Unable to create hero mint order, no gold prices.')
      }

      // 4. Get list of cards that will be sold, purchased and sent
      const goldsInfo = await getGoldCardsForHeroMint(
        mintCosts[0].div(100).toNumber(),
        selectGoldsState.selectedCards,
        cardsSortedByPrice
      )

      if (!goldsInfo) {
        throw new Error('Unable to create hero mint order, no gold txns.')
      }

      const { goldsToBuyAndSend, goldsToSell, goldsToSend } = goldsInfo

      // 5. Sell gold cards selected that we don't keep, if any
      const idsToSell = Object.keys(goldsToSell).map((a) => Number(a))

      if (idsToSell.length > 0) {
        const amountsToSell = Object.values(goldsToSell).map((a) => a.amount / 100)

        const items: CartItem[] = idsToSell.map((id, index) => ({
          tokenId: id,
          amount: amountsToSell[index],
          type: ItemType.SW_GOLD_CARDS,
          side: SwapType.SELL
        }))

        const sellTxns = await getBuySellOrderTxns({
          items,
          mode: SwapType.SELL
        })

        if (!sellTxns) {
          throw new Error('Unable to get sell transactions.')
        }

        txns.push(...sellTxns)
      }

      // 6. Buy missing gold cards from the market, if needed
      // 6. Buy missing gold cards from the market, if needed
      const idsToBuyAndSend = Object.keys(goldsToBuyAndSend).map((a) => Number(a))

      if (idsToBuyAndSend.length > 0) {
        const goldsToBuyAndSendAmounts = Object.values(goldsToBuyAndSend).map(
          (a) => a.amount / 100
        )
        const items: CartItem[] = idsToBuyAndSend.map((id, index) => ({
          tokenId: id,
          amount: goldsToBuyAndSendAmounts[index],
          type: ItemType.SW_GOLD_CARDS,
          side: SwapType.BUY
        }))

        const buyTxns = await getBuySellOrderTxns({
          items,
          mode: SwapType.BUY
        })

        if (!buyTxns) {
          throw new Error('Unable to get buy transactions.')
        }

        txns.push(...buyTxns)
      }

      // 7. Mint hero skin by sending the gold cards to the minting contract
      const minHeroData = getMintHeroRequestData(
        userAddress,
        normalizedIds,
        normalizedAmounts,
        mintCosts.nUSDC
      )

      // 7.1 Aggregate purchased and selected golds for trasnfer
      idsToBuyAndSend.forEach((id) => {
        if (!goldsToSend[id]) {
          goldsToSend[id] = { amount: 0, cost: 0 }
        }
        const sendAmount = goldsToSend[id].amount ?? 0
        const buyAmount = goldsToBuyAndSend[id].amount ?? 0
        goldsToSend[id].amount = sendAmount + buyAmount
      })

      // 7.2 Validate that the right amount of golds is being sent
      const nGoldsToSend = Object.values(goldsToSend).reduce((total, gold) => {
        return total + gold.amount
      }, 0)

      if (nGoldsToSend != mintCosts[0].toNumber()) {
        const error = Error(
          `Incorrect amount of gold sent for hero minted. Expected: ${mintCosts[0].toNumber()}, Actual: ${nGoldsToSend}`
        )
        captureError(error, 'Failed to mint hero skin. Math hard...')
        throw error
      }

      txns.push({
        to: contracts.OpenSkyAssets.address,
        data: contracts.OpenSkyAssets.interface.encodeFunctionData(
          'safeBatchTransferFrom',
          [
            userAddress,
            contracts.LegacyHeroSale.address,
            Object.keys(goldsToSend),
            Object.values(goldsToSend).map((a) => a.amount),
            minHeroData
          ]
        ),
        revertOnError: true
      })

      return txns
    },
    [cardsSortedByPrice]
  )

  return { getHeroMintTxns }
}

const { closeDialog } = controlDialog(MINT_HEROES_DIALOG_ID)

export const useConfirmHeroMintOrder = () => {
  const [isConfirming, setIsConfirming] = useState(false)
  const queryClient = useQueryClient()
  const { getHeroMintTxns } = useGetHeroMintTxns()
  const { sendTransactions } = useSendTransactions()

  const confirmHeroMintOrder = useCallback(async () => {
    try {
      setIsConfirming(true)
      const txns = await getHeroMintTxns(authenticationState.userAddress)

      if (txns) {
        const success = await sendTransactions(txns, SwapType.BUY, () =>
          closeDialog()
        )
        if (!!success) {
          if (!!authenticationState.userAddress) {
            queryClient.invalidateQueries(
              getTokenBalancesKey(
                ItemType.SW_HERO_SKINS,
                authenticationState.userAddress
              )
            )
            queryClient.invalidateQueries(
              getTokenBalancesKey(
                ItemType.SW_GOLD_CARDS,
                authenticationState.userAddress
              )
            )
          }
          setIsConfirming(false)
          resetHeroFeatureState()
          updateSelectGoldsState('selectedCards', [])
        }
      }
    } catch (error) {
      setIsConfirming(false)
    }
  }, [getHeroMintTxns, queryClient, sendTransactions])

  return { confirmHeroMintOrder, isConfirming }
}
