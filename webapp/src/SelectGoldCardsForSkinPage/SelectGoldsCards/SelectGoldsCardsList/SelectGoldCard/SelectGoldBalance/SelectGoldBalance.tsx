import { SwapType } from '@0xsequence/metadata'
import { ItemType } from '@opensky/proto'
import { memo, useMemo } from 'react'
import { useSnapshot } from 'valtio'

import { CardBalanceAndPriceInfo } from '~/shared/components/CardBalanceAndPriceInfo'
import { selectGoldsState } from '~/shared/state/select-golds/select-golds-state'

import { SelectGoldButton } from './components/SelectGoldButton'

interface MarketCardBalanceProps {
  id: number
}

export const SelectGoldBalance = memo(({ id }: MarketCardBalanceProps) => {
  const { selectedCards } = useSnapshot(selectGoldsState)

  const isSelected = useMemo(() => {
    // eslint-disable-next-line valtio/state-snapshot-rule
    return selectedCards.some((card) => card.tokenId === id)
  }, [id, selectedCards])

  return (
    <CardBalanceAndPriceInfo
      mode={SwapType.SELL}
      id={id}
      grade={ItemType.SW_GOLD_CARDS}
      ButtonComponent={SelectGoldButton}
      isSelected={isSelected}
    />
  )
})

SelectGoldBalance.displayName = 'SelectGoldBalance'
