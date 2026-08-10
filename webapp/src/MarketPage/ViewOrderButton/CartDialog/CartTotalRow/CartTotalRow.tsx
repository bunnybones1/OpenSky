import clsx from 'clsx'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Icon } from '~/shared/components/Icon/Icon'
import { Text } from '~/shared/components/Text'
import { Tooltip } from '~/shared/components/Tooltip/Tooltip'
import { useCartSideItems } from '~/shared/hooks/cart/useCartSideItems'
import { Sprinkles } from '~/shared/style/Sprinkles.css'
import { MarketMode } from '~/shared/types/market'

import { CartTotalRowStyle, CartTotalRowTotalText } from './CartTotalRow.css'
import { FeeBreakdownTooltip } from './components/FeeBreakdownTooltip'
import { useCartTotal } from './useCartTotal'

const FONT_SIZE = { base: '14px', tabletWide: '16px' } as const

interface CartTotalRowProps {
  mode: MarketMode
}

export const CartTotalRow = memo(({ mode }: CartTotalRowProps) => {
  const items = useCartSideItems(mode)
  const cartTotal = useCartTotal(items, mode)

  const { t } = useTranslation()

  const totalCount = useMemo(() => {
    if (!items) return undefined

    return items.reduce((prev, curr) => {
      if (!curr) return prev
      return prev + curr.amount
    }, 0)
  }, [items])

  return (
    <div
      className={clsx(
        Sprinkles({
          width: 'full',
          backgroundColor: 'purple4',
          borderBottom: '1px solid',
          borderTop: '1px solid',
          borderColor: 'purple6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingX: '16px'
        }),
        CartTotalRowStyle
      )}
    >
      <div
        className={Sprinkles({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start'
        })}
      >
        <Text
          color="purple9"
          fontSize={FONT_SIZE}
          fontFamily="condensed"
          data-id="cartTotal"
          fontWeight="400"
          marginRight="8px"
        >
          {t('shop.salesAreFinal')}
        </Text>
        <Tooltip placement="top" tooltip={t('shop.salesAreFinalTooltip')}>
          <Icon type="info" height={FONT_SIZE} color="purple9" />
        </Tooltip>
      </div>
      <div
        className={Sprinkles({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start'
        })}
      >
        <Text
          fontWeight="400"
          marginRight="8px"
          fontSize={FONT_SIZE}
          color="purple9"
          fontFamily="condensed"
        >
          {t('shop.cartTotal', { count: totalCount })}
        </Text>
        <Tooltip placement="top" tooltip={<FeeBreakdownTooltip />}>
          <Icon type="info" height={FONT_SIZE} color="purple9" />
        </Tooltip>
        <div
          className={clsx(
            Sprinkles({
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start'
            }),
            CartTotalRowTotalText
          )}
        >
          {!cartTotal?.withFees ? (
            <Icon type="spinner" height="20px" color="white" />
          ) : (
            <Text
              color="white"
              fontSize="18px"
              fontFamily="condensed"
              marginLeft="8px"
            >
              {`$${cartTotal.withFees}`}
            </Text>
          )}
        </div>
      </div>
    </div>
  )
})

CartTotalRow.displayName = 'CartTotalRow'
