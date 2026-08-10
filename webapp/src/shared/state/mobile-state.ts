import { produce } from 'immer'
import { proxy } from 'valtio'

import { getLocalStorage } from '../helpers/local-storage'

export type WebIAP = {
  iapType: 'conquest' | 'skypass'
  title: string
  quantity: number
  price: string
  currency: string
  description: string
  localizedPrice: string
  productId: string
}

export interface InProgressIAP {
  type: 'initiated' | 'cancelled' | 'failed' | 'completed'
  productId?: string
  purchase?: any
}

interface MobileState {
  mobilePushNotificationsEnabled: boolean
  pushEnabledAtDeviceLevel: boolean
  IAPs: WebIAP[]
  inProgressIAP?: InProgressIAP
  isConquestTransactionLoading: boolean
  shouldShowConquestIAPModal: boolean
}

const DEFAULT_MOBILE_STATE: MobileState = {
  mobilePushNotificationsEnabled: false,
  pushEnabledAtDeviceLevel: false,
  IAPs: [],
  inProgressIAP: undefined,
  isConquestTransactionLoading: false,
  shouldShowConquestIAPModal: false
}

const init = () => {
  const notificationsEnabled = window.localStorage.getItem(
    'pushNotificationEnabledStatus'
  )

  let state = DEFAULT_MOBILE_STATE

  if (!!notificationsEnabled && notificationsEnabled === 'true') {
    state = produce(state, (draft) => {
      draft['mobilePushNotificationsEnabled'] = true
    })
  }

  const lsIapItems = getLocalStorage()?.iapItems
  if (lsIapItems && lsIapItems.length > 0) {
    state = produce(state, (draft) => {
      draft['iaps'] = lsIapItems
    })
  }

  return state
}

export const mobileState = proxy<MobileState>(init())

export const updateMobileState = <T extends keyof MobileState>(
  key: T,
  value: MobileState[T]
) => {
  mobileState[key] = value
}
