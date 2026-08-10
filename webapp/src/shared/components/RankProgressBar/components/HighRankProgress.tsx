import styled from '@emotion/styled'
import clsx from 'clsx'
import { rgba } from 'polished'
import { memo, useMemo } from 'react'
import { useSnapshot } from 'valtio'

import { Theme } from '~/__deprecated__/style/Theme'
import { Box } from '~/shared/components/Base/Box'
import { GameType } from '~/shared/constants/ranks'
import { useAccountStats } from '~/shared/queries/useAccountStats'
import { authenticationState } from '~/shared/state/authentication-state'

interface Props {
  mode: GameType
  showIndicator: boolean
}

export const HighRankProgress = memo(({ mode, showIndicator = false }: Props) => {
  const { userAddress } = useSnapshot(authenticationState)

  const { data: stats } = useAccountStats(userAddress)

  const barWidth = useMemo(() => {
    if (
      !!stats &&
      !!stats.discoveryStats &&
      stats.discoveryStats.length > 1 &&
      stats.discoveryStats[stats.discoveryStats.length - 1].rankProgress &&
      !!stats.constructedStats &&
      stats.constructedStats.length > 1 &&
      stats.constructedStats[stats.constructedStats.length - 1].rankProgress
    ) {
      const rankProgress =
        mode === GameType.DISCOVERY
          ? stats.discoveryStats[stats.discoveryStats.length - 1].rankProgress
          : stats.constructedStats[stats.constructedStats.length - 1].rankProgress
      return rankProgress ? rankProgress * 100 : 0
    }

    return 0
  }, [mode, stats])

  return (
    <HighRankProgressWrapper
      width="100%"
      position="relative"
      height="5px"
      top="2px"
      bg="warm9"
      overflow="visible"
      className={clsx({ isDiscovery: mode === GameType.DISCOVERY })}
    >
      <Box
        position="absolute"
        left={0}
        top={'4px'}
        height="100%"
        mr={1}
        style={{
          width: `${barWidth}%`,
          backgroundColor: Theme.colors[mode.toLowerCase()]
        }}
        zIndex={1}
      />
      {showIndicator && (
        <Box
          width="2px"
          height="8px"
          top="50%"
          style={{
            left: `${barWidth}%`
          }}
          transform="translateY(-50%)"
          zIndex={2}
          position="absolute"
          bg="white"
        />
      )}
    </HighRankProgressWrapper>
  )
})

HighRankProgress.displayName = 'HighRankProgress'

const HighRankProgressWrapper = styled(Box)`
  background-color: ${rgba('#a5ddd5', 0.4)};
  &.isDiscovery {
    background-color: ${rgba('#e5918d', 0.4)};
  }
`
