import { ItemType, PaymentProvider } from '@opensky/proto'
import sum from 'lodash-es/sum'
import { memo, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'

import { APIClient, AuthenticationClient } from '~/shared/clients'
import { PromptDialog } from '~/shared/components/PromptDialog/PromptDialog'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { SEQUENCE_CONFIRM_SIGNATURE_DIALOG_ID } from '~/shared/constants/ui'
import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { usePaymentProviderProducts } from '~/shared/queries/usePaymentProviderProducts'
import { useDispatch } from '~/shared/redux'
import { updateConquestTicketsSelectorState } from '~/shared/state/conquest-tickets-state'
import { selectSilversState } from '~/shared/state/select-silvers/select-silvers-state'
import { addToast, clearAllToasts } from '~/shared/state/toast-state'

import { BURN_SILVERS_DIALOG_ID } from '../../../shared/constants'
import { CONFIRM_CONVERT_SILVER_CARDS_DIALOG } from '../shared/constants'

const { closeDialog } = controlDialog(CONFIRM_CONVERT_SILVER_CARDS_DIALOG)
const { closeDialog: closeBurnSilversDialog } = controlDialog(BURN_SILVERS_DIALOG_ID)
const { closeDialog: closeSequenceDialog, openDialog: openSequenceDialog } =
  controlDialog(SEQUENCE_CONFIRM_SIGNATURE_DIALOG_ID)

export const ConfirmConvertSilverCardsDialog = memo(() => {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const { getAssetUrl } = useGetAssetContext()

  const [loading, setLoading] = useState(false)

  const { data: IAPData } = usePaymentProviderProducts(
    PaymentProvider.SEQUENCE,
    ItemType.SW_CONQUEST_TICKET
  )
  const sequenceProductCode = IAPData?.sequenceProductCode

  const onConfirm = useCallback(async () => {
    try {
      const wallet = AuthenticationClient.wallet

      if (!wallet) {
        throw new Error('Unable to convert silver cards to tickets; no wallet.')
      }

      setLoading(true)
      const response = await APIClient.opensky.prepareOnChainInItemsTransaction({
        productID: sequenceProductCode as string,
        quantity: sum(
          selectSilversState.selectedCards.map((card) => card.quantity)
        ) as number,
        tokenIDsToBurn: selectSilversState.selectedCards
          .map((card) => Array(card.quantity).fill(card.id))
          .flat()
      })

      openSequenceDialog()

      const txnResp = await wallet.sendTransaction(response.transactions)

      if (!txnResp) {
        throw new Error(
          'Unable to convert silver cards to tickets; transaction failed.'
        )
      }

      updateConquestTicketsSelectorState('hasPurchasedConquest', true)

      addToast({
        text: t('notification.conquestTicketPurchased'),
        secondaryText: t('notification.conquestTicketLoadingSecondary'),
        icon: 'spinner',
        iconColor: 'white',
        isEvergreen: true
      })

      const success = await txnResp.wait()

      closeSequenceDialog()
      closeDialog()
      closeBurnSilversDialog()

      if (success)
        dispatch(push(ROUTES_CONFIG.routes.PLAY.routes.CONQUEST.directPath))
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

      setLoading(false)
      closeSequenceDialog()
      closeDialog()
      closeBurnSilversDialog()
    }
  }, [dispatch, t, sequenceProductCode])

  return (
    <PromptDialog
      imageUrl={
        !getAssetUrl
          ? undefined
          : getAssetUrl('webapp/backgrounds/bg-convert-silver-modal.webp')
      }
      onDismiss={closeDialog}
      onConfirm={onConfirm}
      confirmColor="blue"
      dismissColor="default"
      isConfirmDisabled={loading}
      prompText={t('play.convertSilverWarning')}
    />
  )
})

ConfirmConvertSilverCardsDialog.displayName = 'ConfirmConvertSilverCardsDialog'
