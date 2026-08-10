import { SwapType } from '@0xsequence/metadata'
import { ItemType } from '@opensky/proto'
import clsx from 'clsx'
import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { useCartTotal } from '~/MarketPage/ViewOrderButton/CartDialog/CartTotalRow/useCartTotal'
import { AuthenticationClient, GlobalQueryClient } from '~/shared/clients'
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
import { useAuthedAccount } from '~/shared/hooks/useAuthedAccount'
import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'
import { useConquestAndUSDCBalances } from '~/shared/queries/useConquestAndUSDCBalances'
import { addToast } from '~/shared/state/toast-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'
import { CartItem, MarketMode } from '~/shared/types/market'
import { WalletWidget } from '~/WalletWidget/WalletWidget'

import { CheckoutPanel } from '../CheckoutPanel/CheckoutPanel'
import { BasketDialogStyle } from './BasketDialog.css'
import { BasketDialogItems } from './BasketDialogItems/BasketDialogItems'
import { BasketDialogHeader } from './components/BasketDialogHeader'
import { BASKET_DIALOG_ID } from './exported/constants'

const { openDialog: openSequenceDialog, closeDialog: closeSequenceDialog } =
  controlDialog(SEQUENCE_CONFIRM_SIGNATURE_DIALOG_ID)

const { closeDialog } = controlDialog(BASKET_DIALOG_ID)

const { openDialog: openConvertDialog } = controlDialog(
  CONVERT_TO_SEQUENCE_WALLET_DIALOG
)

export interface BasketDialogProps {
  mode: MarketMode
  items: CartItem[]
  onClear?: () => void
  onRemoveItem?: (id: number, mode: MarketMode) => void
  onUpdateItemQuantity?: (
    id: number,
    mode: MarketMode,
    direction: 'up' | 'down'
  ) => void
}

export const BasketDialog = memo(
  ({
    mode,
    items,
    onClear,
    onRemoveItem,
    onUpdateItemQuantity
  }: BasketDialogProps) => {
    const { data: authedAccount } = useAuthedAccount()
    const { t } = useTranslation()
    const cartTotal = useCartTotal(items, mode)
    const { data: tokenBalances } = useConquestAndUSDCBalances()

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

    const onConfirm = useCallback(
      async (setIsLoading: (isLoading: boolean) => void) => {
        if (!items) return
        try {
          setIsLoading(true)
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

          await wallet.sendTransaction(txns)

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
            GlobalQueryClient.invalidateQueries(
              getConquestAndUSDCBalancesKey(address)
            )
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

          if (onClear) {
            onClear()
          }

          setIsLoading(false)
        } catch (error) {
          if (error.code === 4001) {
            setIsLoading(false)
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
      },
      [items, mode, onClear, t]
    )

    return (
      <div
        className={clsx(
          BasketDialogStyle,
          Sprinkles({ display: 'grid', overflow: 'hidden', position: 'relative' })
        )}
      >
        <div
          className={Sprinkles({
            width: 'full',
            height: 'full',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            flexDirection: 'column'
          })}
        >
          <BasketDialogHeader mode={mode} />
          <BasketDialogItems
            onUpdateItemQuantity={onUpdateItemQuantity}
            onRemoveItem={onRemoveItem}
            items={items}
          />
        </div>
        {/* TODO: This might not need to be a generic component like this. We'll have */}
        {/* to see how the designs evolve. */}
        <CheckoutPanel
          isDisabled={isDisabled}
          onConfirmTransaction={onConfirm}
          items={items}
          mode={mode}
        />
        <div
          className={Sprinkles({
            position: 'absolute',
            left: 0,
            bottom: 0,
            zIndex: 5
          })}
        >
          <WalletWidget isLogoHidden />
        </div>
      </div>
    )
  }
)

BasketDialog.displayName = 'BasketDialog'
