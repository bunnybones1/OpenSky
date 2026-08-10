import { memo, ReactNode, useMemo } from 'react'

import { Box, FlexBox, Text } from '~/shared/components/Base'

import { DynamicProgressBar, DynamicProgressBarProps } from './DynamicProgressBar'

interface DefaultReward {
  requiredPoints: number
  id: string | number
}

interface DynamicProgressWithRewardsProps<T extends DefaultReward>
  extends DynamicProgressBarProps {
  rewards: T[]
  renderReward: (reward: T) => ReactNode
  rewardHeight: number[]
  getCurrentProgress?: () => number
  getRewardPoints?: (reward: T) => number
}

const _DynamicProgressWithRewards = <T extends DefaultReward>({
  rewards,
  renderReward,
  progress,
  endProgress,
  rewardHeight,
  getRewardPoints,
  getCurrentProgress,
  ...dynamicProgressProps
}: DynamicProgressWithRewardsProps<T>) => {
  const currentPointsPosition = useMemo(() => {
    if (progress >= endProgress) return 100
    return (progress / endProgress) * 100
  }, [progress, endProgress])

  const rewardPositions = useMemo(() => {
    return rewards.reduce(
      (prev, curr) => {
        return {
          ...prev,
          [curr.id]: (curr.requiredPoints / endProgress) * 100
        }
      },
      {} as { [key: string]: number }
    )
  }, [rewards, endProgress])

  const renderedRewards = useMemo(() => {
    return rewards.map((reward) => {
      const position = rewardPositions[reward.id]
      if (!position) return null
      return (
        <FlexBox
          key={reward.id}
          height="100%"
          width="1px"
          position="absolute"
          bottom={0}
          overflow="visible"
          left={`calc(${position}% - 1px)`}
        >
          <FlexBox
            position="absolute"
            left="50%"
            style={{
              transform: 'translateX(-50%)'
            }}
            bottom={0}
            height="100%"
            width="auto"
            flexDirection="column"
            alignItems="center"
            justifyContent="flex-end"
          >
            {renderReward(reward)}
            <Text
              fontSize={14}
              color="purple8"
              fontWeight="medium"
              lineHeight="22px"
              mt="4px"
            >
              {!!getRewardPoints ? getRewardPoints(reward) : reward.requiredPoints}
            </Text>
            <Box
              height="10px"
              width="2px"
              style={{
                background:
                  'linear-gradient(360deg, #705BAB 40%, rgba(112, 91, 171, 0) 100%)'
              }}
            />
          </FlexBox>
        </FlexBox>
      )
    })
  }, [rewards, rewardPositions, renderReward, getRewardPoints])

  const rewardHeightsWithPadding = useMemo(() => {
    return rewardHeight.map((rh) => rh + 36)
  }, [rewardHeight])

  return (
    <FlexBox
      flexDirection="column"
      alignItems="flex-start"
      justifyContent="flex-start"
      flexShrink={0}
      width="100%"
      pb="24px"
      position="relative"
    >
      <Box height={rewardHeightsWithPadding} width="100%" position="relative">
        {renderedRewards}
      </Box>
      <DynamicProgressBar
        progress={progress}
        endProgress={endProgress}
        includeBorders
        {...dynamicProgressProps}
      />
      <FlexBox
        position="absolute"
        width="1px"
        height="1px"
        bottom={0}
        bg="transparent"
        overflow="visible"
        alignItems="center"
        justifyContent="center"
        style={{
          left: `calc(${currentPointsPosition}% - 1px)`
        }}
      >
        <Text
          position="absolute"
          left="50%"
          style={{
            transform: 'translateX(-50%)'
          }}
          bottom={0}
          color="purple9"
          fontSize={12}
          fontWeight="medium"
        >
          {!!getCurrentProgress ? getCurrentProgress() : progress}
        </Text>
      </FlexBox>
    </FlexBox>
  )
}

_DynamicProgressWithRewards.displayName = '_DynamicProgressWithRewards'

export const DynamicProgressWithRewards = memo(_DynamicProgressWithRewards)

DynamicProgressWithRewards.displayName = 'DynamicProgressWithRewards'
