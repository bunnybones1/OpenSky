import { memo } from 'react'

import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { MarketCardsEmptyList } from './components/MarketCardsEmptyList'
import { MarketCardsList } from './MarketCardsList/MarketCardsList'
import { MarketCardsSearchBar } from './MarketCardsSearchBar/MarketCardsSearchBar'

export const MarketCards = memo(() => {
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
      <MarketCardsSearchBar />
      <MarketCardsEmptyList />
      <MarketCardsList />
      {/*  */}
    </div>
  )
})

MarketCards.displayName = 'MarketCards'
