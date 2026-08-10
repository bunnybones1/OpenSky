import { memo, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { AuthenticatedPageLoader } from '~/shared/components/AuthenticatedPageLoader'
import { ROUTES_CONFIG } from '~/shared/constants/routes'
import { makePlayRoute } from '~/shared/helpers/routes/general'
import { getSessionStorage } from '~/shared/helpers/session-storage'
import { useStoredMatchInfo } from '~/shared/queries/play/useStoredMatchInfo'
import { useIsTutorialCompleted } from '~/shared/queries/useIsTutorialCompleted'

export const IndexRedirect = memo(() => {
  const { data: storedMatchInfo, isLoading } = useStoredMatchInfo()
  const navigate = useNavigate()
  const ss = useMemo(() => {
    return getSessionStorage()
  }, [])

  const { data: isTutorialCompleted } = useIsTutorialCompleted()

  useEffect(() => {
    if (isTutorialCompleted !== undefined && !isLoading) {
      if (storedMatchInfo?.gameMode) {
        navigate(makePlayRoute(storedMatchInfo.gameMode, isTutorialCompleted))
        return
      }

      if (ss && !!ss.gameMode) {
        navigate(makePlayRoute(ss.gameMode, isTutorialCompleted))
      } else {
        navigate(ROUTES_CONFIG.routes.HOME.directPath)
      }
    }
    navigate(ROUTES_CONFIG.routes.HOME.directPath)
  }, [navigate, ss, isTutorialCompleted, storedMatchInfo?.gameMode, isLoading])

  return <AuthenticatedPageLoader />
})

IndexRedirect.displayName = 'IndexRedirects'
