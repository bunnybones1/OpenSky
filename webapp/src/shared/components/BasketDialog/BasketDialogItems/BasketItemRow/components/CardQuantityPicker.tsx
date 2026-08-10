import { SwapType } from '@0xsequence/metadata'
import { ItemType } from '@opensky/proto'
import { memo, useCallback, useMemo } from 'react'

import { Icon } from '~/shared/components/Icon/Icon'
import { useBalancesForCard } from '~/shared/hooks/cards/useBalancesForCard'
import { useTokenPriceAndSupply } from '~/shared/queries/useTokenPriceAndSupply'
import { MarketMode } from '~/shared/types/market'

import { QuantityPicker } from '../shared/components/QuantityPicker'

interface CardQuantityPickerProps {
  amount: number
  id: number
  side: MarketMode
  type: ItemType.SW_GOLD_CARDS | ItemType.SW_SILVER_CARDS
  onUpdateItemQuantity?: (
    id: number,
    mode: MarketMode,
    direction: 'up' | 'down'
  ) => void
}

export const CardQuantityPicker = memo(
  ({ id, type, amount, side, onUpdateItemQuantity }: CardQuantityPickerProps) => {
    const { data: priceAndSupply } = useTokenPriceAndSupply({
      id,
      quantity: 1,
      mode: SwapType.BUY
    })

    const cardBalances = useBalancesForCard(id)

    const balance = useMemo(() => {
      if (!cardBalances) return null

      const _balance = cardBalances.find(({ itemType }) => itemType === type)?.balance

      if (!_balance) return null

      return _balance
    }, [cardBalances, type])

    const increaseAmount = useCallback(() => {
      if (!!onUpdateItemQuantity) {
        onUpdateItemQuantity(id, side, 'up')
      }
    }, [onUpdateItemQuantity, id, side])

    const max = useMemo(() => {
      if (side === SwapType.BUY) return priceAndSupply?.supply
      return balance
    }, [balance, priceAndSupply?.supply, side])

    const decreaseAmount = useCallback(() => {
      if (!!onUpdateItemQuantity) {
        onUpdateItemQuantity(id, side, 'down')
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

CardQuantityPicker.displayName = 'CardQuantityPicker'
