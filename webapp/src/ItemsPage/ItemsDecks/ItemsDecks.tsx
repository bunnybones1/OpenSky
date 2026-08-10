import { memo } from 'react'

import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { ItemsDecksList } from './ItemsDecksList/ItemsDecksList'
import { ItemsDecksSearchBar } from './ItemsDecksSearchBar/ItemsDecksSearchBar'

export const ItemsDecks = memo(() => {
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
      <ItemsDecksSearchBar />
      <ItemsDecksList />
    </div>
  )
})

ItemsDecks.displayName = 'ItemsDecks'
