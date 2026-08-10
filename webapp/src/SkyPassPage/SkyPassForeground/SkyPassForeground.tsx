/* eslint-disable valtio/state-snapshot-rule */
import { memo, useEffect, useMemo } from 'react'
import { useSnapshot } from 'valtio'

import { useAuthedAccount } from '~/shared/hooks/useAuthedAccount'
import { useSkyPassInfo } from '~/shared/queries/useSkyPassInfo'
import { useSelector } from '~/shared/redux/index'
import { skyPassParamsSelector } from '~/shared/redux/router/selectors'
import {
  RewardCardsType,
  skypassSelectorState,
  updateSkypassSelectorState
} from '~/shared/state/skypass-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { useSkyPassPaymentEffects } from './hooks/useSkyPassPaymentEffects'
import { Level } from './Level/Level'
import { RewardsCarousel } from './RewardsCarousel/RewardsCarousel'
import { SkyPassClaimReward } from './SkyPassClaimReward/SkyPassClaimReward'

export const SkyPassForeground = memo(() => {
  const { data: authedAccount } = useAuthedAccount()
  const { data: skyPassInfo, refetch } = useSkyPassInfo()
  const {
    selectedLevelAndReward,
    claimedRewards,
    claimedRewardCards,
    loadingClaimingReward,
    paymentHasCompleted
  } = useSnapshot(skypassSelectorState)

  const skyPassParams = useSelector(skyPassParamsSelector)

  const hasPremium = skyPassInfo?.hasPremium

  useSkyPassPaymentEffects(refetch, hasPremium)

  useEffect(() => {
    if (
      skyPassParams?.level !== undefined &&
      (!selectedLevelAndReward ||
        selectedLevelAndReward.level !== skyPassParams.level)
    ) {
      updateSkypassSelectorState('selectedLevelAndReward', {
        level: skyPassParams.level,
        reward: skyPassParams.reward
      })
    }
    return () => {
      if (!!claimedRewards) refetch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const isEarned = useMemo(() => {
    const levels = skyPassInfo?.levels
    if (!!levels && !!selectedLevelAndReward) {
      const selectedLevel = levels.find(
        (_level) => _level.level === selectedLevelAndReward.level
      )

      if (!!selectedLevel) return selectedLevel.earned
    }
    return false
  }, [selectedLevelAndReward, skyPassInfo?.levels])

  return (
    <div
      className={Sprinkles({
        width: 'full',
        position: 'relative',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end'
      })}
    >
      <div
        className={Sprinkles({
          width: 'full',
          position: 'relative',
          flex: 1,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: { base: '4px', tablet: '0px', desktop: '16px' }
        })}
      >
        {skyPassInfo?.levels && (
          <>
            <Level
              userLevel={Number(authedAccount?.seasonLevel)}
              levelUpXP={Number(authedAccount?.levelUpXP)}
              experience={Number(authedAccount?.experience)}
              seasonName={String(skyPassInfo?.seasonName)}
              seasonNumber={Number(skyPassInfo?.seasonNumber)}
              hasPremium={skyPassInfo?.hasPremium}
              paymentLoading={paymentHasCompleted === false}
            />
            <SkyPassClaimReward
              userLevel={Number(authedAccount?.seasonLevel)}
              claimedRewards={claimedRewards as number[]}
              claimedRewardCards={claimedRewardCards as RewardCardsType[]}
              isEarned={isEarned}
              hasPremium={skyPassInfo.hasPremium}
              cardBackName={skyPassInfo?.cardBackName as string}
              loadingClaimingReward={loadingClaimingReward}
            />
          </>
        )}
      </div>
      <RewardsCarousel />
    </div>
  )
})

SkyPassForeground.displayName = 'SkyPassForeground'
