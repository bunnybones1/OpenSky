import { memo, useMemo } from 'react'

import { ThemeColorType } from '~/__deprecated__/style/types'
import { Box } from '~/shared/components/Base/Box'
import { FlexBox } from '~/shared/components/Base/FlexBox'

export interface DynamicProgressBarProps {
  endProgress: number
  progress: number
  newProgress?: number
  barColor?: ThemeColorType
  newProgressColor?: ThemeColorType
  includeBorders?: boolean
}

export const DynamicProgressBar = memo(
  ({
    endProgress,
    newProgress = 0,
    progress,
    barColor,
    newProgressColor,
    includeBorders
  }: DynamicProgressBarProps) => {
    const { barWidth, newBarWidth } = useMemo(() => {
      const newBarWidth = !!newProgress ? (newProgress / endProgress) * 100 : 0

      if (progress === 0) return { newBarWidth, barWidth: 0 }
      if (progress === endProgress || progress > endProgress)
        return { newBarWidth, barWidth: 100 - newBarWidth }

      return {
        barWidth: (progress / endProgress) * 100 - newBarWidth,
        newBarWidth
      }
    }, [endProgress, progress, newProgress])

    return (
      <FlexBox
        height={includeBorders ? 13 : 9}
        width="100%"
        position="relative"
        alignItems="center"
        justifyContent="flex-start"
        borderBottom={includeBorders ? '1px solid' : undefined}
        borderTop={includeBorders ? '1px solid' : undefined}
        borderColor="purple7"
      >
        <FlexBox
          width="100%"
          height="100%"
          bg="purple5"
          alignItems="center"
          justifyContent="flex-start"
          borderBottom={includeBorders ? '1px solid' : undefined}
          borderTop={includeBorders ? '1px solid' : undefined}
          borderColor="purple2"
        >
          <Box
            height="100%"
            flexShrink={0}
            bg={barColor || 'forest3'}
            style={{
              width: `${barWidth}%`
            }}
          />
          {!!newBarWidth && (
            <Box
              height="100%"
              flexShrink={0}
              bg={newProgressColor || 'forest5'}
              style={{
                width: `${newBarWidth}%`
              }}
            />
          )}
          <Box
            height={includeBorders ? '18px' : '15px'}
            width="2px"
            top="50%"
            transform="translateY(-50%)"
            position="absolute"
            bg="white"
            style={{
              left: `calc(${barWidth + newBarWidth}% - 1px)`
            }}
          />
        </FlexBox>
      </FlexBox>
    )
  }
)

DynamicProgressBar.displayName = 'DynamicProgressBar'
