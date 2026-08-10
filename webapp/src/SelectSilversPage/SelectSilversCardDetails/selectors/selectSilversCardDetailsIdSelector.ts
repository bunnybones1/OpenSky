import { memoize } from 'proxy-memoize'
import { matchPath } from 'react-router-dom'

import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { RootState } from '~/shared/redux/index'

export const selectSilversCardDetailsIdSelector = memoize<
  RootState,
  number | undefined
>((state) => {
  if (!state.router.location?.pathname) return
  const match = matchPath<'id', string>(
    ROUTES_CONFIG.routes.SELECT_SILVERS.routes.CARD_DETAILS.directPath,
    state.router.location.pathname
  )

  if (!!match && !!match.params.id) {
    return Number(match.params.id)
  }
  return
})
