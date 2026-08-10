import { QuestPeriodicity } from '@opensky/proto'
import clsx from 'clsx'
import { memo, useMemo } from 'react'

import { APIClient } from '~/shared/clients'
import { Button } from '~/shared/components/Button'
import { Text } from '~/shared/components/Text'
import { isDefinedAndNotNull } from '~/shared/helpers/is-defined-is-not-null'
import { useQuestsList } from '~/shared/queries/useQuestsList'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { AdminQuestsRow, AdminUserQuestsCell } from './AdminUserQuests.css'

const PERIODICITY_VALUES = {
  [QuestPeriodicity.UNKNOWN]: 1,
  [QuestPeriodicity.DAILY]: 2,
  [QuestPeriodicity.WEEKLY]: 3,
  [QuestPeriodicity.SEASONAL]: 4
}

interface AdminUserQuestsProps {
  address: string
}

export const AdminUserQuests = memo(({ address }: AdminUserQuestsProps) => {
  const { data: quests } = useQuestsList(address)

  const sortedQuests = useMemo(() => {
    if (!quests?.quests) return []
    return quests.quests.sort((a, b) => {
      return PERIODICITY_VALUES[a.periodicity] - PERIODICITY_VALUES[b.periodicity]
    })
  }, [quests])

  const setPeriodicityRerollable = async (periodicity: QuestPeriodicity) => {
    try {
      const confirmed = window.confirm(
        `Are you sure you want to reset this users ${periodicity} quest rerollability?`
      )

      if (confirmed) {
        await APIClient.opensky.gMResetQuestReRolls({
          periodicity,
          accountAddress: address
        })
        window.location.reload()
      }
    } catch (error) {
      console.error(`Unable to reset ${periodicity} quests: ${error}`)
    }
  }

  const setQuestIsClaimable = async (id: number) => {
    try {
      const confirmed = window.confirm(
        'Are you sure you want to set this quest as claimable?'
      )
      if (confirmed) {
        await APIClient.opensky.gMCompleteQuest({ id, accountAddress: address })
        window.location.reload()
      }
    } catch (error) {
      console.error(`Unable to set quest as claimable: ${error}`)
    }
  }
  const forceReroll = async (id: number) => {
    try {
      const confirmed = window.confirm(
        'Are you sure you want to force-reroll this quest? all its progress will be lost.'
      )
      if (confirmed) {
        await APIClient.opensky.gMDeleteQuest({ id, accountAddress: address })
        window.location.reload()
      }
    } catch (error) {
      console.error(`Unable to force-reroll quest: ${error}`)
    }
  }

  return (
    <div
      className={Sprinkles({
        width: 'full',
        padding: '16px',
        backgroundColor: 'purple2',
        border: '1px solid',
        borderColor: 'purple6',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'flex-start'
      })}
    >
      <div
        className={Sprinkles({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          width: 'full'
        })}
      >
        <Text color="purple9" fontSize="26px" fontWeight="700">
          Quests
        </Text>
        <div
          className={Sprinkles({ display: 'flex', alignItems: 'center' })}
          style={{ columnGap: '8px' }}
        >
          <Text color="white" fontWeight="500" fontSize="14px" marginRight="4px">
            Reset Rerollability:
          </Text>
          <Button
            frameType="rounded"
            onClick={() => setPeriodicityRerollable(QuestPeriodicity.DAILY)}
            colorType="default"
            text="Daily"
          />
          <Button
            frameType="rounded"
            onClick={() => setPeriodicityRerollable(QuestPeriodicity.WEEKLY)}
            colorType="default"
            text="Weekly"
          />
          <Button
            frameType="rounded"
            onClick={() => setPeriodicityRerollable(QuestPeriodicity.SEASONAL)}
            colorType="default"
            text="Daily"
          />
        </div>
      </div>
      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            display: 'grid',
            backgroundColor: 'purple1',
            borderTop: '1px solid',
            borderRight: '1px solid',
            borderColor: 'purple7',
            alignItems: 'center'
          }),
          AdminQuestsRow
        )}
      >
        <Text
          className={AdminUserQuestsCell}
          fontSize="16px"
          textAlign="center"
          color="purple9"
          fontWeight="600"
        >
          Period
        </Text>
        <Text
          className={AdminUserQuestsCell}
          fontSize="16px"
          textAlign="center"
          color="purple9"
          fontWeight="600"
        >
          Type
        </Text>
        <Text
          className={AdminUserQuestsCell}
          fontSize="16px"
          textAlign="center"
          color="purple9"
          fontWeight="600"
        >
          Reward
        </Text>
        <Text
          className={AdminUserQuestsCell}
          fontSize="16px"
          textAlign="center"
          color="purple9"
          fontWeight="600"
        >
          Progress
        </Text>
        <Text
          className={AdminUserQuestsCell}
          fontSize="16px"
          textAlign="center"
          color="purple9"
          fontWeight="600"
        >
          Epic Progress
        </Text>
        <Text
          className={AdminUserQuestsCell}
          fontSize="16px"
          textAlign="center"
          color="purple9"
          fontWeight="600"
        >
          Rerollable?
        </Text>
        <Text
          className={AdminUserQuestsCell}
          fontSize="16px"
          textAlign="center"
          color="purple9"
          fontWeight="600"
        >
          Claimed?
        </Text>
        <Text
          className={AdminUserQuestsCell}
          fontSize="16px"
          textAlign="center"
          color="purple9"
          fontWeight="600"
        >
          Claimable?
        </Text>
        <Text
          className={AdminUserQuestsCell}
          fontSize="16px"
          textAlign="center"
          color="purple9"
          fontWeight="600"
        >
          Force Reroll
        </Text>
      </div>
      {sortedQuests.map((quest) => (
        <div
          className={clsx(
            Sprinkles({
              width: 'full',
              display: 'grid',
              backgroundColor: 'purple1',
              borderRight: '1px solid',
              borderColor: 'purple7',
              alignItems: 'center'
            }),
            AdminQuestsRow
          )}
          key={quest.id}
        >
          <Text className={AdminUserQuestsCell} fontSize="12px" color="white">
            {quest.periodicity}
          </Text>
          <Text className={AdminUserQuestsCell} fontSize="12px" color="white">
            {quest.questType}
          </Text>
          <div className={AdminUserQuestsCell}>
            <Text marginRight="4px" fontSize="12px" color="white">
              {quest.reward.amount}
            </Text>
            <Text fontSize="12px" color="purple7">
              {quest.reward.itemType}
            </Text>
          </div>
          <Text className={AdminUserQuestsCell} fontSize="12px" color="white">
            {`${quest.progress}/${quest.endProgress}`}
          </Text>
          <Text className={AdminUserQuestsCell} fontSize="12px" color="white">
            {isDefinedAndNotNull(quest.epicIndex) &&
            isDefinedAndNotNull(quest.epicLength)
              ? `${quest.epicIndex}/${quest.epicLength}`
              : 'N/A'}
          </Text>
          <Text className={AdminUserQuestsCell} fontSize="12px" color="white">
            {quest.isRerollable ? '✅' : '❌'}
          </Text>
          <Text className={AdminUserQuestsCell} fontSize="12px" color="white">
            {quest.isClaimed ? '✅' : '❌'}
          </Text>
          {quest.isClaimable ? (
            <Text className={AdminUserQuestsCell} fontSize="12px" color="white">
              {'✅'}
            </Text>
          ) : (
            <div className={AdminUserQuestsCell}>
              <Button
                frameType="rounded"
                onClick={() => setQuestIsClaimable(quest.id)}
                colorType="default"
                text="Set Claimable"
              />
            </div>
          )}
          <div className={AdminUserQuestsCell}>
            <Button
              frameType="rounded"
              onClick={() => forceReroll(quest.id)}
              colorType="default"
              text="Force Reroll"
            />
          </div>
        </div>
      ))}
    </div>
  )
})

AdminUserQuests.displayName = 'AdminUserQuests'
