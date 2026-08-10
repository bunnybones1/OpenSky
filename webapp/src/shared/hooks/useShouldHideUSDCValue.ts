import { UserStorageKeys } from '@opensky/shared/constants'
import { useMemo } from 'react'

import { useUserStorage } from '../queries/useUserStorage'

export const useShouldHideUSDCValue = () => {
  const { data: hideUSDCBalance } = useUserStorage(UserStorageKeys.HIDE_USDC_VALUE)

  return useMemo(() => {
    return !!hideUSDCBalance
  }, [hideUSDCBalance])
}
