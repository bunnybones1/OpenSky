import { useMutation, useQueryClient } from '@tanstack/react-query'

import { GetCookiePolicyReturn } from '~/lib/proto'
import { APIClient } from '~/shared/clients'
import { captureError } from '~/shared/helpers/sentry'

import { getCookiePolicyKey } from '../constants/react-query-keys'
import { authenticationState } from '../state/authentication-state'

export const useSaveCookiePolicy = () => {
  const queryClient = useQueryClient()
  return useMutation(
    (policy: GetCookiePolicyReturn['res']) =>
      APIClient.opensky.saveCookiePolicy({ cookieOptions: policy }),
    {
      onMutate: (policy) => {
        const currentPolicy = queryClient.getQueryData<
          GetCookiePolicyReturn['res'] | undefined
        >(getCookiePolicyKey(authenticationState.userAddress))

        if (!!authenticationState.userAddress) {
          queryClient.setQueryData<GetCookiePolicyReturn['res'] | undefined>(
            getCookiePolicyKey(authenticationState.userAddress),
            policy
          )
        }

        return { currentPolicy }
      },
      onError: (err, _, context) => {
        captureError(err, 'Error saving cookie policy')
        if (!!authenticationState.userAddress && !!context?.currentPolicy) {
          queryClient.setQueryData<GetCookiePolicyReturn['res'] | undefined>(
            getCookiePolicyKey(authenticationState.userAddress),
            context.currentPolicy
          )
        }
      }
    }
  )
}
