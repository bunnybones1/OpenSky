import { SwapType } from '@0xsequence/metadata'
import clsx from 'clsx'
import { memo, useCallback } from 'react'

import { CardPrice } from '~/shared/components/CardPrice'
import { CardRow } from '~/shared/components/CardRow/CardRow'
import { Icon } from '~/shared/components/Icon/Icon'
import {
  selectGoldsState,
  updateSelectGoldsState
} from '~/shared/state/select-golds/select-golds-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { ConfirmGoldsQuantityPicker } from './components/ConfirmGoldsQuantityPicker'
import { CartItemListRowStyle } from './ConfirmGoldsListRow.css'

interface CartItemListRowProps {
  id: number
  quantity: number
}

export const ConfirmGoldsListRow = memo(({ id, quantity }: CartItemListRowProps) => {
  const removeItem = useCallback(() => {
    const newItems = selectGoldsState.selectedCards.filter(
      (card) => card.tokenId !== id
    )

    updateSelectGoldsState('selectedCards', newItems)
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
        <CardPrice mode={SwapType.SELL} tokenId={id} quantity={quantity} />
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
        <ConfirmGoldsQuantityPicker id={id} amount={quantity} />
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

ConfirmGoldsListRow.displayName = 'ConfirmGoldsListRow'
