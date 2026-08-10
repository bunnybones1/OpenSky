import { CODE_PRISMS } from '@opensky/shared/constants'
import { CrystalLibrary } from '@opensky/shared/cosmetics'
import clsx from 'clsx'
import { memo, useMemo } from 'react'
import { Link } from 'react-router-dom'

import { DeckClass, MatchPlayer as MP } from '~/lib/proto'
import { Icon } from '~/shared/components/Icon/Icon'
import { IconTypes } from '~/shared/components/Icon/IconConfig'
import { Text } from '~/shared/components/Text'
import { PRISM_ICON_TYPES } from '~/shared/constants/cards'
import { heroSkinFromDeckClass } from '~/shared/helpers/hero-skin-from-deck-class'
import { makeNavigateToDeckBuilderRoute } from '~/shared/helpers/routes/deck-builder'
import { makeAccountRoute } from '~/shared/helpers/routes/general'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'
import { THEME_COLORS } from '~/shared/style/Theme'

import {
  MatchHistoryRowPlayerDeckStringLink,
  MatchHistoryRowPlayerHero,
  MatchHistoryRowPlayerLink,
  MatchHistoryRowPlayerTrophy
} from './MatchHistoryRowPlayer.css'

const getPrismIcons = (deckClass: DeckClass): IconTypes[] => {
  const prisms = CODE_PRISMS[deckClass]

  return prisms.map((prism) => {
    return PRISM_ICON_TYPES[prism]
  })
}

interface Props {
  player: MP
  direction: 'left' | 'right'
  isWinner: boolean
}

export const MatchHistoryRowPlayer = memo(
  ({ player, direction, isWinner }: Props) => {
    const { getAssetUrl } = useGetAssetContext()

    const crystalColor = useMemo(() => {
      if (!!player.crystalID) {
        return CrystalLibrary.get(player.crystalID)?.color
      }
      return null
    }, [player.crystalID])

    const prismIcons = useMemo(
      () => getPrismIcons(player.deckClass),
      [player.deckClass]
    )
    const isLeft = direction === 'left'

    return (
      <div
        className={Sprinkles({ width: 'full', height: 'full', position: 'relative' })}
      >
        <div
          className={Sprinkles({
            width: 'full',
            height: 'full',
            position: 'absolute',
            top: 0,
            display: 'flex',
            left: 0,
            zIndex: 2,
            flexDirection: isLeft ? 'row' : 'row-reverse',
            paddingLeft: isLeft ? '4px' : '0px',
            paddingRight: isLeft ? '0px' : '4px',
            justifyContent: 'flex-start',
            alignItems: 'center',
            flexWrap: 'nowrap'
          })}
        >
          <div
            className={Sprinkles({
              paddingY: '4px',
              paddingLeft: isLeft ? '0px' : '8px',
              paddingRight: isLeft ? '8px' : '0px'
            })}
          >
            <div
              className={clsx(
                Sprinkles({
                  overflow: 'hidden',
                  border: '1px solid',
                  borderColor: 'purple7'
                }),
                MatchHistoryRowPlayerHero
              )}
            >
              {!!getAssetUrl && (
                <img
                  src={getAssetUrl(
                    `webapp/heroes/thumbnails/${
                      heroSkinFromDeckClass(player.deckClass).base.artID
                    }.webp`
                  )}
                  className={Sprinkles({ height: 'full' })}
                />
              )}
            </div>
          </div>
          <div
            className={Sprinkles({
              height: 'full',
              flex: 1,
              flexDirection: 'column',
              display: 'flex',
              justifyContent: 'center',
              overflow: 'hidden',
              flexWrap: 'nowrap',
              alignItems: isLeft ? 'flex-start' : 'flex-end'
            })}
          >
            <Link
              to={makeAccountRoute(player.address)}
              className={clsx(
                Sprinkles({ overflow: 'hidden' }),
                MatchHistoryRowPlayerLink
              )}
            >
              <div
                className={Sprinkles({
                  width: 'full',
                  fontSize: '16px',
                  fontWeight: '700',
                  fontFamily: 'normal',
                  paddingBottom: '4px',
                  textAlign: isLeft ? 'left' : 'right'
                })}
                style={{
                  color: crystalColor || THEME_COLORS.purple9
                }}
              >
                {player.name}
              </div>
            </Link>
            <div
              className={Sprinkles({
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                width: 'full',
                flexDirection: isLeft ? 'row' : 'row-reverse'
              })}
            >
              {prismIcons[0] && (
                <div
                  className={Sprinkles({
                    marginRight: isLeft ? '4px' : '0px',
                    marginLeft: isLeft ? '0px' : '4px'
                  })}
                >
                  <Icon type={prismIcons[0]} height="16px" color="purple7" />
                </div>
              )}
              {prismIcons[1] && (
                <div
                  className={Sprinkles({
                    marginRight: isLeft ? '4px' : '0px',
                    marginLeft: isLeft ? '0px' : '4px'
                  })}
                >
                  <Icon
                    type={prismIcons[1]}
                    height="16px"
                    color={
                      prismIcons[1] === 'prism-intellect' ? 'purple8' : 'purple7'
                    }
                  />
                </div>
              )}
              <Link
                className={Sprinkles({
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: isLeft ? 'flex-start' : 'flex-end',
                  overflow: 'hidden'
                })}
                to={makeNavigateToDeckBuilderRoute({
                  prism: player.deckClass,
                  deckString: player.deckString
                })}
              >
                <Text
                  className={MatchHistoryRowPlayerDeckStringLink}
                  fontSize="14px"
                  color="purple7"
                >
                  {player.deckString}
                </Text>
              </Link>
            </div>
          </div>
        </div>
        {isWinner && (
          <div
            className={clsx(
              Sprinkles({
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'absolute',
                zIndex: 3,
                backgroundColor: 'warm6'
              }),
              { isLeft },
              MatchHistoryRowPlayerTrophy
            )}
          >
            <Icon type="trophy" height="12px" color="black" />
          </div>
        )}
      </div>
    )
  }
)

MatchHistoryRowPlayer.displayName = 'MatchHistoryRowPlayer'
