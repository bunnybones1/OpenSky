import { GameMode, PlayerRank } from '@opensky/proto'
import { memo, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import { ToggleButton } from '~/shared/components/ToggleButton'
import { ToggleButtonGroup } from '~/shared/components/ToggleButtonGroup'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import {
  playerLeaderboardFilterState,
  updatePlayerLeaderboardFilter
} from '~/shared/state/player-leaderboard/player-leaderboard-filter-state'
import { playerLeaderboardUIState } from '~/shared/state/player-leaderboard/player-leaderboard-ui-state'

import { RanksToggleButtonStyle } from './PlayerLeaderboardRanksFilter.css'

const VALID_RANKS = [
  PlayerRank.TRAINEE,
  PlayerRank.APPRENTICE,
  PlayerRank.EXPERT,
  PlayerRank.MASTER,
  PlayerRank.GRANDWEAVER
] as const

export const PlayerLeaderboardRanksFilter = memo(() => {
  const { playerRank, gameMode } = useSnapshot(playerLeaderboardFilterState)
  const { isPlayer } = useSnapshot(playerLeaderboardUIState)
  const { t } = useTranslation()
  const { getAssetUrl } = useGetAssetContext()

  const onChange = useCallback((value: PlayerRank) => {
    if (value !== playerLeaderboardFilterState.playerRank) {
      updatePlayerLeaderboardFilter('playerRank', value)
    }
  }, [])

  const adornments = useMemo(() => {
    const modeKey =
      // eslint-disable-next-line valtio/state-snapshot-rule
      gameMode === GameMode.RANKED_CONSTRUCTED ? 'constructed' : 'discovery'

    return VALID_RANKS.reduce(
      (prev, curr) => {
        return {
          ...prev,
          [curr]: {
            image: !!getAssetUrl
              ? getAssetUrl(`webapp/icons/${curr.toLowerCase()}-${modeKey}.webp`)
              : undefined
          }
        }
      },
      {} as { [key in (typeof VALID_RANKS)[number]]: { image: string } }
    )
  }, [gameMode, getAssetUrl])

  return (
    <ToggleButtonGroup
      onChange={onChange}
      value={isPlayer ? undefined : playerRank}
      colorType="default"
      height="36px"
    >
      <ToggleButton
        value={PlayerRank.TRAINEE}
        leftAdornment={adornments?.TRAINEE}
        tooltip={t(`ranks.${PlayerRank.TRAINEE}`)}
        iconHeight="32px"
        className={RanksToggleButtonStyle}
        disabled={isPlayer}
      />
      <ToggleButton
        value={PlayerRank.APPRENTICE}
        leftAdornment={adornments?.APPRENTICE}
        tooltip={t(`ranks.${PlayerRank.APPRENTICE}`)}
        iconHeight="32px"
        className={RanksToggleButtonStyle}
        disabled={isPlayer}
      />
      <ToggleButton
        value={PlayerRank.EXPERT}
        leftAdornment={adornments?.EXPERT}
        tooltip={t(`ranks.${PlayerRank.EXPERT}`)}
        iconHeight="32px"
        className={RanksToggleButtonStyle}
        disabled={isPlayer}
      />
      <ToggleButton
        value={PlayerRank.MASTER}
        leftAdornment={adornments?.MASTER}
        tooltip={t(`ranks.${PlayerRank.MASTER}`)}
        iconHeight="32px"
        className={RanksToggleButtonStyle}
        disabled={isPlayer}
      />
      <ToggleButton
        value={PlayerRank.GRANDWEAVER}
        leftAdornment={adornments?.GRANDWEAVER}
        tooltip={t(`ranks.${PlayerRank.GRANDWEAVER}`)}
        iconHeight="32px"
        className={RanksToggleButtonStyle}
        disabled={isPlayer}
      />
    </ToggleButtonGroup>
  )
})

PlayerLeaderboardRanksFilter.displayName = 'PlayerLeaderboardRanksFilter'
