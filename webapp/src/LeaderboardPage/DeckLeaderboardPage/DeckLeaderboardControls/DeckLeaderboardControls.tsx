import clsx from 'clsx'
import { memo } from 'react'

import { MaxPlayerLeaderboardWidth } from '~/LeaderboardPage/shared/style/MaxPlayerLeaderboardWidth.css'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { DeckLeaderboardPrismFilter } from './components/DeckLeaderboardPrismFilter'

export const DeckLeaderboardControls = memo(() => {
  return (
    <div
      className={clsx(
        Sprinkles({
          width: 'full',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingY: '8px'
        }),
        MaxPlayerLeaderboardWidth
      )}
    >
      <DeckLeaderboardPrismFilter />
    </div>
  )
})

DeckLeaderboardControls.displayName = 'DeckLeaderboardControls'
