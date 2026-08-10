import { analytics } from '@opensky/analytics'
import { useEffect } from 'react'

import { useAuthedAccount } from '~/shared/hooks/useAuthedAccount'

export const useAnalytics = () => {
  const { data: authedUser } = useAuthedAccount()

  useEffect(() => {
    if (!!authedUser) {
      // set ident back to private
      const dbeatString = window.localStorage.getItem('_dbeat')
      const dbeat = !!dbeatString ? JSON.parse(dbeatString) : undefined
      if (!!dbeat && (dbeat.ut === true || dbeat.it === 2)) {
        analytics.allowTracking(false)
      }

      // identify
      analytics.identify(authedUser.address.toLowerCase())
    }
  }, [authedUser])
}
