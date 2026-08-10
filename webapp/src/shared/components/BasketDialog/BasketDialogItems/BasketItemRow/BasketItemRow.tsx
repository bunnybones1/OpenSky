import { ItemType } from '@opensky/proto'
import clsx from 'clsx'
import { memo, useCallback, useMemo } from 'react'

import { CardBackRow } from '~/shared/components/CardBackRow'
import { CardPrice } from '~/shared/components/CardPrice'
import { CardRow } from '~/shared/components/CardRow/CardRow'
import { Icon } from '~/shared/components/Icon/Icon'
import { StickerRow } from '~/shared/components/StickerRow'
import { Sprinkles } from '~/shared/style/Sprinkles.css'
import { MarketMode } from '~/shared/types/market'

import { BasketItemRowStyle } from './BasketItemRow.css'
import { CardBackPrice } from './components/CardBackPrice'
import { CardBackQuantityPicker } from './components/CardBackQuantityPicker'
import { CardQuantityPicker } from './components/CardQuantityPicker'
import { StickerPrice } from './components/StickerPrice'
import { StickerQuantityPicker } from './components/StickerQuantityPicker'

interface BasketItemRowProps {
  id: number
  type: ItemType
  side: MarketMode
  amount: number
  onRemoveItem?: (id: number, mode: MarketMode) => void
  onUpdateItemQuantity?: (
    id: number,
    mode: MarketMode,
    direction: 'up' | 'down'
  ) => void
}

export const BasketItemRow = memo(
  ({ id, type, side, amount, onRemoveItem }: BasketItemRowProps) => {
    const ImageRow = useMemo(() => {
      switch (type) {
        case ItemType.SW_SILVER_CARDS:
        case ItemType.SW_GOLD_CARDS: {
          return <CardRow id={id} prioritizeGrade />
        }
        case ItemType.SW_STICKERS: {
          return <StickerRow id={id} />
        }
        case ItemType.SW_CARD_BACKS: {
          return <CardBackRow id={id} />
        }
        default:
          return null
      }
    }, [id, type])

    const UnitPriceColumn = useMemo(() => {
      switch (type) {
        case ItemType.SW_SILVER_CARDS:
        case ItemType.SW_GOLD_CARDS: {
          return <CardPrice mode={side} tokenId={id} quantity={amount} />
        }
        case ItemType.SW_STICKERS: {
          return <StickerPrice mode={side} tokenId={id} quantity={amount} />
        }
        case ItemType.SW_CARD_BACKS: {
          return <CardBackPrice mode={side} tokenId={id} quantity={amount} />
        }
        default:
          return null
      }
    }, [amount, id, side, type])

    const QuantityColumn = useMemo(() => {
      switch (type) {
        case ItemType.SW_SILVER_CARDS:
        case ItemType.SW_GOLD_CARDS: {
          return (
            <CardQuantityPicker type={type} side={side} id={id} amount={amount} />
          )
        }
        case ItemType.SW_STICKERS: {
          return <StickerQuantityPicker side={side} id={id} amount={amount} />
        }
        case ItemType.SW_CARD_BACKS: {
          return <CardBackQuantityPicker side={side} id={id} amount={amount} />
        }
        default:
          return null
      }
    }, [amount, id, side, type])

    const removeItem = useCallback(() => {
      if (onRemoveItem) {
        onRemoveItem(id, side)
      }
    }, [id, onRemoveItem, side])

    return (
      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            display: 'grid',
            borderBottom: '1px solid',
            borderColor: 'purple4'
          }),
          BasketItemRowStyle
        )}
      >
        {!!ImageRow && (
          <div
            className={Sprinkles({
              display: 'flex',
              height: 'full',
              alignItems: 'center',
              justifyContent: 'flex-start',
              width: 'full',
              paddingLeft: {
                base: '8px',
                mobile: '12px',
                tabletWide: '20px'
              },
              paddingRight: '48px'
            })}
          >
            <>
              {ImageRow}
              {!!onRemoveItem && (
                <div
                  className={Sprinkles({
                    padding: '4px',
                    cursor: 'pointer',
                    marginLeft: '12px'
                  })}
                  onClick={removeItem}
                >
                  <Icon type="trash" color="purple6" height="16px" />
                </div>
              )}
            </>
          </div>
        )}
        {!!QuantityColumn && (
          <div
            className={Sprinkles({
              display: 'flex',
              height: 'full',
              alignItems: 'center',
              justifyContent: 'flex-start',
              width: 'full'
            })}
          >
            {QuantityColumn}
          </div>
        )}
        {!!UnitPriceColumn && (
          <div
            className={Sprinkles({
              display: 'flex',
              height: 'full',
              alignItems: 'center',
              justifyContent: 'flex-start',
              width: 'full'
            })}
          >
            {UnitPriceColumn}
          </div>
        )}
      </div>
    )
  }
)

BasketItemRow.displayName = 'BasketItemRow'
