import { analytics } from '@opensky/analytics'
import { UserStorageKeys } from '@opensky/shared/constants'
import { isLocalTrackingAllowed } from '@opensky/shared/cookies'
import { isNativeOpenSkyMobileApp } from '@opensky/shared/native'
import { delayPromise } from '@opensky/shared/utils/async'

import { APIClient, GlobalQueryClient } from '~/shared/clients'
import { getUserStorageKey } from '~/shared/constants/react-query-keys'
import {
  identify,
  setVisibilityHandlers,
  trackSessionEnd
} from '~/shared/helpers/analytics-old'
import { getUserId, setExternalUserId } from '~/shared/helpers/one-signal'

import { getAuthHeaders } from './get-auth-header'
import { getJWTs } from './get-set-jwts'

interface Args {
  mobilePushUserId?: string
  name: string
  address: string
}

export const identifyUserInAnalytics = async ({
  name,
  address,
  mobilePushUserId
}: Args) => {
  try {
    const { jwt } = getJWTs()

    if (!jwt) {
      console.error('Tried to identify user while not authed.')
      return
    }

    let desktopPushId = ''

    // one-signal is really useful, but if it's stuck, don't prevent the user from playing.
    await Promise.race([
      delayPromise(5000),
      Promise.all([
        getUserId().then((id) => {
          desktopPushId = id
        }),
        !isNativeOpenSkyMobileApp() ? setExternalUserId(address) : undefined
      ])
    ])

    let currentUsState: { state: string } | undefined = undefined

    const { object } = await APIClient.opensky.userStorageFetch(
      { key: UserStorageKeys.CURRENT_US_STATE },
      getAuthHeaders(jwt)
    )
    currentUsState = object as { state: string }

    GlobalQueryClient.setQueryData<{ state: string } | undefined>(
      getUserStorageKey(UserStorageKeys.CURRENT_US_STATE, address),
      currentUsState
    )

    analytics.identify(address, { allowTracking: isLocalTrackingAllowed() })
    identify(
      address,
      !!mobilePushUserId ? '' : desktopPushId || '',
      mobilePushUserId || '',
      undefined,
      undefined,
      isLocalTrackingAllowed(),
      name,
      currentUsState?.state
    )

    setVisibilityHandlers(
      () => {
        if (window.sessStorage) {
          window.sessStorage.clearIndentity()
        }
        analytics.identify(address, { allowTracking: isLocalTrackingAllowed() })
        identify(
          address,
          !!mobilePushUserId ? '' : desktopPushId || '',
          mobilePushUserId || '',
          undefined,
          undefined,
          isLocalTrackingAllowed(),
          name,
          currentUsState?.state
        )
      },
      () => {
        trackSessionEnd('hiddenOrClosed')
      }
    )
    await Promise.race([delayPromise(3000), analytics.flush()])

    return true
  } catch (error) {
    console.error('Error intializing analytics: ', error)
    return false
  }
}
