import { ListQuestsReturn, QuestPeriodicity } from '@opensky/proto'
import clsx from 'clsx'
import { memo, useEffect, useMemo } from 'react'
import { useSnapshot } from 'valtio'

import { GlobalQueryClient } from '~/shared/clients'
import { getQuestsListsKey } from '~/shared/constants/react-query-keys'
import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { useMarkQuestsNotNew } from '~/shared/mutations/useMarkQuestsNotNew'
import { useQuestsListSegment } from '~/shared/queries/useQuestsList'
import { authenticationState } from '~/shared/state/authentication-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { QuestListQuest } from './components/QuestsListQuest'
import { QuestListStyle, QuestsBackground } from './QuestsList.css'
import { QuestsTimer } from './QuestsTimer/QuestsTimer'
import { QuestLoadingFrame } from './shared/components/QuestLoadingFrame'

interface QuestsListProps {
  periodicity: QuestPeriodicity
}

export const QuestsList = memo(({ periodicity }: QuestsListProps) => {
  const { getAssetUrl } = useGetAssetContext()

  const { userAddress } = useSnapshot(authenticationState)
  const { data: quests } = useQuestsListSegment(periodicity, userAddress)

  const markQuestsNotNew = useMarkQuestsNotNew()

  useEffect(() => {
    return () => {
      const _questsList = GlobalQueryClient.getQueryData<
        ListQuestsReturn | undefined
      >(getQuestsListsKey(authenticationState.userAddress))

      const newQuestIds = _questsList?.quests
        .filter((quest) => quest.isNew)
        .map((quest) => quest.id)

      if (!!newQuestIds?.length) {
        markQuestsNotNew.mutate(newQuestIds)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const hasExpiringQuests = useMemo(() => {
    if (!quests) return false

    const hasOnlyEpics = !quests.some((q) => !q.epicType)

    if (hasOnlyEpics) {
      const hasClaimedEpic = quests.some(
        (quest) => quest.isClaimed && quest.epicIndex === quest.epicLength
      )
      return hasClaimedEpic
    } else {
      return true
    }
  }, [quests])

  return (
    <div
      className={Sprinkles({
        width: 'full',
        height: 'full',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: { base: 'center', tabletWide: 'flex-start' },
        position: 'relative',
        paddingX: { base: '20px', mobile: '24px', tabletWide: '48px' },
        paddingTop: { base: '12px', tabletWide: '96px' }
      })}
    >
      {!!hasExpiringQuests && <QuestsTimer periodicity={periodicity} />}
      {!!getAssetUrl && (
        <img
          className={clsx(
            Sprinkles({
              width: 'full',
              height: 'full',
              position: 'absolute',
              top: 0
            }),
            QuestsBackground
          )}
          src={getAssetUrl(`webapp/backgrounds/bg-circuits-purple.webp`)}
        />
      )}
      <div
        className={clsx(
          Sprinkles({
            display: 'grid',
            width: 'full',
            height: 'full'
          }),
          QuestListStyle
        )}
      >
        {!quests ? (
          <>
            <QuestLoadingFrame />
            <QuestLoadingFrame />
            <QuestLoadingFrame />
          </>
        ) : (
          quests.map((quest) => <QuestListQuest key={quest.id} id={quest.id} />)
        )}
      </div>
    </div>
  )
})

QuestsList.displayName = 'QuestsList'
