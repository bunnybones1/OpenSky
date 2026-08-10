import { useQuery } from '@tanstack/react-query'

import { APIClient } from '~/shared/clients'

import { getNotificationsKey } from '../constants/react-query-keys'
import { ONE_DAY } from '../constants/time'
import { useAuthedAccount } from '../hooks/useAuthedAccount'

export const useNotifications = () => {
  const { data: authedAccount } = useAuthedAccount()

  return useQuery(
    getNotificationsKey(authedAccount?.address),
    async () => await APIClient.opensky.listNotifications(),
    {
      // Notifications disabled for users level 0-1, as requested by design
      enabled: !!authedAccount?.address && authedAccount.level > 1,
      staleTime: ONE_DAY
    }
  )
}
