import clsx from 'clsx'
import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { SoundClient } from '~/shared/clients'
import { AngledBox } from '~/shared/components/AngledBox/AngledBox'
import { Icon } from '~/shared/components/Icon/Icon'
import { Text } from '~/shared/components/Text'
import { Tooltip } from '~/shared/components/Tooltip/Tooltip'
import { GameType } from '~/shared/constants/ranks'
import { controlDialog } from '~/shared/hooks/useDialog/control-dialog'
import { useDialog } from '~/shared/hooks/useDialog/useDialog'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { GameTypeDialog } from './GameTypeDialog/GameTypeDialog'
import {
  GameTypeDialogClassName,
  GameTypeSelectorAngledBox,
  GameTypeSelectorArrowWrapper,
  GameTypeSelectorGradient,
  GameTypeSelectorIcon,
  GameTypeSelectorLock,
  GameTypeSelectorStyle
} from './GameTypeSelector.css'

interface GameTypeSelectorProps {
  selectedGameType: GameType
  onGameTypeChange: (gameType: GameType) => void
  isLocked?: boolean
}

export const GameTypeSelector = memo(
  ({ selectedGameType, onGameTypeChange, isLocked }: GameTypeSelectorProps) => {
    const { t } = useTranslation()
    const { getAssetUrl } = useGetAssetContext()

    const setSelectedGameType = useCallback(
      (gameType: GameType) => {
        onGameTypeChange(gameType)
        const { closeDialog } = controlDialog('GAME_TYPE_DIALOG')
        closeDialog()
      },
      [onGameTypeChange]
    )

    const dialogOptions = useMemo(() => {
      return {
        Element: GameTypeDialog,
        id: 'GAME_TYPE_DIALOG',
        selectedGameType,
        setSelectedGameType,
        className: GameTypeDialogClassName,
        isCloseButtonDisabled: true,
        isBorderDisabled: true,
        isGlowDisabled: true
      }
    }, [selectedGameType, setSelectedGameType])

    const { Dialog, openDialog } = useDialog(dialogOptions)

    const _openDialog = useCallback(() => openDialog(), [openDialog])

    return (
      <>
        <Tooltip
          tooltip={isLocked ? t('playPage.lockedWhileQueued') : undefined}
          placement="top-start"
        >
          <div
            className={clsx(
              Sprinkles({
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
                position: 'relative',
                pointerEvents: isLocked ? 'none' : 'all'
              }),
              GameTypeSelectorStyle,
              { isLocked }
            )}
            onClick={_openDialog}
            onMouseEnter={() => {
              if (!isLocked) SoundClient.playSound('CursorMainHover')
            }}
          >
            <>
              {!!isLocked && (
                <div
                  className={clsx(
                    Sprinkles({
                      position: 'absolute',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 3
                    }),
                    GameTypeSelectorLock
                  )}
                >
                  <Icon type="lock-diamond" color="purple9" height={'32px'} />
                </div>
              )}
              <AngledBox
                borderSize="2px"
                cornerSize="8px"
                borderColor="purple5"
                hoverBorderColor="purple9"
                backgroundColor="purple1"
                className={clsx(GameTypeSelectorAngledBox, { isLocked })}
              >
                <div
                  className={Sprinkles({
                    width: 'full',
                    height: 'full',
                    position: 'relative',
                    left: 0,
                    top: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  })}
                >
                  {!!getAssetUrl && (
                    <img
                      src={getAssetUrl(
                        `webapp/backgrounds/${selectedGameType.toLowerCase()}-row.webp`
                      )}
                      className={Sprinkles({
                        width: 'full',
                        height: 'full',
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        zIndex: 1
                      })}
                    />
                  )}
                  <div
                    className={clsx(
                      Sprinkles({
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        width: 'full',
                        height: 'full',
                        zIndex: 2
                      }),
                      GameTypeSelectorGradient
                    )}
                  />
                  <div
                    className={Sprinkles({
                      zIndex: 3,
                      position: 'absolute',
                      width: 'full',
                      height: 'full',
                      justifyContent: 'flex-start',
                      paddingLeft: '12px',
                      alignItems: 'center',
                      display: 'flex',
                      flexDirection: 'row',
                      top: 0,
                      left: 0
                    })}
                  >
                    {!!getAssetUrl && (
                      <img
                        src={getAssetUrl(
                          `/webapp/icons/${selectedGameType.toLowerCase()}-icon.webp`
                        )}
                        className={clsx(
                          Sprinkles({ marginRight: '8px' }),
                          GameTypeSelectorIcon
                        )}
                      />
                    )}
                    <Text
                      color="purple9"
                      fontSize="18px"
                      fontWeight="700"
                      fontFamily="condensed"
                    >
                      {t(`gameMode.${selectedGameType}`)}
                    </Text>
                    <div
                      className={clsx(
                        Sprinkles({
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'absolute',
                          height: 'full',
                          zIndex: 3,
                          top: 0,
                          right: 0,
                          backgroundColor: 'purple2',
                          borderLeft: '2px solid',
                          borderColor: 'purple5'
                        }),
                        GameTypeSelectorArrowWrapper
                      )}
                    >
                      <Icon type="caret-down" height="12px" color="white" />
                    </div>
                  </div>
                </div>
              </AngledBox>
            </>
          </div>
        </Tooltip>

        {Dialog}
      </>
    )
  }
)

GameTypeSelector.displayName = 'GameTypeSelector'
