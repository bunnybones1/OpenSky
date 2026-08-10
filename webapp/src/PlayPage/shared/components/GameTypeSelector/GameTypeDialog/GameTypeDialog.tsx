import clsx from 'clsx'
import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { GameType } from '~/shared/constants/ranks'
import { useAuthedAccount } from '~/shared/hooks/useAuthedAccount'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { GameTypeDialogButton } from './components/GameTypeDialogButton'
import { GameTypeDialogHeader, GameTypeDialogStyle } from './GameTypeDialog.css'

interface GameTypeDialogProps {
  selectedGameType: GameType
  setSelectedGameType: (gameType: GameType) => void
}

export const GameTypeDialog = memo(
  ({ selectedGameType, setSelectedGameType }: GameTypeDialogProps) => {
    const { data: authedAccount } = useAuthedAccount()
    const { t } = useTranslation()
    const isDiscoveryLocked = !authedAccount?.level || authedAccount.level < 35

    const onClick = useCallback(
      (gameType: GameType) => {
        if (gameType !== selectedGameType) {
          setSelectedGameType(gameType)
        }
      },
      [selectedGameType, setSelectedGameType]
    )

    return (
      <div
        className={clsx(
          Sprinkles({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            flexDirection: 'column',
            borderRight: '1px solid',
            borderColor: 'purple7',
            paddingX: '16px',
            paddingTop: '48px',
            position: 'relative'
          }),
          GameTypeDialogStyle
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
            GameTypeDialogHeader
          )}
        >
          {t('playPage.gameTypeSelector.title')}
        </div>
        <GameTypeDialogButton
          gameType={GameType.CONSTRUCTED}
          isActive={selectedGameType === GameType.CONSTRUCTED}
          onClick={onClick}
        />
        <GameTypeDialogButton
          gameType={GameType.DISCOVERY}
          isActive={selectedGameType === GameType.DISCOVERY}
          onClick={onClick}
          isLocked={isDiscoveryLocked}
        />
      </div>
    )
  }
)

GameTypeDialog.displayName = 'GameTypeDialog'
