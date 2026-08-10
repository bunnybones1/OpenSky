import { memo, useMemo } from 'react'

import { PlayerRank, PlayerRankStage } from '~/lib/proto'
import { Asset } from '~/shared/components/Asset'
import { FlexBox } from '~/shared/components/Base/FlexBox'
import { GameType } from '~/shared/constants/ranks'

import { doesRankHaveStages } from '../helpers/account/does-rank-have-stages'

interface Props {
  playerRank: PlayerRank
  playerRankStage: PlayerRankStage
  rank?: number | undefined
  mode?: GameType
  useHeight?: boolean
}

export const RankBadge = memo(
  ({ playerRank, playerRankStage, mode, rank, useHeight }: Props) => {
    const stage = useMemo(
      () =>
        !doesRankHaveStages(playerRank) ||
        playerRankStage === PlayerRankStage.STAGE_NONE
          ? ''
          : playerRankStage,
      [playerRank, playerRankStage]
    )

    return (
      <FlexBox position="relative" width="100%" height="100%" type="centered-row">
        <Asset
          url={`webapp/icons/${playerRank.toLowerCase()}${
            mode ? `-${mode.toLowerCase()}` : ''
          }${stage ? `-${stage.replace('_', '-').toLowerCase()}` : ''}.webp`}
          style={{
            width: useHeight ? 'auto' : '100%',
            height: useHeight ? '100%' : 'auto'
          }}
        />
        {rank &&
          (playerRank === PlayerRank.MASTER ||
            playerRank === PlayerRank.GRANDWEAVER) && (
            <FlexBox
              position="absolute"
              top={0}
              left={0}
              type="centered-row"
              width="100%"
              height="100%"
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
                >
                  {rank}
                </text>
              </svg>
            </FlexBox>
          )}
      </FlexBox>
    )
  }
)

RankBadge.displayName = 'RankBadge'
