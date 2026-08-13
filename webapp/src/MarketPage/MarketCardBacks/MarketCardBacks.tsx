import { memo } from 'react'

import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { MarketCardBacksEmptyList } from './components/MarketCardBacksEmptyList'
import { MarketCardBacksList } from './MarketCardBacksList/MarketCardBacksList'
import { MarketCardBacksSearchBar } from './MarketCardBacksSearchBar/MarketCardBacksSearchBar'

interface MarketCardBacksProps {
  inventoryOnly?: boolean
}

export const MarketCardBacks = memo(({ inventoryOnly }: MarketCardBacksProps) => {
  return (
    <div
      className={Sprinkles({
        width: 'full',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'flex-start'
      })}
    >
      <MarketCardBacksSearchBar inventoryOnly={inventoryOnly} />
      <MarketCardBacksEmptyList />
      <MarketCardBacksList inventoryOnly={inventoryOnly} />
    </div>
  )
})

MarketCardBacks.displayName = 'MarketCardBacks'
