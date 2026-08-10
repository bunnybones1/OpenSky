import { ItemType } from '@opensky/proto'
import clsx from 'clsx'
import { memo, useCallback, useMemo } from 'react'

import { CardBackRow } from '~/shared/components/CardBackRow'
import { CardPrice } from '~/shared/components/CardPrice'
import { CardRow } from '~/shared/components/CardRow/CardRow'
import { Icon } from '~/shared/components/Icon/Icon'
import { StickerRow } from '~/shared/components/StickerRow'
import { useRemoveFromCart } from '~/shared/mutations/cart/useRemoveFromCart'
import { Sprinkles } from '~/shared/style/Sprinkles.css'
import { MarketMode } from '~/shared/types/market'

import { CartItemListRowStyle } from './CartItemListRow.css'
import { CardBackPrice } from './components/CardBackPrice'
import { CardBackQuantityPicker } from './components/CardBackQuantityPicker'
import { CardQuantityPicker } from './components/CardQuantityPicker'
import { StickerPrice } from './components/StickerPrice'
import { StickerQuantityPicker } from './components/StickerQuantityPicker'

interface CartItemListRowProps {
  id: number
  type: ItemType
  side: MarketMode
  amount: number
}

export const CartItemListRow = memo(
  ({ id, type, side, amount }: CartItemListRowProps) => {
    const removeFromCart = useRemoveFromCart()

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

    const SubtotalColumn = useMemo(() => {
      switch (type) {
        case ItemType.SW_SILVER_CARDS:
        case ItemType.SW_GOLD_CARDS: {
          return <CardPrice isSubtotal mode={side} tokenId={id} quantity={amount} />
        }
        case ItemType.SW_STICKERS: {
          return (
            <StickerPrice mode={side} tokenId={id} quantity={amount} isSubtotal />
          )
        }
        case ItemType.SW_CARD_BACKS: {
          return (
            <CardBackPrice mode={side} tokenId={id} quantity={amount} isSubtotal />
          )
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
      removeFromCart.mutate([{ tokenId: id, side }])
    }, [id, removeFromCart, side])

    return (
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
            borderColor: 'purple4'
          }),
          CartItemListRowStyle
        )}
      >
        {!!ImageRow && (
          <div
            className={Sprinkles({
              display: 'flex',
              height: 'full',
              alignItems: 'center',
              justifyContent: 'flex-start',
              width: 'full'
            })}
          >
            <>
              {ImageRow}
              <div
                className={Sprinkles({
                  padding: '4px',
                  cursor: 'pointer',
                  marginLeft: '12px',
                  marginRight: '24px'
                })}
                onClick={removeItem}
              >
                <Icon type="trash" color="purple6" height="16px" />
              </div>
            </>
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
        {!!SubtotalColumn && (
          <div
            className={Sprinkles({
              display: 'flex',
              height: 'full',
              alignItems: 'center',
              justifyContent: 'flex-start',
              width: 'full'
            })}
          >
            {SubtotalColumn}
          </div>
        )}
      </div>
    )
  }
)

CartItemListRow.displayName = 'CartItemListRow'
