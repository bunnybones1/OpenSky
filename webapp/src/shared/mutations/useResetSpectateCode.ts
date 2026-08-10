import { useMutation, useQueryClient } from '@tanstack/react-query'

import { APIClient } from '~/shared/clients'
import { getSpectateCodeKey } from '~/shared/constants/react-query-keys'
import { captureError } from '~/shared/helpers/sentry'

import { authenticationState } from '../state/authentication-state'

/**
 * Returns a mutation that will reset the users spectate
 * code and update the cached value for the key
 * `['SPECTATE_CODE', { address }]` where `address` is the current
 * authenticated users address.
 *
 */
export const useResetSpectateCode = () => {
  const queryClient = useQueryClient()

  return useMutation(
    async () => {
      if (!authenticationState.userAddress) {
        throw new Error('Tried to update seen features for unauthenticated user.')
      }

      const { code } = await APIClient.opensky.getPrivateSpectateCode({
        reset: true
      })

      return code
    },
    {
      onError(error) {
        captureError(error, 'Failed to reset users spectate code')
      },
      onSuccess(data) {
        if (!!authenticationState.userAddress) {
          queryClient.setQueryData(
            getSpectateCodeKey(authenticationState.userAddress),
            data
          )
        }
      }
    }
  )
}
