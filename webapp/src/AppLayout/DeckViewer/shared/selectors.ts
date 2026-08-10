import { memoize } from 'proxy-memoize'

import { DECK_ID_TO_VIEW_PARAM, DECK_VIEWER_PARAM } from '~/shared/constants/routes'
import { RootState } from '~/shared/redux'

export const deckViewerDeckStringSelector = memoize<RootState, string | undefined>(
  (state) => {
    const params = new URLSearchParams(state.router.location?.search)

    if (params.has(DECK_VIEWER_PARAM)) {
      const deckString = params.get(DECK_VIEWER_PARAM)
      if (deckString) return deckString
    }

    return undefined
  }
)

export const deckViewerIdSelector = memoize<RootState, string | undefined>(
  (state) => {
    const params = new URLSearchParams(state.router.location?.search)

    if (params.has(DECK_ID_TO_VIEW_PARAM)) {
      const deckId = params.get(DECK_ID_TO_VIEW_PARAM)
      if (deckId) return deckId
    }

    return undefined
  }
)
