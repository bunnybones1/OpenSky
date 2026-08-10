import { createSelector } from '@reduxjs/toolkit'
import { memoize } from 'proxy-memoize'
import { matchPath, matchRoutes } from 'react-router-dom'

import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { RootState } from '~/shared/redux'
import { MARKET_ITEM_TYPE } from '~/shared/types/market'

export const getRouterState = (state: RootState) => state.router

export const pathNameSelector = createSelector(
  getRouterState,
  (router) => router.location?.pathname
)

export const hashSelector = createSelector(
  getRouterState,
  (router) => router.location?.hash
)

export const isRootRouteSelector = createSelector(pathNameSelector, (pathname) => {
  return !!pathname && !!matchPath(ROUTES_CONFIG.directPath, pathname)
})

export const isDeleteAccountRouteSelector = createSelector(
  pathNameSelector,
  (pathname) => {
    return (
      !!pathname &&
      !!matchPath(ROUTES_CONFIG.routes.DELETED_ACCOUNT.directPath, pathname)
    )
  }
)

export const isCreateRouteSelector = createSelector(pathNameSelector, (pathname) => {
  return (
    !!pathname &&
    !!matchPath(ROUTES_CONFIG.routes.CREATE_ACCOUNT.directPath, pathname)
  )
})

export const isDeckBuildingRouteSelector = createSelector(
  pathNameSelector,
  (pathname) => {
    return (
      !!pathname &&
      !!matchPath(ROUTES_CONFIG.routes.DECK_BUILDER.directPath, pathname)
    )
  }
)

export const shouldHideNavBarSelector = createSelector(
  [isDeleteAccountRouteSelector, isCreateRouteSelector],
  (isDeleteAccountRoute, isCreateRoute) => {
    return isDeleteAccountRoute || isCreateRoute
  }
)

export const isAccountRouteSelector = createSelector(pathNameSelector, (pathname) => {
  return !!pathname && !!matchPath(ROUTES_CONFIG.routes.ACCOUNT.directPath, pathname)
})

export const isBasePathSelector = createSelector(pathNameSelector, (pathname) => {
  return pathname === ROUTES_CONFIG.directPath
})

export const isMarketCardsRouteSelector = createSelector(
  pathNameSelector,
  (pathname) => {
    return (
      !!pathname &&
      !!matchPath(ROUTES_CONFIG.routes.MARKET.routes.CARDS.directPath, pathname)
    )
  }
)

const ACTIVE_PLAY_ROUTES = [
  { path: ROUTES_CONFIG.routes.SELECT_SILVERS.directPath },
  { path: ROUTES_CONFIG.routes.PLAY.directPath }
]

export const isPlayRouteActiveSelector = createSelector(
  pathNameSelector,
  (pathname) => {
    return !!pathname && !!matchRoutes(ACTIVE_PLAY_ROUTES, pathname)
  }
)

export const isSkypassRouteSelector = createSelector(pathNameSelector, (pathname) => {
  return (
    !!pathname &&
    (!!matchPath(ROUTES_CONFIG.routes.SKY_PASS.directPath, pathname) ||
      !!matchPath(ROUTES_CONFIG.routes.SKY_PASS_PURCHASE.directPath, pathname))
  )
})

export const skyPassParamsSelector = memoize<
  RootState,
  { level?: number; reward?: number }
>((state) => {
  if (!state.router.location?.pathname) return {}

  const match = matchPath(
    ROUTES_CONFIG.routes.SKY_PASS.directPath,
    state.router.location.pathname
  )

  if (!!match && !!state.router.location.search) {
    const params = new URLSearchParams(state.router.location.search)

    const level = params.get('level')
    const reward = params.get('reward')

    return {
      level: !!level ? Number(level) : undefined,
      reward: !!reward ? Number(reward) : undefined
    }
  }
  return {}
})

export const isItemsCardsRouteSelector = createSelector(
  pathNameSelector,
  (pathname) => {
    return (
      !!pathname &&
      !!matchPath(ROUTES_CONFIG.routes.ITEMS.routes.CARDS.directPath, pathname)
    )
  }
)

export const isCardsRouteSelector = createSelector(
  [isMarketCardsRouteSelector, isItemsCardsRouteSelector],
  (isMarketCards, isItemsCards) => {
    return isMarketCards || isItemsCards
  }
)

export const isItemsDecksRouteSelector = createSelector(
  pathNameSelector,
  (pathname) => {
    return (
      !!pathname &&
      !!matchPath(ROUTES_CONFIG.routes.ITEMS.routes.DECKS.directPath, pathname)
    )
  }
)

export const isItemsStickersRouteSelector = createSelector(
  pathNameSelector,
  (pathname) => {
    return (
      !!pathname &&
      !!matchPath(ROUTES_CONFIG.routes.ITEMS.routes.STICKERS.directPath, pathname)
    )
  }
)

export const isItemsCardBacksRouteSelector = createSelector(
  pathNameSelector,
  (pathname) => {
    return (
      !!pathname &&
      !!matchPath(ROUTES_CONFIG.routes.ITEMS.routes.CARDBACKS.directPath, pathname)
    )
  }
)

export const isItemsHeroesRouteSelector = createSelector(
  pathNameSelector,
  (pathname) => {
    return (
      !!pathname &&
      !!matchPath(ROUTES_CONFIG.routes.ITEMS.routes.HEROES.directPath, pathname)
    )
  }
)

export const isMarketDecksRouteSelector = createSelector(
  pathNameSelector,
  (pathname) => {
    return (
      !!pathname &&
      !!matchPath(ROUTES_CONFIG.routes.MARKET.routes.DECKS.directPath, pathname)
    )
  }
)

export const isMarketStickersRouteSelector = createSelector(
  pathNameSelector,
  (pathname) => {
    return (
      !!pathname &&
      !!matchPath(ROUTES_CONFIG.routes.MARKET.routes.STICKERS.directPath, pathname)
    )
  }
)

export const isMarketCardBacksRouteSelector = createSelector(
  pathNameSelector,
  (pathname) => {
    return (
      !!pathname &&
      !!matchPath(ROUTES_CONFIG.routes.MARKET.routes.CARDBACKS.directPath, pathname)
    )
  }
)

export const isMarketHeroesRouteSelector = createSelector(
  pathNameSelector,
  (pathname) => {
    return (
      !!pathname &&
      !!matchPath(ROUTES_CONFIG.routes.MARKET.routes.HEROES.directPath, pathname)
    )
  }
)

export const isInvitedFriendsRouteSelector = createSelector(
  pathNameSelector,
  (pathname) => {
    return (
      !!pathname &&
      !!matchPath(
        ROUTES_CONFIG.routes.INVITE_FRIENDS.routes.INVITED.directPath,
        pathname
      )
    )
  }
)

export const isInviteAFriendRewardsRouteSelector = createSelector(
  pathNameSelector,
  (pathname) => {
    return (
      !!pathname &&
      !!matchPath(
        ROUTES_CONFIG.routes.INVITE_FRIENDS.routes.REWARDS.directPath,
        pathname
      )
    )
  }
)

export const isRanksRouteSelector = createSelector(pathNameSelector, (pathname) => {
  return (
    !!pathname && !!matchPath(ROUTES_CONFIG.routes.LEADERBOARD.directPath, pathname)
  )
})

export const isViewingDecksRouteSelector = createSelector(
  [isItemsDecksRouteSelector, isMarketDecksRouteSelector],
  (isItemsDecks, isMarketDecks) => {
    return isItemsDecks || isMarketDecks
  }
)

export const isLeaderboardDecksRouteSelector = createSelector(
  pathNameSelector,
  (pathname) => {
    return (
      !!pathname &&
      !!matchPath(
        ROUTES_CONFIG.routes.LEADERBOARD.routes.DECK_LEADERBOARD.directPath,
        pathname
      )
    )
  }
)

export const isTutorialRouteSelector = createSelector(
  pathNameSelector,
  (pathname) => {
    return (
      !!pathname &&
      !!matchPath(ROUTES_CONFIG.routes.PLAY.routes.TUTORIAL.directPath, pathname)
    )
  }
)

export const isPractiveVsPlayerRouteSelector = createSelector(
  pathNameSelector,
  (pathname) => {
    return (
      !!pathname &&
      !!matchPath(
        ROUTES_CONFIG.routes.PLAY.routes.PRACTICE.routes.PLAYER.directPath,
        pathname
      )
    )
  }
)

export const isRankedRouteSelector = createSelector(pathNameSelector, (pathname) => {
  return (
    !!pathname &&
    !!matchPath(ROUTES_CONFIG.routes.PLAY.routes.RANKED.directPath, pathname)
  )
})

export const isPractiveVsBotRouteSelector = createSelector(
  pathNameSelector,
  (pathname) => {
    return (
      !!pathname &&
      !!matchPath(
        ROUTES_CONFIG.routes.PLAY.routes.PRACTICE.routes.BOT.directPath,
        pathname
      )
    )
  }
)

export const isSelectSilverRouteSelector = createSelector(
  pathNameSelector,
  (pathname) => {
    return (
      !!pathname &&
      !!matchPath(ROUTES_CONFIG.routes.SELECT_SILVERS.directPath, pathname)
    )
  }
)

export const activeShopItemTypeFromRouteSelector = createSelector(
  [
    isMarketCardsRouteSelector,
    isMarketDecksRouteSelector,
    isMarketStickersRouteSelector,
    isMarketHeroesRouteSelector,
    isMarketCardBacksRouteSelector
  ],
  (
    isMarketCardsRoute,
    isMarketDecksRoute,
    isMarketStickersRoute,
    isMarketHeroesRoute,
    isMarketCardBacksRoute
  ) => {
    if (isMarketCardsRoute) return MARKET_ITEM_TYPE.cards
    if (isMarketDecksRoute) return MARKET_ITEM_TYPE.decks
    if (isMarketStickersRoute) return MARKET_ITEM_TYPE.stickers
    if (isMarketHeroesRoute) return MARKET_ITEM_TYPE.heroes
    if (isMarketCardBacksRoute) return MARKET_ITEM_TYPE.cardbacks

    return
  }
)

export const isMarketRouteSelector = createSelector(
  activeShopItemTypeFromRouteSelector,
  (itemType) => {
    return !!itemType
  }
)

export const isHomeRouteSelector = createSelector(
  pathNameSelector,
  (pathname) =>
    !!pathname && !!matchPath(ROUTES_CONFIG.routes.HOME.directPath, pathname)
)

export const isHeroFeatureRouteSelector = createSelector(
  pathNameSelector,
  (pathname) =>
    !!pathname && !!matchPath(ROUTES_CONFIG.routes.HERO_FEATURE.directPath, pathname)
)

export const activeLeaderBoardSelector = createSelector(
  pathNameSelector,
  (pathname) => {
    if (!pathname) return

    const playerMatch = matchPath(
      ROUTES_CONFIG.routes.LEADERBOARD.routes.PLAYER_LEADERBOARD.directPath,
      pathname
    )

    if (!!playerMatch) return 'player'

    const deckMatch = matchPath(
      ROUTES_CONFIG.routes.LEADERBOARD.routes.DECK_LEADERBOARD.directPath,
      pathname
    )

    if (!!deckMatch) return 'deck'

    return
  }
)

const PLAY_MODE_ROUTES = [
  { path: ROUTES_CONFIG.routes.PLAY.routes.CONQUEST.directPath },
  { path: ROUTES_CONFIG.routes.PLAY.routes.PRACTICE.routes.BOT.directPath },
  { path: ROUTES_CONFIG.routes.PLAY.routes.PRACTICE.routes.PLAYER.directPath },
  { path: ROUTES_CONFIG.routes.PLAY.routes.RANKED.directPath },
  { path: ROUTES_CONFIG.routes.PLAY.routes.TUTORIAL.directPath }
]

export const activePlayModeSelector = createSelector(pathNameSelector, (pathname) => {
  if (!pathname) return

  const matches = matchRoutes(PLAY_MODE_ROUTES, pathname)

  if (!matches || !matches.length) return

  switch (matches[0].route.path) {
    case ROUTES_CONFIG.routes.PLAY.routes.CONQUEST.directPath: {
      return 'conquest'
    }
    case ROUTES_CONFIG.routes.PLAY.routes.PRACTICE.routes.BOT.directPath: {
      return 'practice'
    }
    case ROUTES_CONFIG.routes.PLAY.routes.PRACTICE.routes.PLAYER.directPath: {
      return 'practice'
    }
    case ROUTES_CONFIG.routes.PLAY.routes.RANKED.directPath: {
      return 'ranked'
    }
    case ROUTES_CONFIG.routes.PLAY.routes.TUTORIAL.directPath: {
      return 'tutorial'
    }

    default:
      return undefined
  }
})

export const heroFeatureIdSelector = memoize<RootState, number | undefined>(
  (state) => {
    if (!state.router.location?.pathname) return
    const match = matchPath<'id', string>(
      ROUTES_CONFIG.routes.HERO_FEATURE.directPath,
      state.router.location.pathname
    )

    if (!!match && !!match.params.id) {
      return Number(match.params.id)
    }
    return
  }
)

export const isQuestsRouteSelector = memoize<RootState, boolean>((state) => {
  if (!state.router.location?.pathname) return false

  const match = matchPath(
    ROUTES_CONFIG.routes.QUESTS.directPath,
    state.router.location.pathname
  )

  return !!match
})
