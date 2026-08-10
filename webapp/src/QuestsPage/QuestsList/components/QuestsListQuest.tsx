import { useQueryClient } from '@tanstack/react-query'
import clsx from 'clsx'
import { motion } from 'framer-motion'
import { memo, useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { useSnapshot } from 'valtio'

import { Quest } from '~/shared/components/Quest/Quest'
import { getQuestsListsKey } from '~/shared/constants/react-query-keys'
import { useClaimQuest } from '~/shared/mutations/useClaimQuest'
import { useMarkQuestsNotNew } from '~/shared/mutations/useMarkQuestsNotNew'
import { useRerollQuest } from '~/shared/mutations/useRerollQuest'
import { useQuest } from '~/shared/queries/useQuestsList'
import { authenticationState } from '~/shared/state/authentication-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'
import { QuestDifficulty } from '~/shared/types/quests'

import { QuestLoadingFrame } from '../shared/components/QuestLoadingFrame'
import { QuestListQuestStyle } from './QuestsListQuest.css'

const PositionToDifficultyMap = [
  QuestDifficulty.EASY,
  QuestDifficulty.EASY,
  QuestDifficulty.MEDIUM,
  QuestDifficulty.HARD
]

interface QuestListQuestProps {
  id: number
}

export const QuestListQuest = memo(({ id }: QuestListQuestProps) => {
  const markQuestsNotNew = useMarkQuestsNotNew()
  const claimQuest = useClaimQuest()
  const rerollQuest = useRerollQuest()
  const queryClient = useQueryClient()
  const timeoutRef = useRef<number | null>(null)

  const { userAddress } = useSnapshot(authenticationState)
  const { data: quest } = useQuest(id, userAddress)

  const hasAnotherEpicQuest =
    !!quest?.epicIndex && !!quest?.epicLength && quest.epicIndex !== quest.epicLength

  const hasAnotherEpicRef = useRef<boolean>(hasAnotherEpicQuest)

  const onSee = useCallback(() => {
    markQuestsNotNew.mutate([id])
  }, [id, markQuestsNotNew])

  const onClaim = useCallback(async () => {
    const { quest: newQuest } = await claimQuest.mutateAsync(id)

    if ((hasAnotherEpicQuest || newQuest) && !!authenticationState.userAddress) {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = window.setTimeout(() => {
        queryClient.invalidateQueries(
          getQuestsListsKey(authenticationState.userAddress)
        )
      }, 1000)
    }
  }, [claimQuest, hasAnotherEpicQuest, id, queryClient])

  useLayoutEffect(() => {
    hasAnotherEpicRef.current = hasAnotherEpicQuest
  }, [hasAnotherEpicQuest])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current)

        if (!!authenticationState.userAddress && !!hasAnotherEpicRef.current) {
          // Have to do this because of the faked loading state when a non-end
          // epic quest is claimed.
          queryClient.invalidateQueries(
            getQuestsListsKey(authenticationState.userAddress)
          )
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onReroll = useCallback(() => {
    rerollQuest.mutate(id)
  }, [id, rerollQuest])

  if (!quest) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        key={`${id}-loading`}
        transition={{ duration: 0.5, ease: 'easeIn' }}
        className={Sprinkles({ width: 'full' })}
      >
        <QuestLoadingFrame />
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      key={id}
      transition={{ duration: 0.5, ease: 'easeIn' }}
      data-id-quest-position={quest.position}
      data-id-quest-type={quest.questType}
      data-id-claimable={quest.isClaimable}
      className={clsx(Sprinkles({ width: 'full' }), QuestListQuestStyle)}
    >
      <Quest
        difficulty={PositionToDifficultyMap[quest.position]}
        progress={quest.progress}
        endProgress={quest.endProgress}
        rewardItemType={quest.reward.itemType}
        rewardAmount={quest.reward.amount}
        isClaimed={quest.isClaimed}
        isClaimable={quest.isClaimable}
        isRerollable={quest.isRerollable}
        type={quest.questType}
        id={quest.id}
        epicIndex={quest.epicIndex}
        epicLength={quest.epicLength}
        isNew={quest.isNew}
        onSee={onSee}
        onReroll={onReroll}
        onClaim={onClaim}
        isClaiming={claimQuest.isLoading}
        isRerolling={rerollQuest.isLoading}
      />
    </motion.div>
  )
})

QuestListQuest.displayName = 'QuestListQuest'
