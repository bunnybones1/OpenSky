import clsx from 'clsx'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { GameType } from '~/shared/constants/ranks'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { DeckSelectorDialogHeroes } from './components/DeckSelectorDialogHeroes'
import {
  DeckSelectorDialogHeader,
  DeckSelectorDialogStyle
} from './DeckSelectorDialog.css'
import { DeckSelectorDialogDecks } from './DeckSelectorDialogDecks/DeckSelectorDialogDecks'

interface DeckSelectorDialogProps {
  selectedGameType: GameType
  isConquest?: boolean
}

export const DeckSelectorDialog = memo(
  ({ selectedGameType, isConquest }: DeckSelectorDialogProps) => {
    const { t } = useTranslation()

    return (
      <div
        className={clsx(
          Sprinkles({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            flexDirection: 'column',
            paddingX: '16px',
            paddingTop: '48px',
            position: 'relative'
          }),
          DeckSelectorDialogStyle
        )}
      >
        <div
          className={clsx(
            Sprinkles({
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 'full',
              fontFamily: 'condensed',
              fontWeight: '600',
              fontSize: '18px',
              borderBottom: '1px solid',
              borderColor: 'purple7',
              color: 'purple9',
              backgroundColor: 'purple2',
              position: 'absolute',
              left: 0,
              top: 0
            }),
            DeckSelectorDialogHeader
          )}
        >
          {t(`playPage.deckSelector.titles.${selectedGameType}`)}
        </div>
        {selectedGameType === GameType.DISCOVERY ? (
          <DeckSelectorDialogHeroes />
        ) : (
          <DeckSelectorDialogDecks isConquest={isConquest} />
        )}
      </div>
    )
  }
)

DeckSelectorDialog.displayName = 'DeckSelectorDialog'
