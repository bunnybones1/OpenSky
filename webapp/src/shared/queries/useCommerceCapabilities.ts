import { useQuery } from '@tanstack/react-query'

import { identityClient } from '~/clients/IdentityClient/IdentityClient'
import env from '~/env'
import { COMMERCE_CAPABILITIES } from '~/shared/constants/react-query-keys'
import { ONE_MINUTE } from '~/shared/constants/time'

export const useCommerceCapabilities = () =>
  useQuery(COMMERCE_CAPABILITIES, () => identityClient.getCommerceCapabilities(), {
    enabled: env.AUTH_MODE === 'google',
    staleTime: ONE_MINUTE
  })
