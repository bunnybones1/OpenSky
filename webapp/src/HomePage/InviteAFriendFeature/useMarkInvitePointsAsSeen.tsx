import { UserStorageKeys } from '@opensky/shared/constants'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { APIClient } from '~/shared/clients'
import { getUserStorageKey } from '~/shared/constants/react-query-keys'
import { captureError } from '~/shared/helpers/sentry'
import { authenticationState } from '~/shared/state/authentication-state'

export const useMarkInvitePointsAsSeen = () => {
  const queryClient = useQueryClient()

  return useMutation(
    (points: number) => {
      if (!authenticationState.userAddress) {
        throw new Error('Tried to update seen features for unauthenticated user.')
      }

      return APIClient.opensky.userStorageSave({
        key: UserStorageKeys.SEEN_INVITE_POINTS,
        object: points
      })
    },
    {
      onMutate: (points) => {
        const previousPoints = !!authenticationState.userAddress
          ? queryClient.getQueryData<number | undefined>(
              getUserStorageKey(
                UserStorageKeys.SEEN_INVITE_POINTS,
                authenticationState.userAddress
              )
            )
          : undefined

        if (!!authenticationState.userAddress) {
          queryClient.setQueriesData<number | undefined>(
            getUserStorageKey(
              UserStorageKeys.SEEN_INVITE_POINTS,
              authenticationState.userAddress
            ),
            points
          )
        }

        return { previousPoints }
      },
      onError: (error, _, context) => {
        if (!!context?.previousPoints && !!authenticationState.userAddress) {
          queryClient.setQueriesData<number | undefined>(
            getUserStorageKey(
              UserStorageKeys.SEEN_INVITE_POINTS,
              authenticationState.userAddress
            ),
            context.previousPoints
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
