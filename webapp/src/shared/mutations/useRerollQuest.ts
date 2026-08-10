import { useMutation, useQueryClient } from '@tanstack/react-query'

import { APIClient } from '../clients'
import { getQuestsListsKey } from '../constants/react-query-keys'
import { useAuthedAccount } from '../hooks/useAuthedAccount'

export const useRerollQuest = () => {
  const { data: authedAccount, refetch: refetchAccount } = useAuthedAccount()

  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      return await APIClient.opensky.reRollQuest({ id })
    },
    onSuccess: (newQuestInfo) => {
      queryClient.invalidateQueries(getQuestsListsKey(authedAccount?.address))
      if (
        !!newQuestInfo.rewards?.length &&
        !!newQuestInfo.rewards.some((reward) => !!reward.exp)
      ) {
        refetchAccount()
      }
    }
  })
}
