import clsx from 'clsx'
import { memo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { Text } from '~/shared/components/Text'
import { useCartSideItems } from '~/shared/hooks/cart/useCartSideItems'
import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'
import { Sprinkles } from '~/shared/style/Sprinkles.css'
import { MarketMode } from '~/shared/types/market'

import { CART_DIALOG_ID } from '../../shared/constants'
import { CartItemListRow } from './CartItemListRow/CartItemListRow'
import { CartItemListHeaderStyle } from './CartItemsList.css'

const { closeDialog } = controlDialog(CART_DIALOG_ID)

interface CartItemsListProps {
  mode: MarketMode
}

export const CartItemsList = memo(({ mode }: CartItemsListProps) => {
  const items = useCartSideItems(mode)

  const { t } = useTranslation()

  useEffect(() => {
    if (!!items && !items.length) {
      closeDialog()
    }
  }, [items])

  if (!items) {
    return null
  }

  return (
    <div
      className={Sprinkles({
        width: 'full',
        flex: 1,
        overflow: 'auto',
        backgroundColor: 'purple1'
      })}
    >
      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            paddingX: {
              base: '8px',
              mobile: '12px',
              tabletWide: '20px'
            },
            display: 'grid',
            alignItems: 'center',
            paddingTop: '8px'
          }),
          CartItemListHeaderStyle
        )}
      >
        <Text fontSize="14px" color="white">
          {t('generic.Item')}
        </Text>
        <Text fontSize="14px" color="white">
          {t('generic.UnitPrice')}
        </Text>
        <Text fontSize="14px" color="white">
          {t('generic.Quantity')}
        </Text>
        <Text fontSize="14px" color="white">
          {t('generic.Subtotal')}
        </Text>
      </div>
      {items.map((item) => (
        <CartItemListRow
          type={item.type}
          key={item.tokenId}
          id={item.tokenId}
          side={item.side}
          amount={item.amount}
        />
      ))}
    </div>
  )
})

CartItemsList.displayName = 'CartItemsList'
