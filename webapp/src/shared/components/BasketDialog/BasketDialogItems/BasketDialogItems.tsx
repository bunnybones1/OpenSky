import clsx from 'clsx'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Sprinkles } from '~/shared/style/Sprinkles.css'
import { CartItem, MarketMode } from '~/shared/types/market'

import { Text } from '../../Text'
import { BasketDialogItemsStyle, ItemListHeader } from './BasketDialogItems.css'
import { BasketItemRow } from './BasketItemRow/BasketItemRow'

interface BasketDialogItemsProps {
  items: CartItem[] | null | undefined
  onRemoveItem?: (id: number, mode: MarketMode) => void
  onUpdateItemQuantity?: (
    id: number,
    mode: MarketMode,
    direction: 'up' | 'down'
  ) => void
}

export const BasketDialogItems = memo(
  ({ items, onRemoveItem, onUpdateItemQuantity }: BasketDialogItemsProps) => {
    const { t } = useTranslation()
    return (
      <div
        className={clsx(
          BasketDialogItemsStyle,
          Sprinkles({
            width: 'full',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            flexDirection: 'column'
          })
        )}
      >
        <div
          className={clsx(
            Sprinkles({
              width: 'full',
              display: 'grid',
              alignItems: 'center',
              marginTop: '12px'
            }),
            ItemListHeader
          )}
        >
          <Text marginLeft="32px" fontSize="14px" color="white">
            {t('generic.Item')}
          </Text>
          <Text fontSize="14px" color="white">
            {t('generic.Quantity')}
          </Text>
          <Text fontSize="14px" color="white">
            {t('generic.UnitPrice')}
          </Text>
        </div>
        {!!items &&
          items.length &&
          items.map((item) => (
            <BasketItemRow
              type={item.type}
              key={item.tokenId}
              id={item.tokenId}
              onRemoveItem={onRemoveItem}
              side={item.side}
              amount={item.amount}
              onUpdateItemQuantity={onUpdateItemQuantity}
            />
          ))}
      </div>
    )
  }
)

BasketDialogItems.displayName = 'BasketDialogItems'
