import { getBaseID, getGradedID } from '@opensky/shared/assetsIDs'
import { BaseCard } from '@skyweaver/state-metadata'
import noop from 'lodash-es/noop'
import { memo, useMemo } from 'react'

import { CardRow } from '~/shared/components/CardRow/CardRow'
import { CardRowTooltip } from '~/shared/components/CardRowTooltip/CardRowTooltip'
import { getHighestOwnedGrade } from '~/shared/helpers/cards/get-highest-owned-grade'
import { useBalancesForCard } from '~/shared/hooks/cards/useBalancesForCard'

interface DeckDetailsTooltipCardProps {
  id: BaseCard
}

export const DeckDetailsTooltipCard = memo(({ id }: DeckDetailsTooltipCardProps) => {
  const balances = useBalancesForCard(Number(id))

  const isUnlocked = useMemo(
    () => !!balances?.some((balance) => balance.balance > 0),
    [balances]
  )

  const idToUse = useMemo(() => {
    if (!!balances) {
      const grade = getHighestOwnedGrade(balances)

      if (!!grade) {
        return getGradedID(id, grade)
      }
    }
    return getBaseID(id)
  }, [id, balances])

  return (
    <CardRowTooltip id={idToUse}>
      <CardRow isLocked={isUnlocked === false} id={idToUse} onClick={noop} />
    </CardRowTooltip>
  )
})

DeckDetailsTooltipCard.displayName = 'DeckViewerCardRow'
