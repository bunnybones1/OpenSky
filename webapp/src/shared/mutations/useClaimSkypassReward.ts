import { useMutation, useQueryClient } from '@tanstack/react-query'
import { produce } from 'immer'

import { APIClient } from '~/shared/clients'
import { SKYPASS_INFO } from '~/shared/constants/react-query-keys'
import { captureError } from '~/shared/helpers/sentry'
import { SkyPassInfo } from '~/shared/queries/useSkyPassInfo'

export const useClaimSkypassReward = () => {
  const queryClient = useQueryClient()

  return useMutation(
    async ({ id }: { id: number; level: number }) => {
      const res = await APIClient.opensky.claimSkypassRewards({
        ids: [Number(id)]
      })
      return res
    },
    {
      onError: (error) => {
        captureError(error, 'Error claiming skypass reward')
      },
      onSuccess: (res, { id, level }) => {
        queryClient.setQueryData<SkyPassInfo | undefined>(SKYPASS_INFO, (data) => {
          if (!data) return data
          return produce(data, (draft) => {
            if (draft.levels[level]) {
              draft.levels[level].rewards = draft.levels[level].rewards.map(
                (_reward) => {
                  if (_reward.id === id) {
                    return {
                      ..._reward,
                      gainedRewards: res.rewards
                    }
                  }
                  return _reward
                }
              )
            }
            return draft
          })
        })
      }
    }
  )
}
