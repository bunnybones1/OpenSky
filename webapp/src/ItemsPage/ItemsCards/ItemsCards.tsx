import { memo } from 'react'

import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { EmptyItemsCards } from './components/EmptyItemsCards'
import { ItemsCardsList } from './ItemsCardsList/ItemsCardsList'
import { ItemsCardsSearchBar } from './ItemsCardsSearchBar/ItemsCardsSearchBar'

export const ItemsCards = memo(() => {
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
      <ItemsCardsSearchBar />
      <EmptyItemsCards />
      <ItemsCardsList />
    </div>
  )
})

ItemsCards.displayName = 'ItemsCards'
