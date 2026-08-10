import { useMutation, useQueryClient } from '@tanstack/react-query'
import { produce } from 'immer'

import { ListQuestsReturn } from '~/lib/proto'
import { APIClient } from '~/shared/clients'
import { getQuestsListsKey } from '~/shared/constants/react-query-keys'
import { captureError } from '~/shared/helpers/sentry'

import { authenticationState } from '../state/authentication-state'

export const useMarkQuestsNotNew = () => {
  const queryClient = useQueryClient()

  return useMutation(
    async (ids: number[]) => {
      await APIClient.opensky.setQuestsAsSeen({ ids })
    },
    {
      onMutate: (ids) => {
        if (!!authenticationState.userAddress) {
          queryClient.setQueryData<ListQuestsReturn | undefined>(
            getQuestsListsKey(authenticationState.userAddress),
            (data) => {
              if (!data) return data

              return produce(data, (draft) => {
                draft.quests = draft.quests.map((quest) => {
                  if (ids.includes(quest.id)) {
                    return { ...quest, isNew: false }
                  }
                  return quest
                })
              })
            }
          )
        }
      },
      onError: (error, ids) => {
        if (!!authenticationState.userAddress) {
          queryClient.setQueryData<ListQuestsReturn | undefined>(
            getQuestsListsKey(authenticationState.userAddress),
            (data) => {
              if (!data) return data

              return produce(data, (draft) => {
                draft.quests = draft.quests.map((quest) => {
                  if (ids.includes(quest.id)) {
                    return { ...quest, isNew: false }
                  }
                  return quest
                })
              })
            }
          )
        }
        captureError(error, 'Error quests quests not new')
      }
    }
  )
}
