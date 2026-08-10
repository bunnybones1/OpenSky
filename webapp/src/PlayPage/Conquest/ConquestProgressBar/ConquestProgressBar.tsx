import clsx from 'clsx'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import {
  SharedProgressBarBorder,
  SharedProgressBarGradient
} from '~/PlayPage/shared/style/SharedPlayPageStyle.css'
import { Icon } from '~/shared/components/Icon/Icon'
import { Text } from '~/shared/components/Text'
import { Tooltip } from '~/shared/components/Tooltip/Tooltip'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useConquestProgress } from '~/shared/queries/useConquestProgress'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { ConquestProgressBarTooltip } from './components/ConquestProgressBarTooltip'
import {
  ConquestProgressBarBar,
  ConquestProgressBarInfoWrapper,
  ConquestProgressBarInner,
  ConquestProgressBarLevel10Grid,
  ConquestProgressBarRedBar,
  ConquestProgressBarStyle,
  ConquestProgressBarTick
} from './ConquestProgressBar.css'
import { ConquestTreasureImage } from './ConquestTreasureImage/ConquestTreasureImage'
import { MAX_CONQUEST_TREASURE_LEVEL } from './shared/constants'

export const ConquestProgressBar = memo(() => {
  const { t } = useTranslation()
  const { getAssetUrl } = useGetAssetContext()

  const { data: conquestProgress } = useConquestProgress()

  const treasureLevel = conquestProgress?.treasureLevel || 0
  const treasurePoints = conquestProgress?.treasurePoints || 0
  const treasurePointsRequired =
    (conquestProgress?.treasurePointsRequired || 0) + treasurePoints

  const isMaxLevel = treasureLevel === MAX_CONQUEST_TREASURE_LEVEL

  if (!isMaxLevel) {
    return (
      <div
        className={clsx(
          Sprinkles({
            display: 'grid',
            position: 'relative',
            width: 'full',
            alignItems: 'center'
          }),
          ConquestProgressBarStyle
        )}
      >
        <ConquestTreasureImage level={treasureLevel} />
        <div className={Sprinkles({ position: 'relative', width: 'full' })}>
          <div
            className={Sprinkles({
              position: 'relative',
              width: 'full',
              marginTop: '4px'
            })}
          >
            <div
              onContextMenu={(e) => e.preventDefault()}
              className={clsx(
                Sprinkles({
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  position: 'absolute',
                  left: 0
                }),
                ConquestProgressBarInfoWrapper
              )}
            >
              <Tooltip tooltip={<ConquestProgressBarTooltip />}>
                <div
                  className={Sprinkles({
                    justifyContent: 'flex-start',
                    alignItems: 'center',
                    display: 'flex'
                  })}
                >
                  {!!getAssetUrl && (
                    <img
                      src={getAssetUrl(`webapp/icons/petal.webp`)}
                      style={{
                        width: '16px',
                        height: '16px',
                        marginRight: '4px',
                        zIndex: 10
                      }}
                    />
                  )}
                  <Text
                    fontWeight="700"
                    fontSize={{ base: '10px', tabletWide: '12px' }}
                    color="white"
                  >
                    {t('playPage.conquestTreasureProgress', {
                      points: treasurePoints,
                      requiredPoints: treasurePointsRequired
                    })}
                  </Text>
                  <Icon
                    marginLeft="4px"
                    type="info-empty"
                    height="12px"
                    color="purple9"
                  />
                </div>
              </Tooltip>
            </div>

            <div
              className={clsx(
                Sprinkles({
                  width: 'full',
                  border: '1px solid',
                  borderColor: 'purple7',
                  backgroundColor: 'purple2'
                }),
                SharedProgressBarBorder
              )}
            />
            <div
              className={clsx(
                Sprinkles({
                  position: 'absolute',
                  top: 0,
                  width: 'full',
                  zIndex: 2
                }),
                SharedProgressBarGradient
              )}
            />
          </div>
          <div
            className={clsx(
              Sprinkles({
                width: 'full',
                position: 'absolute',
                zIndex: 3,
                backgroundColor: 'purple4'
              }),
              ConquestProgressBarBar
            )}
          >
            <div
              className={clsx(
                Sprinkles({
                  position: 'absolute',
                  height: 'full',
                  zIndex: 1
                }),
                ConquestProgressBarInner
              )}
            />
            <div
              style={{
                width: `calc(${
                  (treasurePoints / treasurePointsRequired) * 100
                }% - 4px)`
              }}
              className={clsx(
                Sprinkles({
                  position: 'absolute',
                  zIndex: 2,
                  height: 'full'
                }),
                ConquestProgressBarRedBar
              )}
            />
            <div
              className={clsx(
                Sprinkles({
                  position: 'absolute',
                  zIndex: 3,
                  backgroundColor: 'white'
                }),
                ConquestProgressBarTick
              )}
              style={{
                left: `calc(${
                  (treasurePoints / treasurePointsRequired) * 100
                }% - 1px)`
              }}
            />
          </div>
        </div>
        {!isMaxLevel && <ConquestTreasureImage level={treasureLevel + 1} />}
      </div>
    )
  } else {
    return (
      <div
        className={clsx(
          Sprinkles({
            display: 'grid',
            position: 'relative',
            width: 'full',
            alignItems: 'center'
          }),
          ConquestProgressBarLevel10Grid
        )}
      >
        <ConquestTreasureImage level={MAX_CONQUEST_TREASURE_LEVEL} />
        <div className={Sprinkles({ display: 'flex', flexDirection: 'column' })}>
          <Text color="white" fontWeight="700">
            {t('play.gameModes.CONQUEST.level10')}
          </Text>
          <Text color="purple8" fontWeight="500">
            {t('play.gameModes.CONQUEST.unlockMore')}
          </Text>
          <Text color="purple8" fontWeight="500">
            {t('play.gameModes.CONQUEST.collectTreasure')}
          </Text>
        </div>
      </div>
    )
  }
})

ConquestProgressBar.displayName = 'ConquestProgressBar'
