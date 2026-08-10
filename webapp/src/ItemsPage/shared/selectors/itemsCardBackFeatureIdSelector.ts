import { memoize } from 'proxy-memoize'
import { matchPath } from 'react-router-dom'

import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { RootState } from '~/shared/redux/index'

export const itemsCardBackFeatureIdSelector = memoize<RootState, number | undefined>(
  (state) => {
    if (!state.router.location?.pathname) return
    const match = matchPath<'id', string>(
      ROUTES_CONFIG.routes.ITEMS.routes.CARDBACK.directPath,
      state.router.location.pathname
    )

    if (!!match && !!match.params.id) {
      return Number(match.params.id)
    }
    return
  }
)
