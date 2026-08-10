import clsx from 'clsx'
import { memo } from 'react'

import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { SelectGoldsBanner } from './components/SelectGoldsBanner'
import { SelectGoldsCardsWrapper } from './SelectGoldsCards.css'
import { SelectGoldsCardsList } from './SelectGoldsCardsList/SelectGoldsCardsList'
import { SelectGoldsSearchBar } from './SelectGoldsSearchBar/SelectGoldsSearchBar'
import { ViewSelectedCardsButton } from './ViewSelectedCardsButton/ViewSelectedCardsButton'

export const SelectGoldsCards = memo(() => {
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
        SelectGoldsCardsWrapper
      )}
    >
      <SelectGoldsBanner />
      <SelectGoldsSearchBar />
      <SelectGoldsCardsList />
      <ViewSelectedCardsButton />
    </div>
  )
})

SelectGoldsCards.displayName = 'SelectGoldsCards'
