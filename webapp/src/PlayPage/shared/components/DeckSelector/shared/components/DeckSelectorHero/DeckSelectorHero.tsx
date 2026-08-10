import { DeckClass } from '@opensky/proto'
import clsx from 'clsx'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'

import { AngledBox } from '~/shared/components/AngledBox/AngledBox'
import { Icon } from '~/shared/components/Icon/Icon'
import { Text } from '~/shared/components/Text'
import { Tooltip } from '~/shared/components/Tooltip/Tooltip'
import { heroSkinFromDeckClass } from '~/shared/helpers/hero-skin-from-deck-class'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { DeckSelectorHeroDetailsTooltip } from './components/DeckSelectorHeroDetailsTooltip'
import {
  DeckSelectorHeroArrow,
  DeckSelectorHeroImageWrapper,
  DeckSelectorHeroLock,
  DeckSelectorHeroPrism,
  DeckSelectorHeroStyle,
  DeckSelectorHeroTextWrapper,
  DeckSelectorHeroTitle
} from './DeckSelectorHero.css'

interface DeckSelectorHeroProps {
  deckClass: DeckClass
  isLocked?: boolean
  isActive?: boolean
  onClick: (deckClass: DeckClass) => void
  isArrowVisible?: boolean
}

export const DeckSelectorHero = memo(
  ({
    deckClass,
    isLocked,
    isActive,
    onClick,
    isArrowVisible
  }: DeckSelectorHeroProps) => {
    const { getAssetUrl } = useGetAssetContext()
    const { t } = useTranslation()

    return (
      <Tooltip
        placement="right"
        tooltip={<DeckSelectorHeroDetailsTooltip deckClass={deckClass} />}
        className={Sprinkles({ width: 'full' })}
        offsetY={8}
      >
        <div
          className={Sprinkles({
            width: 'full',
            position: 'relative',
            cursor: 'pointer',
            pointerEvents: !!isLocked ? 'none' : 'all'
          })}
        >
          <div
            onClick={() => onClick(deckClass)}
            className={clsx(
              Sprinkles({
                position: 'relative',
                width: 'full'
              }),
              DeckSelectorHeroStyle,
              { isLocked }
            )}
          >
            <AngledBox
              borderSize="2px"
              cornerSize="8px"
              borderColor={isActive ? 'purple9' : 'purple5'}
              hoverBorderColor="purple9"
              backgroundColor="purple3"
            >
              <div
                className={Sprinkles({
                  width: 'full',
                  height: 'full',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  flexWrap: 'nowrap'
                })}
              >
                <div
                  className={clsx(
                    DeckSelectorHeroImageWrapper,
                    Sprinkles({ height: 'full', flexShrink: 0 })
                  )}
                >
                  {!!getAssetUrl && (
                    <img
                      src={getAssetUrl(
                        `webapp/heroes/thumbnails/${
                          heroSkinFromDeckClass(deckClass).base.artID
                        }.webp`
                      )}
                      className={Sprinkles({ width: 'full', height: 'full' })}
                    />
                  )}
                </div>
                <div
                  className={Sprinkles({
                    display: 'flex',
                    height: 'full',
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    zIndex: 3,
                    flexWrap: 'nowrap'
                  })}
                >
                  <div
                    className={clsx(
                      Sprinkles({
                        flexDirection: 'column',
                        display: 'flex',
                        height: 'full',
                        flex: 1,
                        justifyContent: 'center',
                        alignItems: 'flex-start',
                        flexWrap: 'nowrap',
                        overflow: 'hidden',
                        paddingLeft: '8px'
                      }),
                      DeckSelectorHeroTextWrapper
                    )}
                  >
                    <Text
                      fontFamily="condensed"
                      fontSize="18px"
                      color="white"
                      marginBottom="4px"
                      className={clsx(
                        DeckSelectorHeroTitle,
                        Sprinkles({ overflow: 'hidden' })
                      )}
                    >
                      {t(`createDeck.deckCodes.${deckClass}.name`)}
                    </Text>
                    <Text color="purple9" fontSize="12px">
                      {t(`createDeck.deckCodes.${deckClass}.abbreviatedPrisms`)}
                    </Text>
                  </div>
                </div>
                <div
                  className={clsx(
                    Sprinkles({
                      height: 'full',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginRight: !!isArrowVisible ? '32px' : '4px'
                    }),
                    DeckSelectorHeroPrism
                  )}
                >
                  {!!getAssetUrl && (
                    <img
                      className={Sprinkles({ width: 'full' })}
                      src={getAssetUrl(`webapp/icons/prisms/small/${deckClass}.webp`)}
                    />
                  )}
                </div>
                {!!isArrowVisible && (
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
                        backgroundColor: 'purple3',
                        borderLeft: '2px solid',
                        borderColor: 'purple5'
                      }),
                      DeckSelectorHeroArrow
                    )}
                  >
                    <Icon type="caret-down" height="12px" color="white" />
                  </div>
                )}
              </div>
            </AngledBox>
          </div>
          {isLocked && (
            <div
              className={clsx(
                Sprinkles({
                  position: 'absolute',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }),
                DeckSelectorHeroLock
              )}
            >
              <Icon type="lock-diamond" color="purple9" height={'32px'} />
            </div>
          )}
        </div>
      </Tooltip>
    )
  }
)

DeckSelectorHero.displayName = 'DeckSelectorHero'
