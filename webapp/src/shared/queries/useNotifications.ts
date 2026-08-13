import { useQuery } from '@tanstack/react-query'

import { APIClient } from '~/shared/clients'

import { getNotificationsKey } from '../constants/react-query-keys'
import { ONE_MINUTE, THIRTY_SECONDS } from '../constants/time'
import { useAuthedAccount } from '../hooks/useAuthedAccount'

export const useNotifications = () => {
  const { data: authedAccount } = useAuthedAccount()

  return useQuery(
    getNotificationsKey(authedAccount?.address),
    async () => await APIClient.opensky.listNotifications(),
    {
      // Notifications disabled for users level 0-1, as requested by design
      enabled: !!authedAccount?.address && authedAccount.level > 1,
      // Weekly and delayed off-chain rewards arrive from scheduled Workers.
      // Keep the original Home dialog responsive without polling away from
      // Home or while the tab is backgrounded.
      staleTime: THIRTY_SECONDS,
      refetchInterval: ONE_MINUTE
    }
  )
}
