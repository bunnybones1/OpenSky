import { memo } from 'react'

import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { MarketHeroesEmptyList } from './components/MarketHeroesEmptyList'
import { MarketHeroesList } from './MarketHeroesList/MarketHeroesList'
import { MarketHeroesSearchBar } from './MarketHeroesSearchBar/MarketHeroesSearchBar'

interface MarketHeroesProps {
  inventoryOnly?: boolean
}

export const MarketHeroes = memo(({ inventoryOnly }: MarketHeroesProps) => {
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
      <MarketHeroesSearchBar inventoryOnly={inventoryOnly} />
      <MarketHeroesEmptyList />
      <MarketHeroesList inventoryOnly={inventoryOnly} />
    </div>
  )
})

MarketHeroes.displayName = 'MarketHeroes'
