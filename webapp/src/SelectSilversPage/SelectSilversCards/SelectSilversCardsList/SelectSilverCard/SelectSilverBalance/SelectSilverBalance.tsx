import { SwapType } from '@0xsequence/metadata'
import { ItemType } from '@opensky/proto'
import { memo, useMemo } from 'react'
import { useSnapshot } from 'valtio'

import { CardBalanceAndPriceInfo } from '~/shared/components/CardBalanceAndPriceInfo'
import { selectSilversState } from '~/shared/state/select-silvers/select-silvers-state'

import { SelectSilverButton } from './components/SelectSilverButton'

interface MarketCardBalanceProps {
  id: number
}

export const SelectSilverBalance = memo(({ id }: MarketCardBalanceProps) => {
  const { selectedCards } = useSnapshot(selectSilversState)

  const isSelected = useMemo(() => {
    // eslint-disable-next-line valtio/state-snapshot-rule
    return selectedCards.some((card) => card.id === id)
  }, [id, selectedCards])

  return (
    <CardBalanceAndPriceInfo
      mode={SwapType.SELL}
      id={id}
      grade={ItemType.SW_SILVER_CARDS}
      ButtonComponent={SelectSilverButton}
      isSelected={isSelected}
    />
  )
})

SelectSilverBalance.displayName = 'SelectSilverBalance'
