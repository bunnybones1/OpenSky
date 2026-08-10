import { encode, VERSION } from '@opensky/deck-string-codec'
import { produce } from 'immer'
import { createSearchParams, generatePath, matchPath } from 'react-router-dom'

import { DeckClass } from '~/lib/proto'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { deckBuilderFilterState } from '~/shared/state/deck-builder/deck-builder-filter-state'
import { CardSearchParams } from '~/shared/types/cards'

import { makeItemsDecksRoute } from './items-decks'

interface makeNavigateToDeckBuilderRouteParams {
  prism: Omit<DeckClass, 'UNKNOWN_CLASS'>
  deckString?: string
  uuid?: string
}

interface MakeDeckbuilderSearchParamsArgs {
  filters?: CardSearchParams
  uuid?: string
  deckString?: string
}

export const makeDeckbuilderSearchParams = ({
  filters,
  uuid,
  deckString
}: MakeDeckbuilderSearchParamsArgs) => {
  if (!!filters) {
    // If filters are passed in, merge them with the current filters.
    produce(deckBuilderFilterState, (draft) => {
      for (const key in draft) {
        if (!!filters[key] && draft[key] !== filters[key]) {
          draft[key] = filters[key]
        }
      }
    })
  }

  const params: Record<string, string | string[]> = {}

  for (const param in deckBuilderFilterState) {
    if (!!deckBuilderFilterState[param]) {
      params[param] = deckBuilderFilterState[param]
    }
  }

  if (uuid) params['uuid'] = uuid
  if (deckString) params['deckString'] = deckString

  return createSearchParams(params)
}

export const makeDeckBuilderSearchRoute = (
  filters?: CardSearchParams,
  newUUID?: string
) => {
  const currentParams = new URLSearchParams(window.location.search)

  const uuid = currentParams.get('uuid') || newUUID
  const deckString = currentParams.get('deckString') || undefined

  const params = makeDeckbuilderSearchParams({ filters, uuid, deckString })

  return `${window.location.pathname}?${params.toString()}`
}

export const makeNavigateToDeckBuilderRoute = ({
  prism,
  deckString,
  uuid
}: makeNavigateToDeckBuilderRouteParams) => {
  const _deckString = deckString || encode(VERSION, [], prism as DeckClass)

  const params = makeDeckbuilderSearchParams({
    uuid,
    deckString: _deckString || undefined
  })

  const basePath = generatePath(ROUTES_CONFIG.routes.DECK_BUILDER.directPath, {
    prism
  })

  return `${basePath}?${params.toString()}`
}

export const makeUpdateDeckBuilderDeckstringRoute = (newDeckString: string) => {
  const currentParams = new URLSearchParams(window.location.search)

  currentParams.set('deckString', newDeckString)

  const pathname = window.location.pathname

  const match = matchPath<'prism' | 'deckString', string>(
    ROUTES_CONFIG.routes.DECK_BUILDER.directPath,
    pathname
  )

  if (!!match && match.params.prism) {
    const newPathName = generatePath(ROUTES_CONFIG.routes.DECK_BUILDER.directPath, {
      prism: match.params.prism
    })
    return `${newPathName}?${currentParams.toString()}`
  } else {
    return `${pathname}?${currentParams.toString()}`
  }
}

export const makeNavigateBackFromDeckBuilderRoute = (
  previousLocation?: string,
  skipCreateRoute?: boolean
) => {
  if (previousLocation) {
    const createMatch = matchPath(
      previousLocation,
      ROUTES_CONFIG.routes.CREATE_DECK.directPath
    )

    if (!!createMatch) {
      if (skipCreateRoute) return makeItemsDecksRoute()
      return previousLocation
    }

    // TODO: Handle market and leaderboard in here.
  }
  return makeItemsDecksRoute()
}

export const makePostDeleteDeckBuilderRoute = (previousLocation?: string) => {
  if (previousLocation) {
    const marketMatch = matchPath(
      previousLocation,
      ROUTES_CONFIG.routes.MARKET.routes.DECKS.directPath
    )

    if (!!marketMatch) {
      // PUSH TO MARKET
    }
  }
  return makeItemsDecksRoute()
}
