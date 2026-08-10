import { i18n, LOCALE_LOCAL_STORAGE_KEY } from '@opensky/language-manager'
import { Account } from '@opensky/proto'

import { GlobalQueryClient } from '~/shared/clients'
import { getUseAccountKey } from '~/shared/constants/react-query-keys'
import { setUser } from '~/shared/helpers/sentry'
import { updateAuthenticationState } from '~/shared/state/authentication-state'

export const setAuthenticatedUser = (account: Account) => {
  if (account.locale) {
    localStorage.setItem(LOCALE_LOCAL_STORAGE_KEY, account.locale)
    i18n.changeLanguage(account.locale)
  }
  // Set the users fetched account in the react-query cache
  GlobalQueryClient.setQueryData<Account | undefined>(
    getUseAccountKey(account.address),
    account
  )

  updateAuthenticationState('userAddress', account.address)

  // Set the authenticated user in sentry
  setUser(account.address, account.name)
}
