import { getBaseID } from '@opensky/shared/assetsIDs'
import { BaseCard } from '@skyweaver/state-metadata'
import { memo, useMemo } from 'react'

import { AbilityRow } from '~/shared/components/AbilityRow/AbilityRow'
import { CardRowTooltip } from '~/shared/components/CardRowTooltip/CardRowTooltip'

interface DeckViewerAbilityRowProps {
  id: BaseCard
}

export const DeckViewerAbilityRow = memo(({ id }: DeckViewerAbilityRowProps) => {
  const idToUse = useMemo(() => {
    return getBaseID(id)
  }, [id])

  return (
    <CardRowTooltip id={idToUse}>
      <AbilityRow id={idToUse} />
    </CardRowTooltip>
  )
})

DeckViewerAbilityRow.displayName = 'DeckViewerAbilityRow'
