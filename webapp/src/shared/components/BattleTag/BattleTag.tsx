import { PlayerRank, PlayerRankStage } from '@opensky/proto'
import { FlagCodes } from '@opensky/shared/constants'
import { CrystalLibrary } from '@opensky/shared/cosmetics'
import clsx from 'clsx'
import { memo, useMemo } from 'react'

import { FlagIcon } from '~/shared/components/FlagIcon'
import { GameType } from '~/shared/constants/ranks'
import { Sprinkles } from '~/shared/style/Sprinkles.css'
import { THEME_COLORS } from '~/shared/style/Theme'

import { SkyTagTitle } from '../SkyTagTitle'
import {
  BattleTagInnerStyle,
  BattleTagLineDetail,
  BattleTagNameStyle,
  BattleTagWrapperStyle
} from './BattleTag.css'
import { BattleTagArt } from './components/BattleTagArt'
import { BattleTagRank } from './components/BattleTagRank'

interface BattleTagProps {
  name: string
  region?: FlagCodes
  frameType?: 'left' | 'center' | 'right'
  artUrl?: string
  isSmall?: boolean
  skyTagTitle?: number
  infoClassName?: string
  crystalID?: number
  onClick?: () => void
  rank?: {
    text: string
    playerRank: PlayerRank
    playerRankStage: PlayerRankStage
    mode: GameType
    rank?: number
  }
}

export const BattleTag = memo(
  ({
    name,
    frameType,
    region,
    rank,
    artUrl,
    isSmall,
    skyTagTitle,
    infoClassName,
    crystalID,
    onClick
  }: BattleTagProps) => {
    const isCenter = frameType === 'center'

    const rankColor = useMemo(() => {
      if (!rank?.mode) return THEME_COLORS.purple9
      if (rank.mode === GameType.CONSTRUCTED) {
        return 'rgb(165, 221, 213)'
      } else {
        return 'rgb(229, 145, 141)'
      }
    }, [rank?.mode])

    return (
      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            backgroundColor: isCenter ? 'purple4' : 'purple7',
            position: 'relative',
            cursor: onClick ? 'pointer' : undefined
          }),
          BattleTagWrapperStyle,
          {
            isLeft: frameType === 'left',
            isCenter,
            isSmall,
            isRight: frameType === 'right' || frameType === undefined
          }
        )}
        onClick={onClick}
      >
        <div
          className={clsx(
            Sprinkles({
              position: 'absolute',
              zIndex: 1,
              backgroundColor: 'purple4',
              top: 0,
              left: 0,
              width: 'full',
              height: 'full',
              display: 'flex',
              alignItems: 'center',
              justifyContent: frameType === 'left' ? 'flex-start' : 'flex-end',
              overflow: 'hidden'
            }),
            BattleTagInnerStyle,
            {
              isLeft: frameType === 'left',
              isCenter,
              isRight: frameType === 'right' || frameType === undefined
            }
          )}
        >
          <div
            className={clsx(
              Sprinkles({
                width: 'full',
                height: 'full',
                position: 'absolute',
                left: 0,
                top: 0,
                zIndex: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: frameType === 'left' ? 'flex-end' : 'flex-start'
              }),
              infoClassName
            )}
          >
            {!!rank && <BattleTagRank {...rank} />}
            <div
              className={Sprinkles({
                display: 'flex',
                alignItems: frameType === 'left' ? 'flex-end' : 'flex-start',
                justifyContent: 'center',
                flexDirection: 'column',
                paddingLeft: frameType === 'left' ? undefined : '8px',
                paddingRight: frameType === 'left' ? '8px' : undefined
              })}
            >
              <div
                className={Sprinkles({
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start'
                })}
              >
                <div
                  className={clsx(
                    Sprinkles({
                      fontSize: '18px',
                      fontWeight: '600',
                      fontFamily: 'normal'
                    }),
                    BattleTagNameStyle
                  )}
                  style={{
                    color: !!crystalID
                      ? CrystalLibrary.get(crystalID)?.color ?? THEME_COLORS.white
                      : THEME_COLORS.white
                  }}
                >
                  {name}
                </div>
                {!!region && (
                  <FlagIcon code={region} height="14px" marginLeft="8px" />
                )}
              </div>
              {!!skyTagTitle ? (
                <SkyTagTitle id={skyTagTitle} fontSize="12px" />
              ) : !!rank?.text ? (
                <div
                  className={Sprinkles({
                    fontFamily: 'normal',
                    fontSize: { base: '10px', tabletWide: '12px' }
                  })}
                  style={{
                    color: rankColor
                  }}
                >
                  {`${rank.text}${!!rank.rank ? ` #${rank.rank}` : ''}`}
                </div>
              ) : null}
            </div>
          </div>
          {!!artUrl && <BattleTagArt artUrl={artUrl} isSmall={isSmall} />}
          {!isCenter && (
            <div
              className={clsx(
                Sprinkles({
                  height: 'full',
                  position: 'absolute',
                  zIndex: 2
                }),
                BattleTagLineDetail,
                {
                  isLeft: frameType === 'left'
                }
              )}
            />
          )}
        </div>
      </div>
    )
  }
)

BattleTag.displayName = 'BattleTag'
