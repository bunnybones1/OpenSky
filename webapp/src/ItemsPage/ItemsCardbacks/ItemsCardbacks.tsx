import { memo } from 'react'

import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { ItemsCardBacksEmptyList } from './components/ItemsCardBacksEmptyList'
import { ItemsCardBacksList } from './ItemsCardBacksList/ItemsCardBacksList'
import { ItemsHeroesSearchBar } from './ItemsCardbacksSearchBar/ItemsCardbacksSearchBar'

export const ItemsCardbacks = memo(() => {
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
      <ItemsCardBacksEmptyList />
      <ItemsCardBacksList />
    </div>
  )
})

ItemsCardbacks.displayName = 'ItemsCardbacks'
