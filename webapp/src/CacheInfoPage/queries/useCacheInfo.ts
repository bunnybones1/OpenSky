import {
  CacheInfo,
  getExhaustiveAndExpensiveCacheStorageInfo
} from '@opensky/shared/cache'
import { useQuery } from '@tanstack/react-query'

import { CACHE_INFO } from '~/shared/constants/react-query-keys'

/**
 *
 * Fetches and stores info about the users cache storage
 */
export const useCacheInfo = () => {
  return useQuery<CacheInfo, Error>(
    CACHE_INFO,
    getExhaustiveAndExpensiveCacheStorageInfo,
    {
      retry: false
    }
  )
}
