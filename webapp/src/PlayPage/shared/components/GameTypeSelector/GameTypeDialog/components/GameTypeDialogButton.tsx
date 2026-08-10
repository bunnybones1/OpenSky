import clsx from 'clsx'
import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { AngledBox } from '~/shared/components/AngledBox/AngledBox'
import { Text } from '~/shared/components/Text'
import { GameType } from '~/shared/constants/ranks'
import { useImageIsLoaded } from '~/shared/hooks/ui/useImageIsLoaded'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { FadeInImageStyle } from '~/shared/style/FadeInImageStyle.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  GameTypeDialogButtonGradient,
  GameTypeDialogButtonStyle,
  GameTypeDialogLockContainer
} from './GameTypeDialogButton.css'

interface GameTypeDialogButtonProps {
  isActive: boolean
  gameType: GameType
  onClick: (gameType: GameType) => void
  isLocked?: boolean
}

export const GameTypeDialogButton = memo(
  ({ isActive, gameType, onClick, isLocked }: GameTypeDialogButtonProps) => {
    const { getAssetUrl } = useGetAssetContext()
    const { imgRef, isLoaded, handleLoad } = useImageIsLoaded()
    const { t } = useTranslation()

    const _onClick = useCallback(() => {
      onClick(gameType)
    }, [gameType, onClick])

    return (
      <div
        className={clsx(
          Sprinkles({
            cursor: 'pointer',
            width: 'full',
            pointerEvents: isLocked ? 'none' : 'all'
          }),
          GameTypeDialogButtonStyle,
          {
            isActive
          }
        )}
        onClick={_onClick}
      >
        <AngledBox
          cornerSize="12px"
          borderSize="2px"
          borderColor={isActive ? 'purple9' : 'purple5'}
          backgroundColor="transparent"
          hoverBorderColor="purple9"
        >
          <div
            className={Sprinkles({
              width: 'full',
              height: 'full',
              position: 'relative'
            })}
          >
            {!!getAssetUrl && (
              <img
                ref={imgRef}
                onLoad={handleLoad}
                className={clsx(
                  FadeInImageStyle,
                  Sprinkles({ width: 'full', opacity: isLoaded ? 1 : 0 })
                )}
                src={getAssetUrl(
                  `webapp/backgrounds/${gameType.toLowerCase()}withlogo.webp`
                )}
              />
            )}
            <div
              className={clsx(
                Sprinkles({
                  width: 'full',
                  height: 'full',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  pointerEvents: 'none',
                  zIndex: 1
                }),
                GameTypeDialogButtonGradient,
                { isActive, isLocked }
              )}
            />
            {isLocked && (
              <div
                className={clsx(
                  Sprinkles({
                    position: 'absolute',
                    right: 0,
                    zIndex: 3
                  }),
                  GameTypeDialogLockContainer
                )}
              >
                {!!getAssetUrl && (
                  <img
                    src={getAssetUrl('webapp/misc/card-lock-no-padding.webp')}
                    className={Sprinkles({ height: 'full' })}
                  />
                )}
              </div>
            )}
            <div
              className={Sprinkles({
                position: 'absolute',
                left: 0,
                top: 0,
                zIndex: 2,
                width: 'full',
                height: 'full',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'flex-end',
                flexDirection: 'column',
                flexWrap: 'nowrap',
                paddingLeft: '16px',
                paddingBottom: '16px'
              })}
            >
              <Text
                color={isActive ? 'white' : 'purple9'}
                fontSize="26px"
                marginBottom="4px"
                fontFamily="condensed"
                fontWeight="600"
              >
                {t(`gameMode.${gameType}`)}
              </Text>
              <Text
                fontSize="18px"
                color={isActive ? 'white' : 'purple9'}
                fontFamily="condensed"
                fontWeight="500"
              >
                {isLocked && gameType === GameType.DISCOVERY
                  ? t('playPage.gameTypeSelector.buttonDescriptions.DISCOVERY-locked')
                  : t(`playPage.gameTypeSelector.buttonDescriptions.${gameType}`)}
              </Text>
            </div>
          </div>
        </AngledBox>
      </div>
    )
  }
)

GameTypeDialogButton.displayName = 'GameTypeDialogButton'
