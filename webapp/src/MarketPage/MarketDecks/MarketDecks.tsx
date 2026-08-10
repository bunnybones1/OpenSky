import { memo } from 'react'

import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { MarketDecksList } from './MarketDecksList/MarketDecksList'
import { MarketDecksSearchBar } from './MarketDecksSearchBar/MarketDecksSearchBar'

export const MarketDecks = memo(() => {
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
      <MarketDecksSearchBar />
      <MarketDecksList />
    </div>
  )
})

MarketDecks.displayName = 'MarketDecks'

export default MarketDecks
