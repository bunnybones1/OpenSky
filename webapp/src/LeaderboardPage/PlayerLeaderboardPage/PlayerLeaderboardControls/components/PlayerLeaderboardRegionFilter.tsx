import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import { Select } from '~/shared/components/Select'
import { SelectOption } from '~/shared/components/SelectOption'
import { useAuthedAccount } from '~/shared/hooks/useAuthedAccount'
import {
  playerLeaderboardFilterState,
  updatePlayerLeaderboardFilter
} from '~/shared/state/player-leaderboard/player-leaderboard-filter-state'
import { playerLeaderboardUIState } from '~/shared/state/player-leaderboard/player-leaderboard-ui-state'

import { RegionFilterStyle } from './PlayerLeaderboardRegionFilter.css'

export const PlayerLeaderboardRegionFilter = memo(() => {
  const { region } = useSnapshot(playerLeaderboardFilterState)
  const { isPlayer } = useSnapshot(playerLeaderboardUIState)
  const { data: account } = useAuthedAccount()
  const { t } = useTranslation()

  const onChange = useCallback((value: string | undefined) => {
    if (value !== playerLeaderboardFilterState.region) {
      updatePlayerLeaderboardFilter('region', value)
    }
  }, [])

  if (!account?.region) return null

  return (
    <Select
      text={!region || isPlayer ? t('ranks.globalRegion') : t('ranks.yourRegion')}
      colorType="default"
      onChange={onChange}
      isDisabled={isPlayer}
      value={isPlayer ? undefined : region}
      className={RegionFilterStyle}
      optionsMatchParentWidth
    >
      <SelectOption text={t('ranks.globalRegion')} value={undefined} />
      <SelectOption text={t('ranks.yourRegion')} value={account?.region} />
    </Select>
  )
})

PlayerLeaderboardRegionFilter.displayName = 'PlayerLeaderboardRegionFilter'
