import { i18n } from '@opensky/language-manager'
import { isNativeOpenSkyMobileApp } from '@opensky/shared/native'
import OneSignal from 'react-onesignal'

import env from '~/env'

export const initOneSignal = async (): Promise<void> => {
  if (!isNativeOpenSkyMobileApp() && env.ONE_SIGNAL_APP_ID !== '') {
    return await OneSignal.init({
      appId: env.ONE_SIGNAL_APP_ID,
      serviceWorkerParam: { scope: '/js/push/' },
      serviceWorkerPath: 'js/push/OneSignalSDKWorker.js',
      serviceWorkerUpdaterPath: 'js/push/OneSignalSDKUpdaterWorker.js',
      allowLocalhostAsSecureOrigin: true,
      allowService: false,
      welcomeNotification: {
        title: i18n.t('play.welcome'),
        message: i18n.t('play.customizeNotifications'),
        url: 'https://skyweaver.net/news'
      },
      notifyButton: {
        enable: true
      }
    })
  }
}

export const getUserId = (): Promise<string> => {
  if (!isNativeOpenSkyMobileApp() && env.ONE_SIGNAL_APP_ID !== '') {
    return OneSignal.getUserId().then((userId) => {
      return String(userId)
    })
  }
  return Promise.resolve('')
}

export const isPushNotificationEnabled = (): Promise<boolean> => {
  return OneSignal.isPushNotificationsEnabled().then((isPushNotificationEnabled) => {
    return Boolean(isPushNotificationEnabled)
  })
}

export const showNativePrompt = async (): Promise<void> => {
  return await OneSignal.showNativePrompt()
}

export const setExternalUserId = async (userId: string): Promise<void> => {
  return await OneSignal.setExternalUserId(userId)
}
