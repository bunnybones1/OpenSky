import { ItemType, PaymentProvider } from '@opensky/proto'
import { sequence } from '0xsequence'
import { ethers } from 'ethers'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useProcessConquestUSDCOrder } from '~/PurchaseConquestPage/PurchaseWithUSDCDialog/hooks/useProcessConquestUSDCOrder'
import { APIClient, AuthenticationClient } from '~/shared/clients'
import {
  SILVER_CARDS_BURN_CONSUMPTION,
  SKYPASS_UNIT_PRICE
} from '~/shared/constants/skypass'
import { SEQUENCE_CONFIRM_SIGNATURE_DIALOG_ID } from '~/shared/constants/ui'
import { formatUSDCBalance } from '~/shared/helpers/market/format-usdc-balance'
import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'
import { usePaymentProviderProducts } from '~/shared/queries/usePaymentProviderProducts'
import { authenticationState } from '~/shared/state/authentication-state'
import {
  SkypassSelectorState,
  updateSkypassSelectorState
} from '~/shared/state/skypass-state'
import { addToast, clearAllToasts } from '~/shared/state/toast-state'

import { useSkypassCost } from '../queries/useSkypassCost'

enum SkyPassOrderType {
  UNKNOWN = 'UNKNOWN',
  USDC = 'USDC',
  MARKET_BUY = 'MARKET_BUY'
}

const { openDialog: openSequenceDialog, closeDialog: closeSequenceDialog } =
  controlDialog(SEQUENCE_CONFIRM_SIGNATURE_DIALOG_ID)

export const useProcessSPUSDCOrder = (
  navigateToSkypass: (
    rewardToSelect?: SkypassSelectorState['selectedLevelAndReward']
  ) => void
) => {
  const [isProcessingUSDCOrder, setIsProcessingUSDCOrder] = useState(false)
  const { data: skyPassPrice, isLoading: isLoadingSkyPassPrice } = useSkypassCost()
  const { t } = useTranslation()
  const { getBuySilverCardsTransactions } = useProcessConquestUSDCOrder()

  const { data: sequenceIAPData } = usePaymentProviderProducts(
    PaymentProvider.SEQUENCE,
    ItemType.SW_SKYPASS
  )

  const sequenceProductCode = sequenceIAPData?.sequenceProductCode

  const ticketCost = useMemo(() => {
    return skyPassPrice ? formatUSDCBalance(skyPassPrice) : SKYPASS_UNIT_PRICE
  }, [skyPassPrice])

  const purchaseSPWithUSDC = useCallback(
    async (orderType: SkyPassOrderType) => {
      try {
        let txn: ethers.providers.TransactionResponse | null | undefined
        openSequenceDialog()

        const wallet = AuthenticationClient.wallet

        if (!wallet) {
          throw new Error('Unable to buy skypass with USDC; no wallet.')
        }

        if (orderType === SkyPassOrderType.USDC) {
          if (!authenticationState.userAddress) {
            throw new Error('Unable to buy skypass with USDC, no authed user.')
          }

          const response =
            await APIClient.opensky.prepareOnChainInCurrencyTransaction({
              productID: sequenceProductCode as string,
              quantity: 1
            })

          txn = await wallet.sendTransaction(response.transactions)
        } else {
          // NOTE: Need to do this otherwise TS complains that txn
          // isn't assigned anything even if we throw
          if (orderType !== SkyPassOrderType.MARKET_BUY) {
            throw new Error(`Unknown skypass order type ${orderType}`)
          }
          const txns: sequence.transactions.Transaction[] = []

          const { idsToBuyAndSend, buyTxns } = await getBuySilverCardsTransactions(
            SILVER_CARDS_BURN_CONSUMPTION
          )

          if (!buyTxns || !idsToBuyAndSend) {
            throw new Error(
              'Unable to buy skypass with market silvers, no silvers available.'
            )
          }

          if (buyTxns) txns.push(...buyTxns)

          const response = await APIClient.opensky.prepareOnChainInItemsTransaction(
            {
              productID: sequenceProductCode as string,
              quantity: 1,
              tokenIDsToBurn: idsToBuyAndSend
            }
          )

          txns.push(...response.transactions)
          txn = await wallet.sendTransaction(txns)
        }

        updateSkypassSelectorState('isSkypassCheckoutActive', true)

        if (!txn) {
          throw new Error('Unable to buy skypass with USDC, couldnt gen txns.')
        }

        await txn.wait()

        closeSequenceDialog()

        return true
      } catch (error) {
        console.error(error)
        clearAllToasts()
        addToast({
          text: t('notification.skypassPurchaseFailed'),
          secondaryText: t('notification.skypassPurchaseFailedSecondary'),
          icon: 'close-circled',
          iconColor: 'warm9',
          duration: 5
        })

        closeSequenceDialog()

        return false
      }
    },
    [getBuySilverCardsTransactions, sequenceProductCode, t]
  )

  const processSPUSDCOrder = useCallback(async () => {
    setIsProcessingUSDCOrder(true)

    const success = await purchaseSPWithUSDC(
      ticketCost < SKYPASS_UNIT_PRICE
        ? SkyPassOrderType.MARKET_BUY
        : SkyPassOrderType.USDC
    )
    if (success) {
      updateSkypassSelectorState('paymentHasCompleted', false)
      navigateToSkypass()
    }
    setIsProcessingUSDCOrder(false)
  }, [ticketCost, purchaseSPWithUSDC, navigateToSkypass])

  return {
    processSPUSDCOrder,
    isProcessingUSDCOrder,
    isLoadingSkyPassPrice,
    ticketCost
  }
}
