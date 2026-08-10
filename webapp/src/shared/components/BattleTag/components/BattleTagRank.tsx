import { PlayerRank, PlayerRankStage } from '@opensky/proto'
import clsx from 'clsx'
import { memo, useMemo } from 'react'

import { GameType } from '~/shared/constants/ranks'
import { doesRankHaveStages } from '~/shared/helpers/account/does-rank-have-stages'
import { useImageIsLoaded } from '~/shared/hooks/ui/useImageIsLoaded'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { BattleTagRankImageStyle } from './BattleTagRank.css'

interface BattleTagRankProps {
  playerRank: PlayerRank
  playerRankStage: PlayerRankStage
  mode: GameType
  rank?: number
}

export const BattleTagRank = memo(
  ({ rank, playerRank, playerRankStage, mode }: BattleTagRankProps) => {
    const { getAssetUrl } = useGetAssetContext()
    const { imgRef, isLoaded, handleLoad } = useImageIsLoaded()

    const src = useMemo(() => {
      if (!getAssetUrl) return null
      const stage =
        !doesRankHaveStages(playerRank) ||
        playerRankStage === PlayerRankStage.STAGE_NONE
          ? ''
          : playerRankStage

      return getAssetUrl(
        `webapp/icons/${playerRank.toLowerCase()}${
          mode ? `-${mode.toLowerCase()}` : ''
        }${stage ? `-${stage.replace('_', '-').toLowerCase()}` : ''}.webp`
      )
    }, [getAssetUrl, mode, playerRank, playerRankStage])

    return (
      <div
        className={Sprinkles({
          height: 'full',
          paddingLeft: '8px',
          paddingTop: '4px',
          paddingBottom: '4px'
        })}
      >
        <div
          className={Sprinkles({
            width: 'full',
            height: 'full',
            position: 'relative'
          })}
        >
          {!!src && (
            <img
              src={src}
              ref={imgRef}
              onLoad={handleLoad}
              className={clsx(
                Sprinkles({ opacity: isLoaded ? 1 : 0, height: 'full' }),
                BattleTagRankImageStyle
              )}
            />
          )}
          {!!rank &&
            (playerRank === PlayerRank.GRANDWEAVER ||
              playerRank === PlayerRank.MASTER) && (
              <div
                className={Sprinkles({
                  width: 'full',
                  height: 'full',
                  position: 'absolute',
                  top: 0,
                  left: 0
                })}
              >
                <svg
                  viewBox="0 0 60 60"
                  height="100%"
                  width="100%"
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  xmlnsXlink="http://www.w3.org/1999/xlink"
                >
                  <text
                    x="50%"
                    y="50%"
                    fontSize="16"
                    dominantBaseline="middle"
                    textAnchor="middle"
                    fill="#fff"
                    strokeWidth="5"
                    stroke="#000"
                    paintOrder="stroke"
                    fontWeight="600"
                    fontFamily="Barlow Condensed"
                  >
                    {rank}
                  </text>
                  <text
                    x="50%"
                    y="50%"
                    fontSize="16"
                    dominantBaseline="middle"
                    textAnchor="middle"
                    fill="#fff"
                    fontWeight="600"
                    fontFamily="Barlow Condensed"
                  >
                    {rank}
                  </text>
                </svg>
              </div>
            )}
        </div>
      </div>
    )
  }
)

BattleTagRank.displayName = 'BattleTagRank'
