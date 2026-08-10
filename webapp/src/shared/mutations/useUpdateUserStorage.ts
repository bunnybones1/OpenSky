import { UserStorageKeys } from '@opensky/shared/constants'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { APIClient } from '~/shared/clients'
import { getUserStorageKey } from '~/shared/constants/react-query-keys'
import { captureError } from '~/shared/helpers/sentry'

import { authenticationState } from '../state/authentication-state'

export const useUpdateUserStorage = () => {
  const queryClient = useQueryClient()

  return useMutation(
    ({ key, value }: { key: UserStorageKeys; value: any }) => {
      if (!authenticationState.userAddress) {
        throw new Error('Tried to update seen features for unauthenticated user.')
      }

      return APIClient.opensky.userStorageSave({ key, object: value })
    },
    {
      onMutate: ({ key, value }) => {
        const previousValue = !!authenticationState.userAddress
          ? queryClient.getQueryData<any | undefined>(
              getUserStorageKey(key, authenticationState.userAddress)
            )
          : undefined

        if (!!authenticationState.userAddress) {
          queryClient.setQueriesData<number | undefined>(
            getUserStorageKey(key, authenticationState.userAddress),
            value
          )
        }

        return { previousValue }
      },
      onError: (error, { key }, context) => {
        if (!!context?.previousValue && !!authenticationState.userAddress) {
          queryClient.setQueriesData<number | undefined>(
            getUserStorageKey(key, authenticationState.userAddress),
            context.previousValue
          )
        }
        captureError(
          error,
          `Failed to Save User Storage For Key "${UserStorageKeys.SEEN_INVITE_POINTS}"`
        )
      }
    }
  )
}
