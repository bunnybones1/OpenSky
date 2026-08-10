import { generatePath } from 'react-router-dom'

import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { marketCardBacksFilterState } from '~/shared/state/market-cardbacks/market-cardbacks-filter-state'
import { marketCardsFilterState } from '~/shared/state/market-cards/market-cards-filter-state'
import { marketDecksFilterState } from '~/shared/state/market-decks/market-decks-filter-state'
import { marketHeroesFilterState } from '~/shared/state/market-heroes/market-heroes-filter-state'
import { marketStickersFilterState } from '~/shared/state/market-stickers/market-stickers-filter-state'

import { getFilterParams } from './get-filter-params'

export const makeMarketDecksSearchRoute = () => {
  const params = getFilterParams(marketDecksFilterState)

  return `${window.location.pathname}?${params.toString()}`
}

export const makeNavigateToMarketDecksRoute = () => {
  const path = generatePath(ROUTES_CONFIG.routes.MARKET.routes.DECKS.directPath)

  return `${path}?${getFilterParams(marketDecksFilterState).toString()}`
}

export const makeMarketCardsRoute = () => {
  const params = getFilterParams(marketCardsFilterState)

  return `${generatePath(
    ROUTES_CONFIG.routes.MARKET.routes.CARDS.directPath
  )}?${params.toString()}`
}

export const makeMarketStickersRoute = () => {
  const params = getFilterParams(marketStickersFilterState)

  return `${generatePath(
    ROUTES_CONFIG.routes.MARKET.routes.STICKERS.directPath
  )}?${params.toString()}`
}

export const makeMarketCardBacksRoute = () => {
  const params = getFilterParams(marketCardBacksFilterState)

  return `${generatePath(
    ROUTES_CONFIG.routes.MARKET.routes.CARDBACKS.directPath
  )}?${params.toString()}`
}

export const makeMarketHeroSkinsRoute = () => {
  const params = getFilterParams(marketHeroesFilterState)

  return `${
    ROUTES_CONFIG.routes.MARKET.routes.HEROES.directPath
  }?${params.toString()}`
}

export const makeMarketCardDetailsRoute = (id: number) => {
  return generatePath(ROUTES_CONFIG.routes.MARKET.routes.CARD.directPath, {
    id
  })
}

export const makeMarketStickerFeatureRoute = (id: number) => {
  return generatePath(ROUTES_CONFIG.routes.MARKET.routes.STICKER.directPath, { id })
}

export const makeMarketCardBackFeatureRoute = (id: number) => {
  return generatePath(ROUTES_CONFIG.routes.MARKET.routes.CARDBACK.directPath, { id })
}
