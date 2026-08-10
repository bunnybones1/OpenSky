import { UserStorageKeys } from '@opensky/shared/constants'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import uniq from 'lodash-es/uniq'

import { APIClient } from '~/shared/clients'
import { getUserStorageKey } from '~/shared/constants/react-query-keys'
import { captureError } from '~/shared/helpers/sentry'

import { authenticationState } from '../state/authentication-state'

export enum FEATURE_KEYS {
  INVITE_A_FRIEND = 'INVITE_A_FRIEND'
}

export const useMarkFeatureAsSeen = () => {
  const queryClient = useQueryClient()

  return useMutation(
    (feature: FEATURE_KEYS) => {
      if (!authenticationState.userAddress) {
        throw new Error('Tried to update seen features for unauthenticated user.')
      }

      const currentSeen = queryClient.getQueryData<FEATURE_KEYS[] | undefined>(
        getUserStorageKey(
          UserStorageKeys.NEW_FEATURES_SEEN,
          authenticationState.userAddress
        )
      )

      const newIds = (
        !!currentSeen ? uniq([feature, ...currentSeen]) : [feature]
      ).sort()

      return APIClient.opensky.userStorageSave({
        key: UserStorageKeys.NEW_FEATURES_SEEN,
        object: newIds
      })
    },
    {
      onMutate: (feature) => {
        const previousFeatures = authenticationState.userAddress
          ? queryClient.getQueryData<FEATURE_KEYS[] | undefined>(
              getUserStorageKey(
                UserStorageKeys.NEW_FEATURES_SEEN,
                authenticationState.userAddress
              )
            )
          : undefined

        if (!!authenticationState.userAddress) {
          queryClient.setQueriesData<FEATURE_KEYS[] | undefined>(
            getUserStorageKey(
              UserStorageKeys.NEW_FEATURES_SEEN,
              authenticationState.userAddress
            ),
            (currentIds) => {
              return (
                !!currentIds ? uniq([feature, ...currentIds]) : [feature]
              ).sort()
            }
          )
        }

        return { previousFeatures }
      },
      onError: (error, _, context) => {
        if (!!context?.previousFeatures && !!authenticationState.userAddress) {
          queryClient.setQueriesData<FEATURE_KEYS[] | undefined>(
            getUserStorageKey(
              UserStorageKeys.NEW_FEATURES_SEEN,
              authenticationState.userAddress
            ),
            context.previousFeatures
          )
        }
        captureError(
          error,
          `Failed to Save User Storage For Key "${UserStorageKeys.NEW_FEATURES_SEEN}"`
        )
      }
    }
  )
}
