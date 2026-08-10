import clsx from 'clsx'
import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '~/shared/components/Button'
import { Text } from '~/shared/components/Text'
import { useDialog } from '~/shared/hooks/useDialog/useDialog'
import { useIsInQueue } from '~/shared/hooks/useIsInQueue'
import { FullWidthButtonStyle } from '~/shared/style/FullWidthButtonStyle.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { GameModeDialog } from './GameModeDialog/GameModeDialog'
import {
  GameModeDialogClassName,
  GameModeHeaderButtonWrapper
} from './GameModeHeader.css'
import { GameModeDialogPageKeys } from './shared/types'

const ButtonAdornment = { icon: 'caret-down' } as const

interface GameModeHeaderProps {
  title: string
  hideButton?: boolean
  page: GameModeDialogPageKeys
}

export const GameModeHeader = memo(
  ({ page, hideButton, title }: GameModeHeaderProps) => {
    const { t } = useTranslation()

    const dialogOptions = useMemo(() => {
      return {
        Element: GameModeDialog,
        id: 'GAME_MODE_DIALOG',
        activePage: page,
        className: GameModeDialogClassName,
        isCloseButtonDisabled: true,
        isBorderDisabled: true,
        isGlowDisabled: true
      }
    }, [page])

    const { Dialog, openDialog } = useDialog(dialogOptions)

    const _openDialog = useCallback(() => openDialog(), [openDialog])

    const { isInQueue } = useIsInQueue()

    return (
      <>
        <div
          className={Sprinkles({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start'
          })}
        >
          <Text
            color="white"
            fontSize={{ base: '40px', tabletWide: '50px' }}
            fontWeight={{ base: '500', tabletWide: '700' }}
            fontFamily="condensed"
          >
            {title}
          </Text>
          {!hideButton && (
            <div
              className={clsx(
                Sprinkles({ marginLeft: '20px' }),
                GameModeHeaderButtonWrapper
              )}
            >
              <Button
                className={FullWidthButtonStyle}
                buttonClassName={FullWidthButtonStyle}
                text={t('play.gameMode')}
                frameType="default"
                colorType="secondary"
                onClick={_openDialog}
                rightAdornment={ButtonAdornment}
                disabled={isInQueue}
              />
            </div>
          )}
        </div>
        {!hideButton && Dialog}
      </>
    )
  }
)

GameModeHeader.displayName = 'GameModeHeader'
