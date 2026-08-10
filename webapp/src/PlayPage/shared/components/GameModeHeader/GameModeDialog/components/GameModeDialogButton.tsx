import clsx from 'clsx'
import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { push } from 'redux-first-history'

import { SoundClient } from '~/shared/clients'
import { AngledBox } from '~/shared/components/AngledBox/AngledBox'
import { Text } from '~/shared/components/Text'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { useImageIsLoaded } from '~/shared/hooks/ui/useImageIsLoaded'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useDispatch } from '~/shared/redux/index'
import { FadeInImageStyle } from '~/shared/style/FadeInImageStyle.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { GameModeDialogPageKeys } from '../../shared/types'
import {
  GameModeDialogButtonGradient,
  GameModeDialogButtonImage,
  GameModeDialogButtonStyle
} from './GameModeDialogButton.css'

interface GameModeDialogButtonProps {
  isActive: boolean
  page: GameModeDialogPageKeys
}

export const GameModeDialogButton = memo(
  ({ isActive, page }: GameModeDialogButtonProps) => {
    const { getAssetUrl } = useGetAssetContext()
    const { imgRef, isLoaded, handleLoad } = useImageIsLoaded()
    const { t } = useTranslation()
    const dispatch = useDispatch()

    const onClick = useCallback(() => {
      const route =
        page === 'RANKED'
          ? ROUTES_CONFIG.routes.PLAY.routes.RANKED.directPath
          : page === 'PRACTICE'
          ? ROUTES_CONFIG.routes.PLAY.routes.PRACTICE.routes.BOT.directPath
          : page === 'CONQUEST'
          ? ROUTES_CONFIG.routes.PLAY.routes.CONQUEST.directPath
          : null

      if (!!route) {
        SoundClient.playSound('JuicySwipeStingerCombo')
        dispatch(push(route))
      }
    }, [dispatch, page])

    return (
      <div
        className={clsx(Sprinkles({ cursor: 'pointer' }), GameModeDialogButtonStyle, {
          isActive
        })}
        onClick={onClick}
        onMouseEnter={() => SoundClient.playSound('CursorMainHover')}
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
                  Sprinkles({ opacity: isLoaded ? 1 : 0 }),
                  GameModeDialogButtonImage
                )}
                src={getAssetUrl(
                  `webapp/backgrounds/${page.toLowerCase()}small.webp`
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
                GameModeDialogButtonGradient,
                { isActive }
              )}
            />
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
                {t(`play.gameModes.header.${page}`)}
              </Text>
              <Text
                fontSize="18px"
                color={isActive ? 'white' : 'purple9'}
                fontFamily="condensed"
                fontWeight="500"
              >
                {t(`playPage.${page}.dialogText`)}
              </Text>
            </div>
          </div>
        </AngledBox>
      </div>
    )
  }
)

GameModeDialogButton.displayName = 'GameModeDialogButton'
