import { memo } from 'react'

import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { ItemsHeroesEmptyList } from './components/ItemsHeroesEmptyList'
import { ItemsHeroesList } from './ItemsHeroesList/ItemsHeroesList'
import { ItemsHeroesSearchBar } from './ItemsHeroesSearchBar/ItemsHeroesSearchBar'

export const ItemsHeroes = memo(() => {
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
      <ItemsHeroesSearchBar />
      <ItemsHeroesEmptyList />
      <ItemsHeroesList />
    </div>
  )
})

ItemsHeroes.displayName = 'ItemsHeroes'
