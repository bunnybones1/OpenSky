import { cardGradeCountsToThreeCardViewCode } from '@opensky/shared/utils/cardGradeCountsToThreeCardViewCode'
import { useMemo } from 'react'

import { DeckCardGradeType } from '~/shared/types/decks'

import { useDeckCardGradeCounts } from './useDeckCardGradeCounts'

export const useDeckGradeType = (uuid: string) => {
  const gradeCounts = useDeckCardGradeCounts(uuid)

  return useMemo<DeckCardGradeType>(
    () => cardGradeCountsToThreeCardViewCode(gradeCounts) as DeckCardGradeType,
    [gradeCounts]
  )
}
