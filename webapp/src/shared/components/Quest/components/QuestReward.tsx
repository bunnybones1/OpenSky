import { ItemType } from '@opensky/proto'
import clsx from 'clsx'
import { memo } from 'react'

import { useGetAssetContext } from '~/shared/hooks/useGetAssetContext'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { Icon } from '../../Icon/Icon'
import {
  QuestRewardAmount,
  QuestRewardImage,
  QuestRewardLock,
  QuestRewardStyle
} from './QuestReward.css'

interface QuestRewardProps {
  rewardItemType: ItemType
  rewardAmount: number
  isClaimed?: boolean
}

export const QuestReward = memo(({ rewardAmount, isClaimed }: QuestRewardProps) => {
  const { getAssetUrl } = useGetAssetContext()
  return (
    <div
      className={clsx(
        Sprinkles({
          position: 'absolute',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderColor: 'purple8',
          border: '1px solid',
          zIndex: 3
        }),
        QuestRewardStyle
      )}
    >
      {!isClaimed && (
        <div className={clsx(Sprinkles({ position: 'absolute' }), QuestRewardLock)}>
          <Icon height="16px" type="lock-stroke" color="purple8" />
        </div>
      )}
      {!!getAssetUrl && (
        <img
          className={QuestRewardImage}
          src={getAssetUrl('webapp/icons/xp-symbol-new.webp')}
        />
      )}
      <div
        className={clsx(
          Sprinkles({
            color: 'white',
            marginTop: '4px'
          }),
          QuestRewardAmount
        )}
      >
        {rewardAmount}
      </div>
    </div>
  )
})

QuestReward.displayName = 'QuestReward'
