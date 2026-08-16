import { i18n } from '@opensky/language-manager'
import { isNativeOpenSkyMobileApp } from '@opensky/shared/native'
import OneSignal from 'react-onesignal'

import env from '~/env'
import {
  oneSignalConfigured,
  pushWelcomeUrl
} from '~/shared/helpers/oneSignalAvailability'

const isConfigured = () =>
  !isNativeOpenSkyMobileApp() && oneSignalConfigured(env.ONE_SIGNAL_APP_ID)

export const initOneSignal = async (): Promise<boolean> => {
  if (!isConfigured()) return false

  const welcomeUrl = pushWelcomeUrl(env.PUSH_WELCOME_URL)
  await OneSignal.init({
    appId: env.ONE_SIGNAL_APP_ID,
    serviceWorkerParam: { scope: '/js/push/' },
    serviceWorkerPath: 'js/push/OneSignalSDKWorker.js',
    serviceWorkerUpdaterPath: 'js/push/OneSignalSDKUpdaterWorker.js',
    allowLocalhostAsSecureOrigin: true,
    allowService: false,
    welcomeNotification: {
      title: i18n.t('play.welcome'),
      message: i18n.t('play.customizeNotifications'),
      ...(welcomeUrl ? { url: welcomeUrl } : {})
    },
    notifyButton: {
      enable: true
    }
  })
  return true
}

export const getUserId = (): Promise<string> => {
  if (isConfigured()) {
    return OneSignal.getUserId().then((userId) => {
      return String(userId)
    })
  }
  return Promise.resolve('')
}

export const isPushNotificationEnabled = (): Promise<boolean> => {
  if (!isConfigured()) return Promise.resolve(false)
  return OneSignal.isPushNotificationsEnabled().then((isPushNotificationEnabled) => {
    return Boolean(isPushNotificationEnabled)
  })
}

export const showNativePrompt = async (): Promise<void> => {
  if (!isConfigured()) return
  return await OneSignal.showNativePrompt()
}

export const setExternalUserId = async (userId: string): Promise<void> => {
  if (isConfigured() && userId !== '') {
    return await OneSignal.setExternalUserId(userId)
  }
}

export const removeExternalUserId = async (): Promise<void> => {
  if (isConfigured()) {
    return await OneSignal.removeExternalUserId()
  }
}
