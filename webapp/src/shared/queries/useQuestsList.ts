import { QuestPeriodicity } from '@opensky/proto'
import { useQuery } from '@tanstack/react-query'

import { APIClient } from '../clients'
import { getQuestsListsKey } from '../constants/react-query-keys'
import { ONE_DAY } from '../constants/time'

const questFetcher = (accountAddress?: string) => async () => {
  if (!accountAddress) return null
  const res = await APIClient.opensky.listQuests({ accountAddress })
  // work around webrpc bug, it returns null instead of []
  if (res.quests === null) {
    res.quests = []
  }
  return res
}

export const useQuestsList = (accountAddress?: string) => {
  return useQuery({
    queryKey: getQuestsListsKey(accountAddress),
    queryFn: questFetcher(accountAddress),
    enabled: !!accountAddress,
    staleTime: ONE_DAY
  })
}

export const useQuestsListSegment = (
  periodicity: QuestPeriodicity,
  accountAddress?: string
) => {
  return useQuery({
    queryKey: getQuestsListsKey(accountAddress),
    queryFn: questFetcher(accountAddress),
    enabled: !!accountAddress,
    select: (data) => {
      if (!data) return data
      return data.quests
        .filter((quest) => quest.periodicity === periodicity)
        .sort((a, b) => {
          return a.position - b.position
        })
    },
    staleTime: ONE_DAY
  })
}

export const useQuest = (id: number, accountAddress?: string) => {
  return useQuery({
    queryKey: getQuestsListsKey(accountAddress),
    queryFn: questFetcher(accountAddress),
    enabled: !!accountAddress,
    select: (data) => {
      if (!data) return data
      return data.quests.find((quest) => quest.id === id)
    },
    staleTime: ONE_DAY
  })
}
