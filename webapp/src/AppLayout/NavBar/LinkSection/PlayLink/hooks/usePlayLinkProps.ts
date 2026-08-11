import { useMemo } from 'react'

import env from '~/env'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { getLocalStorage } from '~/shared/helpers/local-storage'
import { makePlayRoute } from '~/shared/helpers/routes/general'
import { getSessionStorage } from '~/shared/helpers/session-storage'
import { useAuthedAccount } from '~/shared/hooks/useAuthedAccount'
import { useStoredMatchInfo } from '~/shared/queries/play/useStoredMatchInfo'
import { useIsTutorialCompleted } from '~/shared/queries/useIsTutorialCompleted'
import { useSelector } from '~/shared/redux'
import {
  isPlayRouteActiveSelector,
  isRootRouteSelector
} from '~/shared/redux/router/selectors'

const useIdentityPlayLinkProps = () => {
  const isActive = useSelector(isPlayRouteActiveSelector)
  return {
    to: ROUTES_CONFIG.routes.PLAY.routes.PRACTICE.routes.BOT.directPath,
    isActive
  }
}

const useLegacyPlayLinkProps = () => {
  const { data: storedMatchInfo } = useStoredMatchInfo()

  const isPlayRouteActive = useSelector(isPlayRouteActiveSelector)
  const isRootRoute = useSelector(isRootRouteSelector)
  const { data: authedAccount } = useAuthedAccount()
  const { data: isTutorialCompleted } = useIsTutorialCompleted()

  const isActive = useMemo(() => {
    if (!authedAccount) return isRootRoute
    return isPlayRouteActive
  }, [authedAccount, isPlayRouteActive, isRootRoute])

  const ss = useMemo(() => getSessionStorage(), [])
  const ls = useMemo(() => getLocalStorage(), [])

  const to = useMemo(() => {
    if (!authedAccount) return ROUTES_CONFIG.directPath

    if (!isTutorialCompleted) {
      return ROUTES_CONFIG.routes.PLAY.routes.TUTORIAL.directPath
    }

    if (!!storedMatchInfo?.gameMode) {
      return makePlayRoute(storedMatchInfo.gameMode, isTutorialCompleted)
    }
    if (ss && !!ss.gameMode) {
      return makePlayRoute(ss.gameMode, isTutorialCompleted)
    }

    if (ls && !!ls.gameMode) {
      return makePlayRoute(ls.gameMode, isTutorialCompleted)
    }

    if (authedAccount.level >= 15) {
      return ROUTES_CONFIG.routes.PLAY.routes.RANKED.directPath
    } else {
      return ROUTES_CONFIG.routes.PLAY.routes.PRACTICE.routes.BOT.directPath
    }
  }, [authedAccount, isTutorialCompleted, ls, ss, storedMatchInfo?.gameMode])

  return { to, isActive }
}

export const usePlayLinkProps =
  env.AUTH_MODE === 'google' ? useIdentityPlayLinkProps : useLegacyPlayLinkProps
