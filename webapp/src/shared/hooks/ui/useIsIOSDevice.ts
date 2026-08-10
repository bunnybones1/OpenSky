import { AppPlatform, getAppPlatform } from '@opensky/shared/get-app-platform'
import { useMemo } from 'react'

export const useIsIOSDevice = () => {
  return useMemo(() => {
    const platform = getAppPlatform()
    if (!platform) return false
    return platform === AppPlatform.IOS_WEB || platform === AppPlatform.IOS_NATIVE
  }, [])
}
