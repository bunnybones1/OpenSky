import { SwapType } from '@0xsequence/metadata'
import { memo, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useCartTotal } from '~/MarketPage/ViewOrderButton/CartDialog/CartTotalRow/useCartTotal'
import { FullWidthButtonStyle } from '~/shared/style/FullWidthButtonStyle.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'
import { CartItem, MarketMode } from '~/shared/types/market'

import { Button } from '../Button'
import { Icon } from '../Icon/Icon'
import { Text } from '../Text'
import { Tooltip } from '../Tooltip/Tooltip'

const Spinner = { icon: 'spinner' } as const

interface CheckoutPanelProps {
  items: CartItem[] | null | undefined
  mode: MarketMode
  isDisabled?: boolean
  onConfirmTransaction: (setIsLoading: (isLoading: boolean) => void) => Promise<any>
}

export const CheckoutPanel = memo(
  ({ items, mode, onConfirmTransaction, isDisabled }: CheckoutPanelProps) => {
    const [isLoading, setIsLoading] = useState(false)
    const { t } = useTranslation()
    const cartTotal = useCartTotal(items, mode)

    const feeAmount = useMemo(() => {
      if (!cartTotal) return undefined
      const withFeeNum = Number(cartTotal.withFees)
      const withoutFeeNum = Number(cartTotal.withoutFees)

      return (withFeeNum - withoutFeeNum).toFixed(2)
    }, [cartTotal])

    const totalItemsCount = useMemo(() => {
      if (!items) return undefined

      return items.reduce((prev, curr) => {
        if (!curr) return prev
        return prev + curr.amount
      }, 0)
    }, [items])

    const onConfirm = useCallback(async () => {
      try {
        await onConfirmTransaction(setIsLoading)
      } catch (error) {
        setIsLoading(false)
      }
    }, [onConfirmTransaction])

    return (
      <div
        className={Sprinkles({
          height: 'full',
          width: 'full',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          borderLeft: '1px solid',
          borderColor: 'purple7',
          padding: '20px',
          backgroundColor: 'purple4'
        })}
      >
        <Text
          marginBottom="16px"
          color="purple9"
          fontWeight="700"
          fontSize="22px"
          fontFamily="condensed"
        >
          {mode === SwapType.BUY
            ? t('shop.ConfirmPurchase?')
            : t('shop.ConfirmSale?')}
        </Text>
        <div
          className={Sprinkles({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: 'full',
            paddingY: '8px'
          })}
        >
          <Text color="purple9" fontSize="12px" fontWeight="500">
            {t('shop.subtotal')}
          </Text>
          {!!cartTotal?.withoutFees ? (
            <Text color="purple9" fontSize="12px" fontWeight="500">
              {`$${cartTotal.withoutFees}`}
            </Text>
          ) : (
            <Icon type="spinner" color="purple9" height="12px" />
          )}
        </div>
        <div
          className={Sprinkles({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: 'full',
            paddingTop: '8px',
            paddingBottom: '16px',
            borderBottom: '1px solid',
            borderColor: 'purple5'
          })}
        >
          <Text color="purple9" fontSize="12px" fontWeight="500">
            {t('shop.Fees')}
          </Text>
          {!!feeAmount ? (
            <Text color="purple9" fontSize="12px" fontWeight="500">
              {`$${feeAmount}`}
            </Text>
          ) : (
            <Icon type="spinner" color="purple9" height="12px" />
          )}
        </div>
        <div
          className={Sprinkles({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: 'full',
            paddingBottom: '24px',
            paddingTop: '12px'
          })}
        >
          <Text color="purple9" fontSize="14px" fontWeight="500">
            {t('shop.cartTotal', { count: totalItemsCount })}
          </Text>
          {!!cartTotal?.withFees ? (
            <Text color="purple9" fontSize="14px" fontWeight="500">
              {`$${cartTotal.withFees}`}
            </Text>
          ) : (
            <Icon type="spinner" color="purple9" height="14px" />
          )}
        </div>
        <Button
          onClick={onConfirm}
          text={t('general.CONFIRM')}
          colorType="blue"
          frameType="default"
          className={FullWidthButtonStyle}
          buttonClassName={FullWidthButtonStyle}
          height="52px"
          disabled={isLoading || isDisabled}
          leftAdornment={isLoading ? Spinner : undefined}
        />
        <div
          className={Sprinkles({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            width: 'full',
            paddingTop: '12px'
          })}
        >
          <Tooltip placement="top" tooltip={t('shop.salesAreFinalTooltip')}>
            <Icon type="info-empty" color="purple9" height="14px" marginRight="8px" />
          </Tooltip>
          <Text color="purple9" fontSize="10px" fontWeight="700">
            {t('shop.salesAreFinal')}
          </Text>
        </div>
      </div>
    )
  }
)

CheckoutPanel.displayName = 'CheckoutPanel'
