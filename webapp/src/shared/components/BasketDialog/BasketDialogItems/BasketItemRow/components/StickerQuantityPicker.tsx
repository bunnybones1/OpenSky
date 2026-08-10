import { SwapType } from '@0xsequence/metadata'
import { ItemType } from '@opensky/proto'
import { memo, useCallback, useMemo } from 'react'

import { Icon } from '~/shared/components/Icon/Icon'
import { useTokenBalance } from '~/shared/queries/useTokenBalances'
import { useTokenPriceAndSupply } from '~/shared/queries/useTokenPriceAndSupply'
import { MarketMode } from '~/shared/types/market'

import { QuantityPicker } from '../shared/components/QuantityPicker'

interface StickerQuantityPickerProps {
  amount: number
  id: number
  side: MarketMode
  onUpdateItemQuantity?: (
    id: number,
    mode: MarketMode,
    direction: 'up' | 'down'
  ) => void
}

export const StickerQuantityPicker = memo(
  ({ id, amount, side, onUpdateItemQuantity }: StickerQuantityPickerProps) => {
    const { data: priceAndSupply } = useTokenPriceAndSupply({
      id,
      mode: side,
      quantity: 1
    })

    const { data: stickerBalance } = useTokenBalance(ItemType.SW_STICKERS, id)

    const balance = useMemo(() => {
      if (!stickerBalance) return null

      return stickerBalance.balance
    }, [stickerBalance])

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

StickerQuantityPicker.displayName = 'StickerQuantityPicker'
