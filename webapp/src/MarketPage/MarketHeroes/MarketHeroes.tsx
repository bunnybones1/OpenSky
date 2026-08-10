import { memo } from 'react'

import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { MarketHeroesEmptyList } from './components/MarketHeroesEmptyList'
import { MarketHeroesList } from './MarketHeroesList/MarketHeroesList'
import { MarketHeroesSearchBar } from './MarketHeroesSearchBar/MarketHeroesSearchBar'

export const MarketHeroes = memo(() => {
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
      <MarketHeroesSearchBar />
      <MarketHeroesEmptyList />
      <MarketHeroesList />
    </div>
  )
})

MarketHeroes.displayName = 'MarketHeroes'
