import { SwapType } from '@0xsequence/metadata'
import { ItemType } from '@opensky/proto'
import { memo, useCallback, useMemo } from 'react'

import { Icon } from '~/shared/components/Icon/Icon'
import { useTokenBalance } from '~/shared/queries/useTokenBalances'
import { useTokenPriceAndSupply } from '~/shared/queries/useTokenPriceAndSupply'
import { MarketMode } from '~/shared/types/market'

import { QuantityPicker } from '../shared/components/QuantityPicker'

interface CardBackQuantityPickerProps {
  amount: number
  id: number
  side: MarketMode
  onUpdateItemQuantity?: (
    id: number,
    mode: MarketMode,
    direction: 'up' | 'down'
  ) => void
}

export const CardBackQuantityPicker = memo(
  ({ id, amount, side, onUpdateItemQuantity }: CardBackQuantityPickerProps) => {
    const { data: priceAndSupply } = useTokenPriceAndSupply({
      id,
      mode: SwapType.BUY,
      quantity: 1
    })

    const { data: cardBackBalance } = useTokenBalance(ItemType.SW_CARD_BACKS, id)

    const balance = useMemo(() => {
      if (!cardBackBalance) return null

      return cardBackBalance.balance
    }, [cardBackBalance])

    const increaseAmount = useCallback(() => {
      if (!!onUpdateItemQuantity) {
        onUpdateItemQuantity(id, side, 'up')
      }
    }, [onUpdateItemQuantity, id, side])

    const max = useMemo(() => {
      if (side === SwapType.BUY) return priceAndSupply?.supply
      return balance
    }, [balance, side, priceAndSupply])

    const decreaseAmount = useCallback(() => {
      if (!!onUpdateItemQuantity) {
        onUpdateItemQuantity(id, side, 'up')
      }
    }, [id, onUpdateItemQuantity, side])

    if (max === undefined) {
      return <Icon type="spinner" height="16px" color="white" />
    }

    if (max === null) return null

    return (
      <QuantityPicker
        max={max}
        amount={amount}
        hidden={!onUpdateItemQuantity}
        decreaseAmount={decreaseAmount}
        increaseAmount={increaseAmount}
      />
    )
  }
)

CardBackQuantityPicker.displayName = 'CardBackQuantityPicker'
