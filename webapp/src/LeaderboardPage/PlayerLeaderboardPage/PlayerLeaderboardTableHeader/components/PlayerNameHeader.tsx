import { debounce } from 'lodash-es'
import { memo, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSnapshot } from 'valtio'

import { Input } from '~/shared/components/Input/Input'
import {
  playerLeaderboardFilterState,
  updatePlayerLeaderboardFilter
} from '~/shared/state/player-leaderboard/player-leaderboard-filter-state'
import { playerLeaderboardUIState } from '~/shared/state/player-leaderboard/player-leaderboard-ui-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { PlayerNameInputStyle } from './PlayerNameHeader.css'

export const PlayerNameHeader = memo(() => {
  const { playerNamePrefix } = useSnapshot(playerLeaderboardFilterState)
  const { isPlayer } = useSnapshot(playerLeaderboardUIState)
  const [search, setSearch] = useState(playerNamePrefix || '')
  const { t } = useTranslation()
  const updateSearch = useCallback((value: string) => {
    updatePlayerLeaderboardFilter('playerNamePrefix', value)
  }, [])

  const debouncedUpdateSearch = useMemo(
    () => debounce(updateSearch, 400),
    [updateSearch]
  )

  const onChange = useCallback(
    (value: string) => {
      if (!value) {
        updatePlayerLeaderboardFilter('playerNamePrefix', undefined)
      } else {
        debouncedUpdateSearch(value)
      }
      setSearch(value)
    },
    [debouncedUpdateSearch]
  )

  const onClear = useCallback(() => {
    updatePlayerLeaderboardFilter('playerNamePrefix', undefined)
    setSearch('')
  }, [])

  return (
    <div
      className={Sprinkles({
        width: 'full',
        height: 'full',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingLeft: '12px'
      })}
    >
      <Input
        disabled={isPlayer}
        placeholder={t('account.PlayerName')}
        leftIcon={{ type: 'search' }}
        onChange={onChange}
        value={search}
        onClear={onClear}
        inputClassname={PlayerNameInputStyle}
        inputId="player-name"
      />
    </div>
  )
})

PlayerNameHeader.displayName = 'PlayerNameHeader'
