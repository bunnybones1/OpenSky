import {
  isMobileBrowser,
  isNativeSequenceMobileApp,
  isNativeOpenSkyDesktopApp,
  isNativeOpenSkyMobileApp
} from './native'

export enum AppPlatform {
  DESKTOP_WEB = 'DESKTOP_WEB',
  DESKTOP_NATIVE = 'DESKTOP_NATIVE',

  IOS_WEB = 'IOS_WEB',
  IOS_NATIVE = 'IOS_NATIVE',

  ANDROID_WEB = 'ANDROID_WEB',
  ANDROID_NATIVE = 'ANDROID_NATIVE',

  MOBI_MISC_WEB = 'MOBI_MISC_WEB',
  MOBI_MISC_NATIVE = 'MOBI_MISC_NATIVE'
}

let _appPlatform: AppPlatform | undefined = undefined

export const getAppPlatform = (): AppPlatform | undefined => {
  if (_appPlatform) return _appPlatform

  const isDesktop = !isMobileBrowser()
  const isNative = isNativeSequenceMobileApp() || isNativeOpenSkyMobileApp()
  const android = () => !!navigator.userAgent.match(/Android/i)
  const ios = () => !!navigator.userAgent.match(/iPhone|iPad|iPod/i)

  if (isDesktop) {
    // desktop
    _appPlatform = isNativeOpenSkyDesktopApp()
      ? AppPlatform.DESKTOP_NATIVE
      : AppPlatform.DESKTOP_WEB
  } else {
    // mobile
    if (ios()) {
      _appPlatform = isNative ? AppPlatform.IOS_NATIVE : AppPlatform.IOS_WEB
    } else if (android()) {
      _appPlatform = isNative ? AppPlatform.ANDROID_NATIVE : AppPlatform.ANDROID_WEB
    } else {
      _appPlatform = isNative
        ? AppPlatform.MOBI_MISC_NATIVE
        : AppPlatform.MOBI_MISC_WEB
    }
  }

  return _appPlatform
}
