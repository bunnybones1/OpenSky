import { AppPlatform, getAppPlatform } from '@opensky/shared/get-app-platform'
import { useMemo } from 'react'

import { useIsCategoryThreeState } from '~/shared/hooks/useIsCategoryThreeState'

export const useIsMarketEnabled = () => {
  const isCat3State = useIsCategoryThreeState()

  return useMemo(() => {
    const isUS =
      !!window.sessStorage &&
      !!window.sessStorage.countryCode &&
      window.sessStorage.countryCode === 'US'

    const platform = getAppPlatform()
    if (
      platform === AppPlatform.IOS_NATIVE ||
      platform === AppPlatform.ANDROID_NATIVE ||
      (!!isCat3State && isUS)
    ) {
      return false
    }
    return true
  }, [isCat3State])
}
