import { SwapType } from '@0xsequence/metadata'
import { useQueryClient } from '@tanstack/react-query'
import { sequence } from '0xsequence'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { AuthenticationClient } from '~/shared/clients'
import { getConquestAndUSDCBalancesKey } from '~/shared/constants/react-query-keys'
import { SEQUENCE_CONFIRM_SIGNATURE_DIALOG_ID } from '~/shared/constants/ui'
import { authenticationState } from '~/shared/state/authentication-state'
import { addToast } from '~/shared/state/toast-state'
import { MarketMode } from '~/shared/types/market'

import { captureError } from '../../helpers/sentry'
import { controlDialog } from '../useDialog/control-dialog'

const { openDialog: openSequenceDialog, closeDialog: closeSequenceDialog } =
  controlDialog(SEQUENCE_CONFIRM_SIGNATURE_DIALOG_ID)

export const useSendTransactions = () => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const sendTransactions = useCallback(
    async (
      txns: sequence.transactions.Transaction[],
      mode: MarketMode,
      onComplete: () => void
    ) => {
      try {
        const wallet = AuthenticationClient.wallet

        if (!wallet) {
          throw new Error('Unable to send transactions; no wallet.')
        }

        if (!wallet.isBurnerWallet) {
          // createOrder could trigger popup blocking detection due to execution time
          // preemptively open the wallet popup on user's intent to place order
          await wallet.openWalletWindow('/loading')

          openSequenceDialog()
        }

        // this will redirect wallet popup to send txn handler
        await wallet.sendTransaction(txns)

        // TODO: shouldn't have to force close wallet, however
        // since we are calling openWalletWindow above manually, then we need to close
        // manually. But easiest is to let the library handle this itself by just
        // sending the transaction above.
        if (!wallet.isBurnerWallet) {
          wallet.closeWalletWindow()
        }

        if (!!authenticationState.userAddress) {
          queryClient.invalidateQueries(
            getConquestAndUSDCBalancesKey(authenticationState.userAddress)
          )
        }

        addToast({
          text: t(
            `notification.orderComplete${mode === SwapType.BUY ? 'Buy' : 'Sell'}`
          ),
          icon: 'check-circled',
          iconColor: 'forest4',
          duration: 5
        })
        closeSequenceDialog()
        onComplete()
        return true
      } catch (e) {
        const isBecausePending =
          e.toString() === 'Error: previous order is still pending'
        addToast({
          text: t(
            `notification.${
              isBecausePending ? 'orderPendingFail' : 'orderPlacedFail'
            }`
          ),
          icon: 'error',
          iconColor: 'warm9'
        })
        closeSequenceDialog()
        onComplete()
        captureError(e, 'Placing Order Failed', false)
        return false
      }
    },
    [t, queryClient]
  )

  return { sendTransactions }
}
