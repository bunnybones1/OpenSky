import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useSnapshot } from 'valtio'

import { Banner } from '~/lib/proto'
import { APIClient } from '~/shared/clients'
import { BANNERS } from '~/shared/constants/react-query-keys'
import { ONE_DAY } from '~/shared/constants/time'

import { authenticationState } from '../state/authentication-state'

export const bannersFetcher = async () => {
  const { banners } = await APIClient.opensky.getBanners()
  return banners
}

export const useBanners = (enabled = true) => {
  const { userAddress } = useSnapshot(authenticationState)

  return useQuery(
    BANNERS,
    async () => {
      const banners = await bannersFetcher()

      if (!banners) return [] as Banner[]

      return banners
        .sort((a, b) => b.order - a.order)
        .filter((banner) => {
          const ignored = window.localStorage.getItem(
            `DISCLAIMER_IGNORE_${banner.id}`
          )
          return !ignored
        })
    },
    {
      enabled: enabled && !!userAddress,
      staleTime: ONE_DAY
    }
  )
}

export const useSetBanners = () => {
  const queryClient = useQueryClient()
  return useCallback(
    (banners: Banner[]) => {
      queryClient.setQueryData<Banner[] | undefined>(BANNERS, banners)
    },
    [queryClient]
  )
}
