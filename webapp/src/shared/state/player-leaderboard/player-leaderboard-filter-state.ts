import { GameMode, PlayerRank } from '@opensky/proto'
import { produce } from 'immer'
import { matchPath } from 'react-router-dom'
import { proxy } from 'valtio'

import { APIClient } from '~/shared/clients'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { UsePlayerLeaderboardArgs } from '~/shared/types/leaderboard'

export const DEFAULT_PLAYER_LEADERBOARD_FILTERS: UsePlayerLeaderboardArgs = {
  gameMode: GameMode.RANKED_CONSTRUCTED,
  playerRank: PlayerRank.GRANDWEAVER,
  season: undefined,
  playerNamePrefix: undefined,
  region: undefined
}

const instantiateState = () => {
  const match = matchPath(
    ROUTES_CONFIG.routes.LEADERBOARD.routes.PLAYER_LEADERBOARD.directPath,
    window.location.pathname
  )

  // If the first load is on the player leaderboard page, grab the params
  // from the URL and populate state with them.
  if (!!match) {
    const params = new URLSearchParams(window.location.search)

    const keys = Object.keys(
      DEFAULT_PLAYER_LEADERBOARD_FILTERS
    ) as (keyof UsePlayerLeaderboardArgs)[]

    return produce(DEFAULT_PLAYER_LEADERBOARD_FILTERS, (draft) => {
      keys.forEach((key) => {
        if (params.has(key)) {
          const value = params.get(key)
          if (!!value) {
            // @ts-ignore
            draft[key] = value
          }
        }
      })
    })
  } else {
    return DEFAULT_PLAYER_LEADERBOARD_FILTERS
  }
}

export const playerLeaderboardFilterState = proxy<UsePlayerLeaderboardArgs>(
  instantiateState()
)

APIClient.opensky.getCurrentSeason().then(({ res }) => {
  if (!playerLeaderboardFilterState.season) {
    playerLeaderboardFilterState.season = res
  }
})

export const resetPlayerLeaderboardFilters = () => {
  Object.keys(DEFAULT_PLAYER_LEADERBOARD_FILTERS).forEach((key) => {
    playerLeaderboardFilterState[key] = DEFAULT_PLAYER_LEADERBOARD_FILTERS[key]
  })
}

export const updatePlayerLeaderboardFilter = <
  T extends keyof UsePlayerLeaderboardArgs
>(
  key: T,
  value: UsePlayerLeaderboardArgs[T]
) => {
  playerLeaderboardFilterState[key] = value
}

export const setPlayerLeaderboardFilterState = (
  filters: UsePlayerLeaderboardArgs
) => {
  Object.keys(DEFAULT_PLAYER_LEADERBOARD_FILTERS).forEach((key) => {
    if (filters[key]) {
      playerLeaderboardFilterState[key] = filters[key]
    } else {
      playerLeaderboardFilterState[key] = DEFAULT_PLAYER_LEADERBOARD_FILTERS[key]
    }
  })
}
