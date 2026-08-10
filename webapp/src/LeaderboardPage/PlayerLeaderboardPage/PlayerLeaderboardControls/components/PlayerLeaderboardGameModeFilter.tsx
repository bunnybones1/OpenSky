import { GameMode } from '@opensky/proto'
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

export const PlayerLeaderboardGameModeFilter = memo(() => {
  const { gameMode } = useSnapshot(playerLeaderboardFilterState)
  const { getAssetUrl } = useGetAssetContext()

  const { t } = useTranslation()

  const adornments = useMemo(() => {
    if (!getAssetUrl) return
    return {
      contructed: { image: getAssetUrl(`webapp/icons/constructed-icon.webp`) },
      discovery: { image: getAssetUrl(`webapp/icons/discovery-icon.webp`) }
    }
  }, [getAssetUrl])

  const onChange = useCallback(
    (value: GameMode) => {
      if (value !== gameMode) {
        updatePlayerLeaderboardFilter('gameMode', value)
      }
    },
    [gameMode]
  )

  return (
    <ToggleButtonGroup
      height="36px"
      onChange={onChange}
      value={gameMode}
      colorType="default"
    >
      <ToggleButton
        leftAdornment={adornments?.contructed}
        value={GameMode.RANKED_CONSTRUCTED}
        text={t('ranks.constructedMode')}
      />
      <ToggleButton
        text={t('ranks.discoveryMode')}
        leftAdornment={adornments?.discovery}
        value={GameMode.RANKED_DISCOVERY}
      />
    </ToggleButtonGroup>
  )
})

PlayerLeaderboardGameModeFilter.displayName = 'PlayerLeaderboardGameModeFilter'
