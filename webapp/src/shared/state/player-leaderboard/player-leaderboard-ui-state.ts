import { proxy, subscribe } from 'valtio'

import { playerLeaderboardFilterState } from './player-leaderboard-filter-state'

interface PlayerLeaderboardUIState {
  pageIndex: number
  isPlayer: boolean
}

const DEFAULT_PLAYER_LEADERBOARD_UI_STATE: PlayerLeaderboardUIState = {
  pageIndex: 0,
  isPlayer: false
}

export const playerLeaderboardUIState = proxy<PlayerLeaderboardUIState>(
  DEFAULT_PLAYER_LEADERBOARD_UI_STATE
)

export const updatePlayerLeaderboardUI = <T extends keyof PlayerLeaderboardUIState>(
  key: T,
  value: PlayerLeaderboardUIState[T]
) => {
  playerLeaderboardUIState[key] = value
}

subscribe(playerLeaderboardFilterState, (ops) => {
  if (playerLeaderboardUIState.pageIndex !== 0) {
    playerLeaderboardUIState.pageIndex = 0
  }

  const filtersChanged = ops.flatMap((op) => op[1])

  if (
    !!playerLeaderboardUIState.isPlayer &&
    (filtersChanged.includes('playerRank') ||
      filtersChanged.includes('playerNamePrefix') ||
      filtersChanged.includes('region'))
  ) {
    playerLeaderboardUIState.isPlayer = false
  }
})
