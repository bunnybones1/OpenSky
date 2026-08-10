import { memoize } from 'proxy-memoize'
import { matchPath } from 'react-router-dom'

import { DeckClass } from '~/lib/proto'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { RootState } from '~/shared/redux'

export const deckBuilderDeckClassSelector = memoize<
  RootState,
  Omit<DeckClass, 'UNKNOWN_CLASS'> | undefined
>((state) => {
  if (!state.router.location?.pathname) return

  const match = matchPath<'prism', string>(
    ROUTES_CONFIG.routes.DECK_BUILDER.directPath,
    state.router.location.pathname
  )

  if (!!match && !!match.params.prism) {
    return match.params.prism as Omit<DeckClass, 'UNKNOWN_CLASS'>
  }
  return
})

export const deckBuilderDeckStringSelector = memoize<RootState, string | undefined>(
  (state) => {
    const params = new URLSearchParams(state.router.location?.search)

    if (params.has('deckString')) {
      const uuid = params.get('deckString')
      if (uuid) return uuid
    }
    return
  }
)

export const deckBuilderUUIDSelector = memoize<RootState, string | undefined>(
  (state) => {
    const params = new URLSearchParams(state.router.location?.search)

    if (params.has('uuid')) {
      const uuid = params.get('uuid')
      if (uuid) return uuid
    }
    return
  }
)
