import { AppPlatform, getAppPlatform } from './get-app-platform'

let isIOSNativeAppCached: boolean | undefined = undefined
export const isIOSNativeApp = () => {
  if (isIOSNativeAppCached === undefined) {
    const platform = getAppPlatform()
    if (!platform) return false
    isIOSNativeAppCached = platform === AppPlatform.IOS_NATIVE
  }
  return isIOSNativeAppCached
}

let isAndroidNativeAppCached: boolean | undefined = undefined
export const isAndroidNativeApp = () => {
  if (isAndroidNativeAppCached === undefined) {
    const platform = getAppPlatform()
    if (!platform) return false
    isAndroidNativeAppCached = platform === AppPlatform.ANDROID_NATIVE
  }
  return isAndroidNativeAppCached
}