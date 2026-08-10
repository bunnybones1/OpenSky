import { CookiePolicyOption } from '@opensky/proto'

export const isLocalTrackingAllowed = (): boolean | undefined => {
  if (window && window.localStorage) {
    const storedCookieConsent = window.localStorage.getItem('consented_cookies')

    if (storedCookieConsent) {
      const p = JSON.parse(storedCookieConsent)
      return !!p['policy'][CookiePolicyOption.PRODUCT_ANALYTICS]
    }
  }

  return undefined
}
