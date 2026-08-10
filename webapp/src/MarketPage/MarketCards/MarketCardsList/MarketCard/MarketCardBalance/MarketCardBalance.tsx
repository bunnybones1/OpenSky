import { SwapType } from '@0xsequence/metadata'
import { memo } from 'react'
import { useSnapshot } from 'valtio'

import { CardBalanceAndPriceInfo } from '~/shared/components/CardBalanceAndPriceInfo'
import { useCartItem } from '~/shared/queries/useCart'
import { useTokenPriceAndSupply } from '~/shared/queries/useTokenPriceAndSupply'
import { marketCardsFilterState } from '~/shared/state/market-cards/market-cards-filter-state'
import { OwnershipFilter } from '~/shared/types/cards'

import { MarketCardButton } from './components/MarketCardButton'

interface MarketCardBalanceProps {
  id: number
}

export const MarketCardBalance = memo(({ id }: MarketCardBalanceProps) => {
  const { grade, ownership } = useSnapshot(marketCardsFilterState)

  const mode = ownership === OwnershipFilter.OWNED ? SwapType.SELL : SwapType.BUY

  const { data: cartItem } = useCartItem(id, mode)

  const { data: priceAndSupply } = useTokenPriceAndSupply({
    id,
    mode,
    quantity: 1
  })

  if (!mode) return null

  return (
    <CardBalanceAndPriceInfo
      mode={mode}
      id={id}
      grade={grade}
      ButtonComponent={!!priceAndSupply ? MarketCardButton : undefined}
      isSelected={!!cartItem}
    />
  )
})

MarketCardBalance.displayName = 'MarketCardBalance'
