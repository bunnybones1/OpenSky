import { i18n, LOCALE_LOCAL_STORAGE_KEY } from '@opensky/language-manager'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { produce } from 'immer'

import { Account } from '~/lib/proto'
import { APIClient } from '~/shared/clients'
import { trackSaveAccount } from '~/shared/helpers/analytics-old'
import { captureError } from '~/shared/helpers/sentry'

import { getUseAccountKey } from '../constants/react-query-keys'
import { getAuthedAccount } from '../hooks/useAuthedAccount'
import { authenticationState } from '../state/authentication-state'

interface UpdateAccountArgs {
  name?: string
  locale?: string
  region?: string
  tagArtID?: string
  titleID?: number
}

interface AccountUpdate extends Partial<Account> {
  address: string
}

export const useUpdatedAuthedAccount = () => {
  const queryClient = useQueryClient()

  return useMutation(
    async ({ name, region, locale, tagArtID, titleID }: UpdateAccountArgs) => {
      const address = authenticationState.userAddress

      if (!address) {
        throw new Error('Tried to update unauthenticated account')
      } else {
        const authedAccount = getAuthedAccount()

        const update: AccountUpdate = {
          address,
          region: authedAccount?.region,
          name: authedAccount?.name,
          locale: authedAccount?.locale,
          tagArtID: authedAccount?.tagArtID,
          titleID: authedAccount?.titleID
        }

        if (region) update.region = region
        if (locale) update.locale = locale
        if (name) update.name = name
        if (tagArtID) update.tagArtID = tagArtID
        if (titleID) update.titleID = titleID

        if (Object.keys(update).length === 1) {
          throw new Error('Tried to call updateAccount with no args')
        }

        // TODO: Make ticket for backend to change this endpoint. Shouldnt
        // require a full account.
        const { account } = await APIClient.opensky.updateAccount({
          account: update as any
        })

        // TODO: Update this to include region etc
        trackSaveAccount(true, account.name, 0)

        if (account.locale) {
          localStorage.setItem(LOCALE_LOCAL_STORAGE_KEY, account.locale)
          i18n.changeLanguage(account.locale)
        }
      }
    },
    {
      onMutate: ({
        name,
        region,
        locale,
        tagArtID,
        titleID
      }): {
        previousAccount: Account | undefined
        address: string | undefined
      } => {
        const address = authenticationState.userAddress

        let previousAccount: Account | undefined = undefined

        if (!!address) {
          previousAccount = queryClient.getQueryData<Account | undefined>(
            getUseAccountKey(address)
          )

          queryClient.setQueryData<Account | undefined>(
            getUseAccountKey(address),
            (account) => {
              if (!account) return
              return produce(account, (draft) => {
                if (!!name && name !== draft.name) draft.name = name
                if (!!region && region !== draft.region) draft.region = region
                if (!!locale && locale !== draft.locale) draft.locale = locale
                if (!!titleID && titleID !== draft.titleID) draft.titleID = titleID
                if (!!tagArtID && tagArtID !== draft.tagArtID) {
                  draft.tagArtID = tagArtID
                }
              })
            }
          )
        }

        return { previousAccount, address }
      },
      onError: (error, _, context) => {
        if (!!context?.previousAccount && !!context?.address) {
          queryClient.setQueryData<Account | undefined>(
            getUseAccountKey(context.address),
            context.previousAccount
          )
        }
        captureError(error, 'Error updating account', false)
        if (
          error instanceof Error &&
          error.message &&
          typeof error.message === 'string' &&
          error.message.includes('duplicated account name')
        ) {
          throw new Error('already_exists')
        }
      }
    }
  )
}
