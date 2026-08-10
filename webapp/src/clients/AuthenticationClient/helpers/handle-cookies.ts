import { Account, GetCookiePolicyReturn } from '@opensky/proto'

import { APIClient, GlobalQueryClient } from '~/shared/clients'
import { COOKIES, GDPR_COUNTRIES } from '~/shared/constants/accounts'
import { getCookiePolicyKey } from '~/shared/constants/react-query-keys'
import {
  COOKIE_POLICY_ALL,
  saveAllCookieConsent
} from '~/shared/helpers/analytics-old'

const updateCookiePolicy = (
  address: string,
  policy: GetCookiePolicyReturn['res']
) => {
  GlobalQueryClient.setQueryData<GetCookiePolicyReturn['res']>(
    getCookiePolicyKey(address),
    policy
  )
  APIClient.opensky.saveCookiePolicy({ cookieOptions: policy })
}

export const handleCookies = async (account: Account) => {
  // Global user cookie policy checks and saves
  const { res: cookiePolicyRes } = await APIClient.opensky.getCookiePolicy()

  GlobalQueryClient.setQueryData<GetCookiePolicyReturn['res']>(
    getCookiePolicyKey(account.address),
    cookiePolicyRes
  )

  const hasServerCookieSet =
    Object.keys(cookiePolicyRes ? cookiePolicyRes : []).length > 0

  const storedCookieConsent = window.localStorage.getItem('consented_cookies')

  // Parse locally stored cookie consent
  let parsedStoredCookieConsent: GetCookiePolicyReturn['res'] | undefined = undefined

  if (storedCookieConsent) {
    parsedStoredCookieConsent = JSON.parse(storedCookieConsent)['policy']
  }

  // Is non-gdpr country with nothing previously set
  const isGdprCountry =
    window.sessStorage &&
    window.sessStorage.countryCode &&
    GDPR_COUNTRIES.includes(window.sessStorage.countryCode)

  if (!isGdprCountry && !parsedStoredCookieConsent && !hasServerCookieSet) {
    saveAllCookieConsent(COOKIE_POLICY_ALL)
    updateCookiePolicy(account.address, COOKIE_POLICY_ALL)
  }

  // Has both local and global, need to check if local is different and store it if so
  if (hasServerCookieSet && parsedStoredCookieConsent) {
    let needsSaved = false
    COOKIES.forEach((cookie) => {
      if (
        !!parsedStoredCookieConsent &&
        parsedStoredCookieConsent[cookie.id] !== cookiePolicyRes[cookie.id]
      ) {
        needsSaved = true
      }
    })
    if (needsSaved) {
      updateCookiePolicy(account.address, parsedStoredCookieConsent)
    }
  }

  //Update localStorage to api consent
  if (hasServerCookieSet && !parsedStoredCookieConsent) {
    const cookiesToStoreLocally = {}
    COOKIES.forEach((cookie) => {
      if (cookiePolicyRes[cookie.id] || cookie.essential) {
        cookiesToStoreLocally[cookie.id] = true
      }
    })
    saveAllCookieConsent(cookiesToStoreLocally)
  }

  //No global cookie policy but has a local one, save it to api
  if (!hasServerCookieSet && parsedStoredCookieConsent) {
    updateCookiePolicy(account.address, parsedStoredCookieConsent)
  }
}
