import { COOKIES } from '~/shared/constants/accounts'

type CookiePolicy = Record<string, boolean>

const CONSENT_STORAGE_KEY = 'consented_cookies'

export const COOKIE_POLICY_ALL: CookiePolicy = COOKIES.reduce<CookiePolicy>(
  (policy, cookie) => {
    policy[cookie.id] = true
    return policy
  },
  {}
)

export const IDENTITY_COOKIE_POLICY_ALL: CookiePolicy = {
  AUTHENTICATION: true,
  PRODUCT_ANALYTICS: true
}

export const saveAllCookieConsent = (policy: CookiePolicy) => {
  window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({ policy }))
}

export const load = (_allowTracking?: boolean) => {}

export const identify = (
  _address: string,
  _desktopPushId?: string,
  _mobilePushUserId?: string,
  _one?: unknown,
  _two?: unknown,
  _allowTracking?: boolean,
  _name?: string,
  _state?: string
) => {}

export const setVisibilityHandlers = (
  _onVisible: () => void,
  _onHidden: () => void
) => {}

export const trackSessionEnd = (_reason?: string) => {}
export const trackButtonClick = (_name: string) => {}
export const trackAccountCreationStarted = () => {}
export const trackAccountCreation = () => {}
export const trackRequestGame = (_mode: unknown, _data?: unknown) => {}
export const trackTutorialStart = (_tutorialLevel: number) => {}
export const trackIAP = (_status: string, _payload: unknown, _platform: string) => {}
export const trackNotification = (_payload: unknown) => {}
export const trackSaveAccount = (
  _isNew: boolean,
  _name: string,
  _index: number
) => {}
export const trackSaveDeck = (
  _isNew: boolean,
  _cardIds: number[],
  _data: unknown
) => {}
export const trackDeleteDeck = (_cardIds: number[], _data: unknown) => {}
export const page = (_name: string, _props?: Record<string, unknown>) => {}

export const getDeviceProperties = () => ({
  countryCode: window.sessStorage?.countryCode || '',
  deviceID: '',
  environmentDevice: navigator?.platform || '',
  environmentOS: navigator?.userAgent || '',
  environmentProduct: 'webapp'
})

export const setAdjustDeviceID = (_id: string) => {}
