import { i18n } from '@opensky/language-manager'
import { listenForMessage } from '@opensky/shared/browserMessageListener'
import {
  isAndroidNativeApp,
  isIOSNativeApp
} from '@opensky/shared/check-mobile-app-type'
import {
  getMobileMessenger,
  isNativeMobileApp,
  makeCarefulMobileMessageListener
} from '@opensky/shared/native'
import * as Cookie from 'js-cookie'
import { push } from 'redux-first-history'

import { AuthenticationClient } from '~/shared/clients'
import { COOKIES } from '~/shared/constants/accounts'
import {
  COOKIE_POLICY_ALL,
  load,
  saveAllCookieConsent,
  setAdjustDeviceID,
  trackIAP,
  trackNotification,
  trackSessionEnd
} from '~/shared/helpers/analytics-old'
import { isDefinedAndNotNull } from '~/shared/helpers/is-defined-is-not-null'
import { captureError } from '~/shared/helpers/sentry'
import { reduxStore } from '~/shared/redux/index'
import { updateConquestTicketsSelectorState } from '~/shared/state/conquest-tickets-state'
import { showErrorDialog } from '~/shared/state/error-dialog-state'
import { mobileState, updateMobileState } from '~/shared/state/mobile-state'
import { addToast, clearAllToasts } from '~/shared/state/toast-state'

const selectedCookies = {}

import { delayPromise } from '@opensky/shared/utils/async'

import { getAccount } from '~/shared/queries/useAccount'
import { authenticationState } from '~/shared/state/authentication-state'

import {
  addAdjustAdvertisingId,
  handleAdjustMessage
} from './helpers/handle-adjust-message'

export class _MobileClient_DONT_USE_DIRECTLY {
  // Note: None of these values are "reactive", meaning
  // if they update while the user is looking at a component
  // that consumes them, that component wont be updated.
  freeDiskSpaceInMegabytes: number | undefined = undefined
  androidCacheSizeInMegabytes: number | undefined = undefined
  pushUserId: string | undefined = undefined
  isGalaxyStoreBuild: boolean = false

  constructor() {
    if (!!isNativeMobileApp()) {
      listenForMessage(this.handleMobileMessage)

      getMobileMessenger().postMessage({ action: 'requestDeviceStorageInfo' })
      getMobileMessenger().postMessage({
        action: 'requestBuildInfo'
      })
    }
  }

  openDeviceSettings = () => {
    getMobileMessenger().postMessage({ action: 'openSettings' })
  }

  toggleNotifications = () => {
    const currentValue = mobileState.mobilePushNotificationsEnabled
    updateMobileState('mobilePushNotificationsEnabled', !currentValue)

    window.localStorage.setItem(
      'pushNotificationEnabledStatus',
      (!currentValue).toString()
    )

    getMobileMessenger().postMessage({ action: 'toggleNotifications' })
  }

  sendSignedInMessage = (isSignedIn: boolean, username: string) => {
    getMobileMessenger().postMessage({
      action: 'userSignedIn',
      value: isSignedIn,
      username
    })
  }

  purchaseIAPProduct = (productId: string) => {
    updateMobileState('inProgressIAP', { type: 'initiated', productId })

    getMobileMessenger().postMessage({
      action: 'purchaseIAPProduct',
      productId
    })
  }

  private handleMobileMessage = makeCarefulMobileMessageListener(
    (message: { [key: string]: any }) => {
      if (!!message.type) {
        switch (message.type) {
          case 'IAPProducts': {
            if (!!message.data) {
              updateMobileState('IAPs', message.data)
            }
            break
          }

          case 'buildInfo': {
            if (message.data.isGalaxyStoreBuild !== undefined) {
              this.isGalaxyStoreBuild = message.data.isGalaxyStoreBuild
            }
            break
          }

          case 'canceledIAPPayment': {
            if (!!mobileState.inProgressIAP?.productId) {
              updateMobileState('inProgressIAP', {
                type: 'cancelled',
                productId: mobileState.inProgressIAP.productId
              })
              clearAllToasts()
              updateConquestTicketsSelectorState('hasPurchasedConquest', false)
              updateMobileState('isConquestTransactionLoading', false)

              if (isIOSNativeApp()) {
                trackIAP('Canceled', message, 'ios')
              } else if (isAndroidNativeApp()) {
                trackIAP('Canceled', message, 'android')
              }
            }
            break
          }

          case 'inAppPurchaseCompleted': {
            if (!!mobileState.inProgressIAP?.productId) {
              updateMobileState('inProgressIAP', {
                type: 'completed',
                productId: mobileState.inProgressIAP.productId,
                purchase: message
              })
              if (isIOSNativeApp()) {
                trackIAP('Completed', message, 'ios')
              } else if (isAndroidNativeApp()) {
                trackIAP('Completed', message, 'android')
              }
            }
            break
          }

          case 'inAppPurchaseAttempted': {
            if (!!mobileState.inProgressIAP?.productId) {
              updateMobileState('inProgressIAP', {
                type: 'failed',
                productId: mobileState.inProgressIAP.productId,
                purchase: message
              })
              if (isIOSNativeApp()) {
                trackIAP('Attempted', message, 'ios')
              } else if (isAndroidNativeApp()) {
                trackIAP('Attempted', message, 'android')
              }
            }
            break
          }

          case 'path': {
            // opensky mobile app is telling us to change routes,
            // usually coming from a push notification
            if (!message.path) return
            reduxStore.dispatch(push(message.path))

            break
          }

          case 'attributionData': {
            handleAdjustMessage(window, message.data)

            break
          }

          case 'advertisingId': {
            addAdjustAdvertisingId(
              window,
              message.data.platformOS,
              message.data.advertisingId
            )
            break
          }

          case 'AppStatus': {
            if (!!message.status && message.status === 'inactive') {
              trackSessionEnd('hiddenOrClosed')
            }
            break
          }

          case 'nativeException': {
            captureError(message.exception, 'Native mobile exception', false)
            addToast({
              text: i18n.t('webapp:notification.nativeError'),
              icon: 'error',
              iconColor: 'warm9',
              duration: 10,
              onClick: () => {
                showErrorDialog({
                  title: i18n.t('webapp:notification.nativeError'),
                  errorDetails: 'Native mobile exception',
                  errorStack: message.exception
                })
              }
            })
            break
          }

          case 'mobilePushUserId': {
            if (!!message.id) {
              const { userAddress } = authenticationState

              if (!!userAddress) {
                const account = getAccount(userAddress)

                if (!!account) {
                  AuthenticationClient.identifyUserInAnalytics(
                    account.name,
                    account.address,
                    message.id
                  )
                  this.pushUserId = message.id
                }
              }
            }
            break
          }

          case 'disableTrackers': {
            COOKIES.forEach((cookie) => {
              if (cookie.essential) {
                selectedCookies[cookie.id] = true
              } else {
                cookie.cookieValues.forEach((value) => {
                  Cookie['default'].remove(value)
                })
              }
            })
            saveAllCookieConsent(selectedCookies)
            break
          }

          case 'enableTrackers': {
            // If request comes from iOS user has already seen and accepted the
            // custom UI on native side and we can enable all cookies
            if (isIOSNativeApp()) {
              COOKIES.forEach((cookie) => {
                selectedCookies[cookie.id] = true
              })
              saveAllCookieConsent(COOKIE_POLICY_ALL)
            }
            // Waiting a bit to make sure window will have `load()` ready
            delayPromise(1000).then(() => {
              load()
            })
            break
          }

          case 'deviceStorageInfo': {
            if (!!message?.data?.androidCacheSizeInMegabytes) {
              this.androidCacheSizeInMegabytes =
                message.data.androidCacheSizeInMegabytes
            }
            if (!!message?.data?.freeDiskSpaceInMegabytes) {
              this.freeDiskSpaceInMegabytes = message.data.freeDiskSpaceInMegabytes
            }
            break
          }

          case 'notificationOpened': {
            if (!!message.notification) {
              trackNotification(message.notification)
            }
            break
          }

          case 'pushNotificationStatus': {
            if (
              isDefinedAndNotNull(message.deviceEnabled) &&
              typeof message.deviceEnabled === 'boolean'
            ) {
              window.localStorage.setItem(
                'pushNotificationEnabledStatus',
                message.deviceEnabled.toString()
              )
              updateMobileState('pushEnabledAtDeviceLevel', message.deviceEnabled)
            }
            if (
              isDefinedAndNotNull(message.data) &&
              typeof message.data === 'boolean'
            ) {
              updateMobileState('pushEnabledAtDeviceLevel', message.data)
            }
            break
          }

          case 'adjustDeviceID': {
            setAdjustDeviceID(message.deviceID)
            break
          }

          default:
            captureError(
              undefined,
              `Unhandled OpenSky mobile message: ${message.type}`,
              false,
              true
            )
        }
      }
    }
  )
}
