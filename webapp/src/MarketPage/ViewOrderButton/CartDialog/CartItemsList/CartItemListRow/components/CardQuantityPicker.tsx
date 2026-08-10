import { SwapType } from '@0xsequence/metadata'
import { ItemType } from '@opensky/proto'
import { memo, useCallback, useMemo } from 'react'

import { Icon } from '~/shared/components/Icon/Icon'
import { useBalancesForCard } from '~/shared/hooks/cards/useBalancesForCard'
import { useUpdateCartItemAmount } from '~/shared/mutations/cart/useUpdateCartItemAmount'
import { useTokenPriceAndSupply } from '~/shared/queries/useTokenPriceAndSupply'
import { MarketMode } from '~/shared/types/market'

import { QuantityPicker } from '../shared/components/QuantityPicker'

interface CardQuantityPickerProps {
  amount: number
  id: number
  side: MarketMode
  type: ItemType.SW_GOLD_CARDS | ItemType.SW_SILVER_CARDS
}

export const CardQuantityPicker = memo(
  ({ id, type, amount, side }: CardQuantityPickerProps) => {
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

    const updateAmount = useUpdateCartItemAmount()

    const increaseAmount = useCallback(() => {
      updateAmount.mutate({
        tokenId: id,
        side,
        type,
        amount: amount + 1
      })
    }, [updateAmount, amount, id, side, type])

    const max = useMemo(() => {
      if (side === SwapType.BUY) return priceAndSupply?.supply
      return balance
    }, [balance, priceAndSupply?.supply, side])

    const decreaseAmount = useCallback(() => {
      updateAmount.mutate({
        tokenId: id,
        side,
        type,
        amount: amount - 1
      })
    }, [amount, id, side, type, updateAmount])

    if (max === undefined) {
      return <Icon type="spinner" height="16px" color="white" />
    }

    if (max === null) return null

    return (
      <QuantityPicker
        max={max}
        amount={amount}
        decreaseAmount={decreaseAmount}
        increaseAmount={increaseAmount}
      />
    )
  }
)

CardQuantityPicker.displayName = 'CardQuantityPicker'
