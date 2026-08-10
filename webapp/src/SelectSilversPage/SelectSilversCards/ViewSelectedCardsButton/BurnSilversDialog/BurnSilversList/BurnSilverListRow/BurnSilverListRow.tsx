import { SwapType } from '@0xsequence/metadata'
import { ItemType } from '@opensky/proto'
import clsx from 'clsx'
import { memo, useCallback } from 'react'

import { CardPrice } from '~/shared/components/CardPrice'
import { CardRow } from '~/shared/components/CardRow/CardRow'
import { Icon } from '~/shared/components/Icon/Icon'
import {
  selectSilversState,
  updateSelectSilversState
} from '~/shared/state/select-silvers/select-silvers-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { CartItemListRowStyle } from './BurnSilverListRow.css'
import { BurnSilverQuantityPicker } from './components/BurnSilverQuantityPicker'

interface CartItemListRowProps {
  id: number
  quantity: number
}

export const BurnSilverListRow = memo(({ id, quantity }: CartItemListRowProps) => {
  const removeItem = useCallback(() => {
    const newItems = selectSilversState.selectedCards.filter((card) => card.id !== id)

    updateSelectSilversState('selectedCards', newItems)
  }, [id])

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
          <CardRow id={id} prioritizeGrade />
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
      <div
        className={Sprinkles({
          display: 'flex',
          height: 'full',
          alignItems: 'center',
          justifyContent: 'flex-start',
          width: 'full'
        })}
      >
        <CardPrice mode={SwapType.BUY} tokenId={id} quantity={quantity} />
      </div>
      <div
        className={Sprinkles({
          display: 'flex',
          height: 'full',
          alignItems: 'center',
          justifyContent: 'flex-start',
          width: 'full'
        })}
      >
        <BurnSilverQuantityPicker
          type={ItemType.SW_SILVER_CARDS}
          id={id}
          amount={quantity}
        />
      </div>
      <div
        className={Sprinkles({
          display: 'flex',
          height: 'full',
          alignItems: 'center',
          justifyContent: 'flex-start',
          width: 'full'
        })}
      >
        <CardPrice isSubtotal mode={SwapType.SELL} tokenId={id} quantity={quantity} />
      </div>
    </div>
  )
})

BurnSilverListRow.displayName = 'BurnSilverListRow'
