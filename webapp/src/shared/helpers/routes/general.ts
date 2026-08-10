import { GameMode } from '@opensky/proto'
import { createSearchParams, generatePath } from 'react-router-dom'

import { selectGoldsFilterState } from '~/shared/state/select-golds/select-golds-filter-state'
import { selectSilversFilterState } from '~/shared/state/select-silvers/select-silvers-filter-state'
import { ActiveGameModes } from '~/shared/types/play'

import {
  DECK_ID_TO_VIEW_PARAM,
  DECK_VIEWER_PARAM,
  ROUTES_CONFIG,
  STARTER_HERO_TO_VIEW_PARAM
} from '../../constants/routes'
import { getFilterParams } from './get-filter-params'

export const makeAccountRoute = (address: string) => {
  return generatePath(ROUTES_CONFIG.routes.ACCOUNT.directPath, { address })
}

export const makePlayRoute = (mode: ActiveGameModes, tutorialComplete: boolean) => {
  if (mode === GameMode.TUTORIAL) {
    return !!tutorialComplete
      ? ROUTES_CONFIG.routes.PLAY.routes.RANKED.directPath
      : ROUTES_CONFIG.routes.PLAY.routes.TUTORIAL.directPath
  }
  if (mode === GameMode.PRACTICE_BOT) {
    return ROUTES_CONFIG.routes.PLAY.routes.PRACTICE.routes.BOT.directPath
  }
  if (
    mode === GameMode.CHALLENGE_CONSTRUCTED ||
    mode === GameMode.CHALLENGE_DISCOVERY
  ) {
    return ROUTES_CONFIG.routes.PLAY.routes.PRACTICE.routes.PLAYER.directPath
  }

  if (mode === GameMode.RANKED_CONSTRUCTED || mode === GameMode.RANKED_DISCOVERY) {
    return ROUTES_CONFIG.routes.PLAY.routes.RANKED.directPath
  }

  if (
    mode === GameMode.CONQUEST_CONSTRUCTED ||
    mode === GameMode.CONQUEST_DISCOVERY
  ) {
    return ROUTES_CONFIG.routes.PLAY.routes.CONQUEST.directPath
  }

  return ROUTES_CONFIG.routes.PLAY.routes.PRACTICE.routes.BOT.directPath
}

export const makeAdminUserRoute = (id: string) => {
  return generatePath(ROUTES_CONFIG.routes.ADMIN.routes.USER.directPath, { id })
}

export const makeHeroRoute = (id: number, openDialog?: boolean) => {
  const heroRoute = generatePath(ROUTES_CONFIG.routes.HERO_FEATURE.directPath, {
    id: String(id)
  })

  if (!!openDialog) {
    return `${heroRoute}?openDialog=true`
  } else {
    return heroRoute
  }
}

export const makeCloseDeckViewerRoute = () => {
  const currentParams = new URLSearchParams(window.location.search)

  if (currentParams.has(DECK_ID_TO_VIEW_PARAM)) {
    currentParams.delete(DECK_ID_TO_VIEW_PARAM)
  }

  if (currentParams.has(DECK_VIEWER_PARAM)) {
    currentParams.delete(DECK_VIEWER_PARAM)
  }

  if (currentParams.has(STARTER_HERO_TO_VIEW_PARAM)) {
    currentParams.delete(STARTER_HERO_TO_VIEW_PARAM)
  }

  return `${window.location.pathname}?${createSearchParams(currentParams)}`
}

export const makeSelectSilversRoute = () => {
  const params = getFilterParams(selectSilversFilterState)

  return `${
    ROUTES_CONFIG.routes.SELECT_SILVERS.routes.CARDS.directPath
  }?${params.toString()}`
}

export const makeSelectGoldsRoute = () => {
  const params = getFilterParams(selectGoldsFilterState)

  return `${
    ROUTES_CONFIG.routes.SELECT_GOLDS.routes.CARDS.directPath
  }?${params.toString()}`
}

export const makeSelectSilverCardDetailsRoute = (id: number) => {
  return generatePath(
    ROUTES_CONFIG.routes.SELECT_SILVERS.routes.CARD_DETAILS.directPath,
    {
      id
    }
  )
}

export const makeSelectGoldCardDetailsRoute = (id: number) => {
  return generatePath(
    ROUTES_CONFIG.routes.SELECT_GOLDS.routes.CARD_DETAILS.directPath,
    {
      id
    }
  )
}
