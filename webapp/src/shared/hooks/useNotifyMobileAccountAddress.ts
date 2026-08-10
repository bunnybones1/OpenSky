import { getMobileMessenger } from '@opensky/shared/native'
import { useEffect } from 'react'

import { useAuthedAccount } from './useAuthedAccount'

export const useNotifyMobileAccountAddress = () => {
  const { data: authedAccount } = useAuthedAccount()
  useEffect(() => {
    if (!!authedAccount?.address) {
      getMobileMessenger().postMessage({
        action: 'accountAddress',
        accountAddress: authedAccount.address.toLowerCase()
      })
    }
  }, [authedAccount?.address])
}
