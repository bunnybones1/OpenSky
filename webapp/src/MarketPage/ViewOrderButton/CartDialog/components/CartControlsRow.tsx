import { SwapType } from '@0xsequence/metadata'
import { ItemType } from '@opensky/proto'
import clsx from 'clsx'
import { memo, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { AuthenticationClient, GlobalQueryClient } from '~/shared/clients'
import { Button } from '~/shared/components/Button'
import { Icon } from '~/shared/components/Icon/Icon'
import { Text } from '~/shared/components/Text'
import {
  getConquestAndUSDCBalancesKey,
  getTokenBalancesKey
} from '~/shared/constants/react-query-keys'
import {
  CONVERT_TO_SEQUENCE_WALLET_DIALOG,
  SEQUENCE_CONFIRM_SIGNATURE_DIALOG_ID
} from '~/shared/constants/ui'
import { getBuySellOrderTxns } from '~/shared/helpers/market/get-buy-sell-order-txns/get-buy-sell-order-txns'
import { captureError } from '~/shared/helpers/sentry'
import { shouldSeeConversionDialog } from '~/shared/helpers/should-see-conversion-dialog'
import { useCartSideItems } from '~/shared/hooks/cart/useCartSideItems'
import { useAuthedAccount } from '~/shared/hooks/useAuthedAccount'
import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'
import { useClearCartSide } from '~/shared/mutations/cart/useClearCartSide'
import { useConquestAndUSDCBalances } from '~/shared/queries/useConquestAndUSDCBalances'
import { addToast } from '~/shared/state/toast-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'
import { MarketMode } from '~/shared/types/market'

import { CART_DIALOG_ID } from '../../shared/constants'
import { useCartTotal } from '../CartTotalRow/useCartTotal'
import { CartControlsRowStyle } from './CartControlsRow.css'

const { openDialog: openSequenceDialog, closeDialog: closeSequenceDialog } =
  controlDialog(SEQUENCE_CONFIRM_SIGNATURE_DIALOG_ID)

const { closeDialog } = controlDialog(CART_DIALOG_ID)

const { openDialog: openConvertDialog } = controlDialog(
  CONVERT_TO_SEQUENCE_WALLET_DIALOG
)

interface CartControlsRowProps {
  mode: MarketMode
}

export const CartControlsRow = memo(({ mode }: CartControlsRowProps) => {
  const { t } = useTranslation()
  const [isFetching, setIsFetching] = useState(false)
  const { data: authedAccount } = useAuthedAccount()
  const clearCart = useClearCartSide()
  const items = useCartSideItems(mode)

  const { data: tokenBalances } = useConquestAndUSDCBalances()

  const cartTotal = useCartTotal(items, mode)

  const isDisabled = useMemo(() => {
    if (mode === SwapType.SELL) return false

    if (!tokenBalances || !cartTotal?.withFees || !authedAccount) return true

    if (
      authedAccount.isBurnerWallet &&
      Number(cartTotal.withFees) > tokenBalances.USDCBalance
    ) {
      return true
    }

    return false
  }, [authedAccount, mode, tokenBalances, cartTotal])

  const onClear = useCallback(() => {
    clearCart.mutate(mode)
  }, [clearCart, mode])

  const onSubmit = useCallback(async () => {
    if (!items) return
    try {
      setIsFetching(true)
      const txns = await getBuySellOrderTxns({ items, mode })

      const wallet = AuthenticationClient.wallet

      if (!wallet) {
        throw new Error('Unable to send transaction; no wallet.')
      }

      if (!txns) {
        throw new Error('Unable to send transaction; couldnt get txns.')
      }

      if (!wallet.isBurnerWallet) {
        // createOrder could trigger popup blocking detection due to execution time
        // preemptively open the wallet popup on user's intent to place order
        await AuthenticationClient.wallet?.openWalletWindow('/loading')
        // this will redirect wallet popup to send txn handler
        openSequenceDialog()
      }

      const resp = await wallet.sendTransaction(txns)

      if (resp === undefined) {
        setIsFetching(false)
        closeSequenceDialog()
        closeDialog()
        return
      }

      if (!resp) throw new Error('Unable to send transaction.')

      if (!wallet.isBurnerWallet) {
        // TODO: shouldn't have to force close wallet, however
        // since we are calling openWalletWindow above manually, then we need to close
        // manually. But easiest is to let the library handle this itself by just
        // sending the transaction above.
        wallet.closeWalletWindow()
      }

      const address = wallet.address

      if (!!address) {
        GlobalQueryClient.invalidateQueries(
          getTokenBalancesKey(ItemType.SW_HERO_SKINS, address)
        )
        GlobalQueryClient.invalidateQueries(
          getTokenBalancesKey(ItemType.SW_STICKERS, address)
        )
        GlobalQueryClient.invalidateQueries(
          getTokenBalancesKey(ItemType.SW_CARD_BACKS, address)
        )
        GlobalQueryClient.invalidateQueries(getConquestAndUSDCBalancesKey(address))
        GlobalQueryClient.invalidateQueries(
          getTokenBalancesKey(ItemType.SW_GOLD_CARDS, address)
        )
        GlobalQueryClient.invalidateQueries(
          getTokenBalancesKey(ItemType.SW_SILVER_CARDS, address)
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

      // If the user is on a burner wallet, and is level 10 or higher, prompt them
      // to convert to a real wallet after checkout.
      if (!!shouldSeeConversionDialog()) {
        openConvertDialog()
      }

      closeSequenceDialog()
      closeDialog()

      clearCart.mutate(mode)

      setIsFetching(false)
    } catch (error) {
      if (error.code === 4001) {
        setIsFetching(false)
      } else {
        const isBecausePending =
          error.toString() === 'Error: previous order is still pending'

        addToast({
          text: t(
            `notification.${
              isBecausePending ? 'orderPendingFail' : 'orderPlacedFail'
            }`
          ),
          icon: 'error',
          iconColor: 'warm9'
        })

        captureError(error, 'Placing Order Failed', false)
      }
      closeSequenceDialog()
      closeDialog()
    }
  }, [clearCart, items, mode, t])

  return (
    <div
      className={clsx(
        Sprinkles({
          width: 'full',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingX: '16px',
          backgroundColor: 'purple1'
        }),
        CartControlsRowStyle
      )}
    >
      <div
        className={Sprinkles({
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start'
        })}
        onClick={onClear}
      >
        <Icon type="trash" color="purple9" height="16px" marginRight="4px" />
        <Text fontSize="16px" color="purple9">
          {t('generic.Clear')}
        </Text>
      </div>
      <Button
        colorType="blue"
        leftAdornment={{
          icon: isFetching
            ? 'spinner'
            : mode === SwapType.BUY
            ? 'credit-card'
            : 'shop'
        }}
        onClick={onSubmit}
        buttonId="confirm-order"
        disabled={isFetching || !items || isDisabled}
        frameType="default"
        text={t('generic.ConfirmOrder', {
          type: mode === SwapType.BUY ? t('generic.Buy') : t('generic.Sell')
        })}
      />
    </div>
  )
})

CartControlsRow.displayName = 'CartControlsRow'
