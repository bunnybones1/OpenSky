import { DeckClass } from '@opensky/proto'
import { BASE_HERO_SKINS, DECKCLASS_HEROES } from '@opensky/shared/constants'
import clsx from 'clsx'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { Text } from '~/shared/components/Text'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import {
  BottomHeroDetailsGradient,
  DeckSelectorHeroDetailsTooltipStyle,
  HeroDetailsTooltipBottomGradientWrapper,
  HeroDetailsTooltipDescWrapper,
  HeroDetailsToolTipGradientWrapper,
  HeroDetailsTooltipPrismImage,
  TopHeroDetailsGradient
} from './DeckSelectorHeroDetailsTooltip.css'

interface DeckSelectorHeroDetailsTooltipProps {
  deckClass: DeckClass
}

export const DeckSelectorHeroDetailsTooltip = memo(
  ({ deckClass }: DeckSelectorHeroDetailsTooltipProps) => {
    const { t } = useTranslation()
    const { getAssetUrl } = useGetAssetContext()

    return (
      <div
        className={clsx(
          Sprinkles({
            backgroundColor: 'purple3',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            flexWrap: 'nowrap',
            flexDirection: 'column',
            padding: '8px'
          }),
          DeckSelectorHeroDetailsTooltipStyle
        )}
      >
        <Text
          fontSize={{ base: '12px', tabletWide: '14px' }}
          marginBottom="8px"
          color="purple9"
        >
          {t('play.hero')}
        </Text>
        <div
          className={Sprinkles({
            width: 'full',
            height: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'flex-start'
          })}
        >
          <div
            className={clsx(
              Sprinkles({ width: 'full', position: 'relative', overflow: 'hidden' }),
              HeroDetailsToolTipGradientWrapper
            )}
          >
            <div
              className={clsx(
                Sprinkles({
                  width: 'full',
                  height: 'full',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  zIndex: 3
                }),
                TopHeroDetailsGradient
              )}
            />
            <div
              className={Sprinkles({
                width: 'full',
                position: 'absolute',
                top: 0,
                left: 0,
                zIndex: 2
              })}
            >
              {!!getAssetUrl && (
                <img
                  src={getAssetUrl(
                    `webapp/backgrounds/${
                      BASE_HERO_SKINS[DECKCLASS_HEROES[deckClass]].bgID
                    }.webp`
                  )}
                  className={Sprinkles({ width: 'full' })}
                />
              )}
            </div>
            <div
              className={clsx(
                Sprinkles({
                  width: 'full',
                  position: 'absolute',
                  left: 0,
                  zIndex: 4
                }),
                HeroDetailsTooltipBottomGradientWrapper
              )}
            >
              {!!getAssetUrl && (
                <img
                  src={getAssetUrl(
                    `webapp/heroes/art/4x/${
                      BASE_HERO_SKINS[DECKCLASS_HEROES[deckClass]].artID
                    }@4x.webp`
                  )}
                  className={Sprinkles({ width: 'full' })}
                />
              )}
            </div>
            <div
              className={clsx(
                Sprinkles({
                  width: 'full',
                  height: 'full',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  zIndex: 5
                }),
                BottomHeroDetailsGradient
              )}
            />
          </div>
          <div
            className={clsx(
              Sprinkles({
                width: 'full',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'flex-start',
                borderBottom: '1px solid',
                borderColor: 'purple5',
                paddingBottom: '4px',
                paddingLeft: '12px',
                flexWrap: 'nowrap'
              }),
              HeroDetailsTooltipDescWrapper
            )}
          >
            <div
              className={Sprinkles({
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                justifyContent: 'flex-start'
              })}
            >
              <Text
                fontSize={{ base: '14px', tabletWide: '18px' }}
                color="purple9"
                fontWeight={{ base: '400', tabletWide: '500' }}
              >
                {t(`createDeck.deckCodes.${deckClass}.prisms`)}
              </Text>
              <Text
                fontSize={{ base: '32px', tabletWide: '36px' }}
                fontFamily="condensed"
                color="purple9"
              >
                {t(`createDeck.deckCodes.${deckClass}.name`).toUpperCase()}
              </Text>
            </div>
            <div
              className={clsx(
                Sprinkles({ marginRight: '4px' }),
                HeroDetailsTooltipPrismImage
              )}
            >
              {!!getAssetUrl && (
                <img
                  src={getAssetUrl(`webapp/icons/prisms/small/${deckClass}.webp`)}
                  className={Sprinkles({ width: 'full', height: 'full' })}
                />
              )}
            </div>
          </div>
          <div
            className={Sprinkles({
              fontSize: { base: '14px', tabletWide: '18px' },
              marginTop: '12px',
              color: 'purple9',
              width: 'full',
              paddingLeft: '12px'
            })}
          >
            {t(`createDeck.deckCodes.${deckClass}.desc`)}
          </div>
        </div>
      </div>
    )
  }
)

DeckSelectorHeroDetailsTooltip.displayName = 'DeckSelectorHeroDetailsTooltip'
