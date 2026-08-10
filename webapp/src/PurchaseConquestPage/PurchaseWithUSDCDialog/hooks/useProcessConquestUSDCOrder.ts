import { SwapType } from '@0xsequence/metadata'
import { ItemType, PaymentProvider } from '@opensky/proto'
import { sequence } from '0xsequence'
import { ethers } from 'ethers'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { APIClient, AuthenticationClient } from '~/shared/clients'
import { getBuySellOrderTxns } from '~/shared/helpers/market/get-buy-sell-order-txns/get-buy-sell-order-txns'
import { getSilverCardsForTicketMint } from '~/shared/helpers/market/get-silver-cards-for-ticket-mint'
import { usePaymentProviderProducts } from '~/shared/queries/usePaymentProviderProducts'
import { useTokensSortedByPrice } from '~/shared/queries/useTokensSortedByPrice'
import { authenticationState } from '~/shared/state/authentication-state'
import { updateConquestTicketsSelectorState } from '~/shared/state/conquest-tickets-state'
import { addToast, clearAllToasts } from '~/shared/state/toast-state'
import { CartItem } from '~/shared/types/market'

import { ConquestOrderType } from '../shared/types'

export const useProcessConquestUSDCOrder = () => {
  const { t } = useTranslation()

  const { data: sortedCardPricesDesc } = useTokensSortedByPrice(
    SwapType.BUY,
    ItemType.SW_SILVER_CARDS
  )

  const { data: IAPData } = usePaymentProviderProducts(
    PaymentProvider.SEQUENCE,
    ItemType.SW_CONQUEST_TICKET
  )
  const sequenceProductCode = IAPData?.sequenceProductCode

  const getBuySilverCardsTransactions = useCallback(
    async (amount: number) => {
      if (!sortedCardPricesDesc) {
        throw new Error(
          'Unable to buy tickets with market silvers, no silver prices.'
        )
      }

      if (!authenticationState.userAddress) {
        throw new Error('Unable to buy tickets with market silvers, no authed user.')
      }

      const sortedCardPricesAsc = !!sortedCardPricesDesc
        ? [...sortedCardPricesDesc].reverse()
        : sortedCardPricesDesc

      // 2. Get list of cards that will be purchased
      const { silversToBuy } = await getSilverCardsForTicketMint(
        amount,
        sortedCardPricesAsc
      )

      // 3. Buy  cards
      const idsToBuyAndSend = Object.keys(silversToBuy).map((a) => Number(a))
      let buyTxns: sequence.transactions.Transaction[] | undefined

      if (idsToBuyAndSend.length > 0) {
        const silversToBuyAndSendAmounts = Object.values(silversToBuy).map(
          (a) => a.amount / 100
        )

        const items: CartItem[] = idsToBuyAndSend.map((id, index) => ({
          tokenId: id,
          amount: silversToBuyAndSendAmounts[index],
          type: ItemType.SW_SILVER_CARDS,
          side: SwapType.BUY
        }))

        buyTxns = await getBuySellOrderTxns({
          items,
          mode: SwapType.BUY
        })
      }

      return { idsToBuyAndSend, buyTxns }
    },
    [sortedCardPricesDesc]
  )

  const processOrderWithMarketCards = useCallback(
    async (amount: number) => {
      const wallet = AuthenticationClient.wallet

      if (!wallet) {
        throw new Error('Unable to buy tickets with market silvers; no wallet.')
      }

      const txns: sequence.transactions.Transaction[] = []

      const { idsToBuyAndSend, buyTxns } = await getBuySilverCardsTransactions(amount)

      if (!buyTxns || !idsToBuyAndSend) {
        throw new Error(
          'Unable to buy tickets with market silvers, no silvers available.'
        )
      }

      if (buyTxns) txns.push(...buyTxns)

      // 4. Send silver cards to mint conquest tickets
      const response = await APIClient.opensky.prepareOnChainInItemsTransaction({
        productID: sequenceProductCode as string,
        quantity: amount as number,
        tokenIDsToBurn: idsToBuyAndSend
      })

      txns.push(...response.transactions)
      const txnResp = await wallet.sendTransaction(txns)
      return txnResp
    },
    [sequenceProductCode, getBuySilverCardsTransactions]
  )

  const processOrderWithUSDC = useCallback(
    async (amount: number) => {
      const wallet = AuthenticationClient.wallet

      if (!wallet) {
        throw new Error('Unable to buy tickets with USDC; no wallet.')
      }

      if (!authenticationState.userAddress) {
        throw new Error('Unable to buy tickets with USDC, no authed user.')
      }

      const response = await APIClient.opensky.prepareOnChainInCurrencyTransaction({
        productID: sequenceProductCode as string,
        quantity: amount
      })

      const txnResp = await wallet.sendTransaction(response.transactions)
      return txnResp
    },
    [sequenceProductCode]
  )

  const processConquestUSDCOrder = useCallback(
    async (amount: number, orderType: ConquestOrderType) => {
      try {
        let txn: ethers.providers.TransactionResponse | null | undefined

        if (orderType === ConquestOrderType.USDC) {
          txn = await processOrderWithUSDC(amount)
        } else {
          // NOTE: Need to do this otherwise TS complains that txn
          // isn't assigned anything even if we throw
          if (orderType !== ConquestOrderType.MARKET_BUY) {
            throw new Error(`Unknown conquest order type ${orderType}`)
          }
          txn = await processOrderWithMarketCards(amount)
        }

        if (!txn) return

        updateConquestTicketsSelectorState('hasPurchasedConquest', true)

        addToast({
          text: t('notification.conquestTicketPurchased'),
          secondaryText: t('notification.conquestTicketLoadingSecondary'),
          icon: 'spinner',
          iconColor: 'white',
          isEvergreen: true
        })

        await txn.wait()

        return true
      } catch (error) {
        console.error(error)

        clearAllToasts()
        addToast({
          text: t('notification.conquestTicketFailed'),
          secondaryText: t('notification.conquestTicketFailedSecondary'),
          icon: 'close-circled',
          iconColor: 'warm9',
          duration: 5
        })

        return false
      }
    },
    [processOrderWithMarketCards, processOrderWithUSDC, t]
  )

  return { processConquestUSDCOrder, getBuySilverCardsTransactions }
}
