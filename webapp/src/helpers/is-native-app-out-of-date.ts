import {
  minimumOpenSkyDesktopVersion,
  minimumOpenSkyMobileVersion
} from '@opensky/shared/constants'
import { isVersionGreaterThan } from '@opensky/shared/helpers'
import {
  isNativeMobileApp,
  isNativeOpenSkyDesktopApp,
  isOldNativeOpenSkyDesktopApp,
  isOldNativeOpenSkyMobileApp,
  nativeOpenSkyDesktopVersion,
  nativeOpenSkyMobileVersion
} from '@opensky/shared/native'

export const isNativeAppOutOfDate = (): 'desktop' | 'mobile' | false => {
  const isMobile = isNativeMobileApp()
  const isDesktop = isNativeOpenSkyDesktopApp()

  const nativeOpenSkyVersion = isMobile
    ? nativeOpenSkyMobileVersion()
    : isDesktop
    ? nativeOpenSkyDesktopVersion()
    : null

  if (isDesktop && isOldNativeOpenSkyDesktopApp()) {
    return 'desktop'
  }
  if (isMobile && isOldNativeOpenSkyMobileApp()) {
    return 'mobile'
  }

  if (isMobile && !!nativeOpenSkyVersion) {
    // Compare Minimum Version with Current
    if (isVersionGreaterThan(minimumOpenSkyMobileVersion, nativeOpenSkyVersion)) {
      return 'mobile'
    }
  }
  if (isDesktop && !!nativeOpenSkyVersion) {
    // Compare Minimum Version with Current
    if (
      isVersionGreaterThan(minimumOpenSkyDesktopVersion, nativeOpenSkyVersion)
    ) {
      return 'desktop'
    }
  }
  return false
}
