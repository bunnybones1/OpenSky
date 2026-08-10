import { generatePath } from 'react-router-dom'

import { itemsCardbacksFilterState } from '~/shared/state/items-cardbacks/items-cardbacks-filter-state'
import { itemsCardsFiltersState } from '~/shared/state/items-cards/items-cards-filter-state'
import { itemsHeroesFilterState } from '~/shared/state/items-heroes/items-heroes-filter-state'
import { itemsStickersFilterState } from '~/shared/state/items-stickers/items-stickers-filter-state'

import { ROUTES_CONFIG } from '../../constants/routes'
import { getFilterParams } from './get-filter-params'

export const makeItemsHeroesRoute = () => {
  const params = getFilterParams(itemsHeroesFilterState)

  return `${ROUTES_CONFIG.routes.ITEMS.routes.HEROES.directPath}?${params.toString()}`
}

export const makeItemsStickersRoute = () => {
  const params = getFilterParams(itemsStickersFilterState)

  return `${
    ROUTES_CONFIG.routes.ITEMS.routes.STICKERS.directPath
  }?${params.toString()}`
}

export const makeItemsStickerFeatureRoute = (id: number) => {
  return generatePath(ROUTES_CONFIG.routes.ITEMS.routes.STICKER.directPath, { id })
}

export const makeItemsCardBacksRoute = () => {
  const params = getFilterParams(itemsCardbacksFilterState)

  return `${
    ROUTES_CONFIG.routes.ITEMS.routes.CARDBACKS.directPath
  }?${params.toString()}`
}

export const makeItemsCardBacksFeatureRoute = (id: number) => {
  return generatePath(ROUTES_CONFIG.routes.ITEMS.routes.CARDBACK.directPath, { id })
}

export const makeItemsCardsRoute = () => {
  const params = getFilterParams(itemsCardsFiltersState)

  return `${ROUTES_CONFIG.routes.ITEMS.routes.CARDS.directPath}?${params.toString()}`
}

export const makeItemsCardDetailsRoute = (id: number) => {
  return generatePath(ROUTES_CONFIG.routes.ITEMS.routes.CARD.directPath, { id })
}
