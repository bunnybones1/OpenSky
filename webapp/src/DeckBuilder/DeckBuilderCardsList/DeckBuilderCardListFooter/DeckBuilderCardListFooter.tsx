import { memo } from 'react'

import { deckBuilderUUIDSelector } from '~/DeckBuilder/shared/selectors'
import { useSelector } from '~/shared/redux'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { DeckBuilderCreateButton } from './components/DeckBuilderCreateButton'
import { DeckBuilderSaveButton } from './components/DeckBuilderSaveButton'

export const DeckBuilderCardListFooter = memo(() => {
  const uuid = useSelector(deckBuilderUUIDSelector)

  return (
    <div
      className={Sprinkles({
        width: 'full',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        padding: '8px'
      })}
    >
      {!!uuid && <DeckBuilderSaveButton />}
      {!uuid && <DeckBuilderCreateButton />}
    </div>
  )
})

DeckBuilderCardListFooter.displayName = 'DeckBuilderCardListFooter'
