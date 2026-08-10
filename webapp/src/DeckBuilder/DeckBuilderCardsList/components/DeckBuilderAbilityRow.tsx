import { getBaseID } from '@opensky/shared/assetsIDs'
import { BaseCard } from '@skyweaver/state-metadata'
import { memo } from 'react'

import { AbilityRow } from '~/shared/components/AbilityRow/AbilityRow'

interface DeckBuilderAbilityRowProps {
  id: BaseCard
}

export const DeckBuilderAbilityRow = memo(({ id }: DeckBuilderAbilityRowProps) => {
  return <AbilityRow id={getBaseID(id)} />
})

DeckBuilderAbilityRow.displayName = 'DeckBuilderAbilityRow'
