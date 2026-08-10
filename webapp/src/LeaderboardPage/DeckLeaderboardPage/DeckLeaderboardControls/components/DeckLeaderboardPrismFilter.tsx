/* eslint-disable valtio/state-snapshot-rule */
import { DeckClass } from '@opensky/proto'
import { CODE_PRISMS, PrismClass } from '@opensky/shared/constants'
import { getDeckClassFromPrisms } from '@opensky/shared/helpers'
import { memo, useCallback, useMemo } from 'react'
import { useSnapshot } from 'valtio'

import { ItemsPrismFilter } from '~/shared/components/ItemsPrismFilter/ItemsPrismFilter'
import {
  deckLeaderboardFilterState,
  updateDeckLeaderboardFilter
} from '~/shared/state/deck-leaderboard/deck-leaderboard-filter-state'
import { FilterablePrism } from '~/shared/types/cards'

export const DeckLeaderboardPrismFilter = memo(() => {
  const { deckClass } = useSnapshot(deckLeaderboardFilterState)

  const selected = useMemo(() => {
    if (!deckClass) return
    return CODE_PRISMS[deckClass as DeckClass]?.map((p) =>
      p.toLowerCase()
    ) as FilterablePrism[]
  }, [deckClass])

  const onChange = useCallback((newPrisms: FilterablePrism[]) => {
    const deckClass = getDeckClassFromPrisms(
      // eslint-disable-next-line valtio/state-snapshot-rule
      newPrisms?.map((prism) => prism.toUpperCase()) as PrismClass[]
    )
    updateDeckLeaderboardFilter('deckClass', deckClass)
  }, [])

  return <ItemsPrismFilter onChange={onChange} prism={selected} />
})

DeckLeaderboardPrismFilter.displayName = 'DeckLeaderboardPrismFilter'
