import clsx from 'clsx'
import { memo } from 'react'

import { Box, FlexBox } from '~/shared/components/Base'

import { XPBarContainer } from './SeasonXPBar.css'

interface SeasonXPBarProps {
  experience: number
  levelUpXP: number
}

export const SeasonXPBar = memo(({ experience, levelUpXP }: SeasonXPBarProps) => {
  const boxWidth = (experience / levelUpXP) * 100
  return (
    <FlexBox className={clsx('xpBarContainer', XPBarContainer)} flexWrap="nowrap">
      <FlexBox type="centered-row" position="relative" flex={1} height="100%">
        <Box
          height="3px"
          bg="purple6"
          width="100%"
          className="experiencebar__levelindicator"
        />
        <Box
          style={{
            width: experience === 0 ? '1px' : `${boxWidth > 100 ? 100 : boxWidth}%`
          }}
          minWidth={1}
          height="3px"
          className="experiencebar__levelindicator"
          position="absolute"
          left={0}
          top="50%"
          transform="translateY(-50%)"
          bg={'#00d7fd'}
          zIndex={2}
        />
      </FlexBox>
    </FlexBox>
  )
})

SeasonXPBar.displayName = 'SeasonXPBar'
