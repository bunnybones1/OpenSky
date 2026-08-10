import clsx from 'clsx'
import { memo } from 'react'

import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { SelectSilversBanner } from './components/SelectSilversBanner'
import { SelectSilversCardsWrapper } from './SelectSilversCards.css'
import { SelectSilversCardsList } from './SelectSilversCardsList/SelectSilversCardsList'
import { SelectSilversSearchBar } from './SelectSilversSearchBar/SelectSilversSearchBar'
import { ViewSelectedCardsButton } from './ViewSelectedCardsButton/ViewSelectedCardsButton'

export const SelectSilversCards = memo(() => {
  return (
    <div
      className={clsx(
        Sprinkles({
          width: 'full',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          flexDirection: 'column',
          position: 'relative'
        }),
        SelectSilversCardsWrapper
      )}
    >
      <SelectSilversBanner />
      <SelectSilversSearchBar />
      <SelectSilversCardsList />
      <ViewSelectedCardsButton />
    </div>
  )
})

SelectSilversCards.displayName = 'SelectSilversCards'
