import clsx from 'clsx'
import { memo } from 'react'

import { MaxPlayerLeaderboardWidth } from '~/LeaderboardPage/shared/style/MaxPlayerLeaderboardWidth.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { PlayerLeaderboardGameModeFilter } from './components/PlayerLeaderboardGameModeFilter'
import { PlayerLeaderboardRanksFilter } from './components/PlayerLeaderboardRanksFilter'
import { PlayerLeaderboardRegionFilter } from './components/PlayerLeaderboardRegionFilter'
import { RightSideControlsStyle } from './PlayerLeaderboardControls.css'

export const PlayerLeaderboardControls = memo(() => {
  return (
    <div
      className={clsx(
        Sprinkles({
          width: 'full',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingY: '8px'
        }),
        MaxPlayerLeaderboardWidth
      )}
    >
      <PlayerLeaderboardGameModeFilter />
      <div
        className={clsx(
          Sprinkles({
            alignItems: 'center',
            display: 'flex',
            justifyContent: 'flex-end'
          }),
          RightSideControlsStyle
        )}
      >
        <PlayerLeaderboardRegionFilter />
        <PlayerLeaderboardRanksFilter />
      </div>
    </div>
  )
})

PlayerLeaderboardControls.displayName = 'PlayerLeaderboardControls'
