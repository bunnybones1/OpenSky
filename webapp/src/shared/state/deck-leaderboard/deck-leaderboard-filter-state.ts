import { DeckClass } from '@opensky/proto'
import { produce } from 'immer'
import { matchPath } from 'react-router-dom'
import { proxy } from 'valtio'

import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { CardsArrayParams } from '~/shared/types/cards'

export interface DeckLeaderboardFilters {
  deckClass: DeckClass | undefined
}

const DEFAULT_FILTERS: DeckLeaderboardFilters = {
  deckClass: undefined
}

const instantiateState = () => {
  const match = matchPath(
    ROUTES_CONFIG.routes.LEADERBOARD.routes.DECK_LEADERBOARD.directPath,
    window.location.pathname
  )

  // If the page is loaded on  the deck leaderboard page, grab the params
  // from the URL and populate state with them.
  if (!!match) {
    const params = new URLSearchParams(window.location.search)

    const keys = Object.keys(DEFAULT_FILTERS) as (keyof DeckLeaderboardFilters)[]

    return produce(DEFAULT_FILTERS, (draft) => {
      keys.forEach((key) => {
        if (params.has(key)) {
          const value = CardsArrayParams.includes(key)
            ? params.getAll(key)
            : params.get(key)
          if (!!value) {
            // @ts-ignore
            draft[key] = value
          }
        }
      })
    })
  } else {
    return DEFAULT_FILTERS
  }
}

export const deckLeaderboardFilterState = proxy<DeckLeaderboardFilters>(
  instantiateState()
)

export const resetDeckLeaderboardFilters = () => {
  deckLeaderboardFilterState.deckClass = undefined
}

export const updateDeckLeaderboardFilter = <T extends keyof DeckLeaderboardFilters>(
  key: T,
  value: DeckLeaderboardFilters[T]
) => {
  deckLeaderboardFilterState[key] = value
}
