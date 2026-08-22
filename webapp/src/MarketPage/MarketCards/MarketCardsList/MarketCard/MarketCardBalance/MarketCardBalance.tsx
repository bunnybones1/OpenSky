import { SwapType } from '@0xsequence/metadata'
import { memo } from 'react'
import { useSnapshot } from 'valtio'

import env from '~/env'
import { CardBalanceAndPriceInfo } from '~/shared/components/CardBalanceAndPriceInfo'
import { CardBalance } from '~/shared/components/CardBalanceInfo'
import { useCartItem } from '~/shared/queries/useCart'
import { useTokenPriceAndSupply } from '~/shared/queries/useTokenPriceAndSupply'
import { marketCardsFilterState } from '~/shared/state/market-cards/market-cards-filter-state'
import { OwnershipFilter } from '~/shared/types/cards'

import { MarketCardButton } from './components/MarketCardButton'

interface MarketCardBalanceProps {
  id: number
}

export const MarketCardBalance = memo(({ id }: MarketCardBalanceProps) => {
  const isIdentityMarket = env.AUTH_MODE === 'google'
  const { grade, ownership } = useSnapshot(marketCardsFilterState)

  const mode = ownership === OwnershipFilter.OWNED ? SwapType.SELL : SwapType.BUY

  const { data: cartItem } = useCartItem(id, mode, !isIdentityMarket)

  const { data: priceAndSupply } = useTokenPriceAndSupply({
    id,
    mode,
    quantity: 1,
    isDisabled: isIdentityMarket
  })

  if (isIdentityMarket) return <CardBalance id={id} grade={grade} />

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
