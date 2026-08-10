import { CODE_PRISMS } from '@opensky/shared/constants'
import { FlagCodes } from '@opensky/shared/constants'
import { memo } from 'react'
import { useSnapshot } from 'valtio'

import { useDeckLeaderboard } from '~/shared/queries/useDeckLeaderboard'
import { deckLeaderboardFilterState } from '~/shared/state/deck-leaderboard/deck-leaderboard-filter-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { DeckLeaderboardHeader } from './components/DeckLeaderboardHeader'
import { DeckLeaderboardLoader } from './components/DeckLeaderboardLoader'
import { DeckLeaderboardTableHeader } from './components/DeckLeaderboardTableHeader'
import { EmptyDeckLeaderboard } from './components/EmptyDeckLeaderboard'
import { DeckLeaderboardControls } from './DeckLeaderboardControls/DeckLeaderboardControls'
import { DeckLeaderboardRow } from './DeckLeaderboardRow/DeckLeaderboardRow'

export const DeckLeaderboardPage = memo(() => {
  const { deckClass } = useSnapshot(deckLeaderboardFilterState)
  const { data: deckLeaderboard, isFetching, error } = useDeckLeaderboard(deckClass)

  const isLoading = isFetching || (deckLeaderboard === undefined && !error)

  return (
    <div
      className={Sprinkles({
        width: 'full',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        paddingBottom: '32px',
        paddingX: '16px'
      })}
    >
      <DeckLeaderboardHeader />
      <DeckLeaderboardControls />
      <DeckLeaderboardTableHeader />
      {!!deckLeaderboard?.length && !isLoading ? (
        deckLeaderboard.map((deck) => (
          <DeckLeaderboardRow
            key={deck.deckRank.deckString}
            prisms={CODE_PRISMS[deck.deckRank.class]}
            tagArtID={deck.highestPlayer.tagArtID}
            region={deck.highestPlayer.region as FlagCodes}
            name={deck.highestPlayer.name}
            address={deck.highestPlayer.address}
            deckString={deck.deckRank.deckString}
            score={deck.deckRank.score as number}
          />
        ))
      ) : isLoading ? (
        <DeckLeaderboardLoader />
      ) : (
        <EmptyDeckLeaderboard />
      )}
    </div>
  )
})

DeckLeaderboardPage.displayName = 'DeckLeaderboardPage'
