import { memo } from 'react'

import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { MarketCardBacksEmptyList } from './components/MarketCardBacksEmptyList'
import { MarketCardBacksList } from './MarketCardBacksList/MarketCardBacksList'
import { MarketCardBacksSearchBar } from './MarketCardBacksSearchBar/MarketCardBacksSearchBar'

export const MarketCardBacks = memo(() => {
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
      <MarketCardBacksSearchBar />
      <MarketCardBacksEmptyList />
      <MarketCardBacksList />
    </div>
  )
})

MarketCardBacks.displayName = 'MarketCardBacks'
