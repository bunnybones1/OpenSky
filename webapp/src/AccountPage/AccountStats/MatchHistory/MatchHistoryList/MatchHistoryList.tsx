import { Match } from '@opensky/proto'
import clsx from 'clsx'
import { memo } from 'react'

import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { MatchHistoryListStyle } from './MatchHistoryList.css'
import { MatchHistoryRow } from './MatchHistoryRow/MatchHistoryRow'

interface MatchHistoryListProps {
  matches: Match[]
}

export const MatchHistoryList = memo(({ matches }: MatchHistoryListProps) => {
  return (
    <div
      className={clsx(
        Sprinkles({
          backgroundColor: 'purple1',
          width: 'full',
          borderLeft: '1px solid',
          borderRight: '1px solid',
          borderBottom: '1px solid',
          borderColor: 'purple7',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start'
        }),
        MatchHistoryListStyle
      )}
    >
      {matches.map((match) => (
        <MatchHistoryRow match={match} key={match.id} />
      ))}
    </div>
  )
})

MatchHistoryList.displayName = 'MatchHistoryList'
