import { memo } from 'react'

import { GameMode, PlayerRank, PlayerRankStage } from '~/lib/proto'
import { Asset } from '~/shared/components/Asset'
import { Box } from '~/shared/components/Base/Box'
import { FlexBox } from '~/shared/components/Base/FlexBox'

import { FeedItemGlow } from '../shared/components/FeedItemGlow'

interface Props {
  rank: PlayerRank
  rankStage?: PlayerRankStage
  mode: GameMode
}

export const RankUp = memo(({ rank, mode, rankStage }: Props) => (
  <Box width="100%" height="100%" position="relative">
    <FlexBox
      width="100%"
      height="100%"
      type="centered-row"
      position="absolute"
      left={0}
      top={0}
      zIndex={2}
    >
      <Box height="100%" py={1}>
        <Asset
          style={{
            height: '90%'
          }}
          url={`webapp/icons/${rank.toLowerCase()}-${
            mode === GameMode.RANKED_CONSTRUCTED ? 'constructed' : 'discovery'
          }${
            !!rankStage && rankStage !== PlayerRankStage.STAGE_NONE
              ? `-${rankStage.toLowerCase().replace('_', '-')}`
              : ''
          }.webp`}
        />
      </Box>
    </FlexBox>
    <FeedItemGlow />
  </Box>
))

RankUp.displayName = 'RankUp'
