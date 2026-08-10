import { getBaseID, getGradedID } from '@opensky/shared/assetsIDs'
import { BaseCard } from '@skyweaver/state-metadata'
import noop from 'lodash-es/noop'
import { memo, useMemo } from 'react'

import { CardRow } from '~/shared/components/CardRow/CardRow'
import { CardRowTooltip } from '~/shared/components/CardRowTooltip/CardRowTooltip'
import { getHighestOwnedGrade } from '~/shared/helpers/cards/get-highest-owned-grade'
import { useBalancesForCard } from '~/shared/hooks/cards/useBalancesForCard'
import { useSelector } from '~/shared/redux'

import { deckViewerIdSelector } from '../shared/selectors'

interface DeckViewerCardRowProps {
  id: BaseCard
  isAnimating?: boolean
}

export const DeckViewerCardRow = memo(
  ({ id, isAnimating }: DeckViewerCardRowProps) => {
    const deckId = useSelector(deckViewerIdSelector)

    const balances = useBalancesForCard(Number(id))

    const isUnlocked = useMemo(
      () => !!balances?.some((balance) => balance.balance > 0),
      [balances]
    )

    const idToUse = useMemo(() => {
      if (!!deckId && !!balances) {
        const grade = getHighestOwnedGrade(balances)

        if (!!grade) {
          return getGradedID(id, grade)
        }
      }
      return getBaseID(id)
    }, [id, deckId, balances])

    return (
      <CardRowTooltip disabled={isAnimating} id={idToUse}>
        <CardRow isLocked={isUnlocked === false} id={idToUse} onClick={noop} />
      </CardRowTooltip>
    )
  }
)

DeckViewerCardRow.displayName = 'DeckViewerCardRow'
