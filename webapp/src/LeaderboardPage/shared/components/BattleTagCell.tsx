import { PlayerRank, PlayerRankStage } from '@opensky/proto'
import { FlagCodes } from '@opensky/shared/constants'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { BattleTag } from '~/shared/components/BattleTag/BattleTag'
import { GameType } from '~/shared/constants/ranks'
import { useAccountTagArtUrl } from '~/shared/hooks/useAccountTagArtUrl'

interface BattleTagCellProps {
  playerRank: PlayerRank
  playerRankStage: PlayerRankStage
  rank?: number
  name: string
  skyTagTitle?: number
  mode: GameType
  region?: string
  tagArtId?: string
  crystalID?: number
}

export const BattleTagCell = memo(
  ({
    name,
    playerRank,
    playerRankStage,
    rank,
    mode,
    region,
    skyTagTitle,
    tagArtId,
    crystalID
  }: BattleTagCellProps) => {
    const { t } = useTranslation()

    const rankInfo = useMemo(() => {
      return {
        text: t(`ranks.${playerRank}`),
        playerRank,
        playerRankStage,
        mode,
        rank
      }
    }, [mode, playerRank, playerRankStage, rank, t])

    const tagArtUrl = useAccountTagArtUrl(tagArtId)

    return (
      <BattleTag
        region={region as FlagCodes | undefined}
        name={name}
        rank={rankInfo}
        skyTagTitle={skyTagTitle}
        artUrl={tagArtUrl?.raw}
        crystalID={crystalID}
      />
    )
  }
)

BattleTagCell.displayName = 'BattleTagCell'
