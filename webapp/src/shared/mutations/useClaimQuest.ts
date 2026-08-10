import { ListQuestsReturn, RewardType } from '@opensky/proto'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { produce } from 'immer'

import { APIClient } from '../clients'
import { getQuestsListsKey, SKYPASS_INFO } from '../constants/react-query-keys'
import { useAuthedAccount } from '../hooks/useAuthedAccount'

export const useClaimQuest = () => {
  const { data: authedAccount, refetch: refetchAccount } = useAuthedAccount()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      if (!authedAccount)
        throw new Error('Unable to claim rewards without signing in.')

      return await APIClient.opensky.claimQuestRewards({
        accountAddress: authedAccount.address,
        ids: [id]
      })
    },
    onSuccess: (data, id) => {
      let xpAmount = 0

      data.rewards.forEach((reward) => {
        if (reward.type === RewardType.EXP && !!reward.exp) {
          xpAmount = xpAmount + reward.exp.amount
        }
      })

      if (!!xpAmount && !!authedAccount) {
        // Refetch the account data to get the correct new xp info.
        refetchAccount()
        queryClient.invalidateQueries(SKYPASS_INFO)

        // Set the quest to isClaimed: true / isClaimable: false
        queryClient.setQueryData<ListQuestsReturn | null | undefined>(
          getQuestsListsKey(authedAccount.address),
          (data) => {
            if (!data) return data

            return produce(data, (draft) => {
              draft.quests = draft.quests.map((quest) => {
                if (quest.id === id)
                  return { ...quest, isClaimed: true, isClaimable: false }
                return quest
              })
            })
          }
        )
      }
    }
  })
}
