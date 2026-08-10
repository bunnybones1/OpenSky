import { getBaseID, getGradedID } from '@opensky/shared/assetsIDs'
import { BaseCard } from '@skyweaver/state-metadata'
import { memo, useCallback, useMemo } from 'react'

import { useAddOrRemoveDeckBuilderCard } from '~/DeckBuilder/shared/hooks/useAddOrRemoveDeckBuilderCard'
import { SoundClient } from '~/shared/clients'
import { CardRow } from '~/shared/components/CardRow/CardRow'
import { CardRowTooltip } from '~/shared/components/CardRowTooltip/CardRowTooltip'
import { CardType } from '~/shared/constants/cards'
import { getHighestOwnedGrade } from '~/shared/helpers/cards/get-highest-owned-grade'
import { useBalancesForCard } from '~/shared/hooks/cards/useBalancesForCard'

interface DeckBuilderCardRowProps {
  id: BaseCard
  isAnimating?: boolean
}

export const DeckBuilderCardRow = memo(
  ({ id, isAnimating }: DeckBuilderCardRowProps) => {
    const cardBalances = useBalancesForCard(Number(id))

    const idToUse = useMemo(() => {
      if (!!cardBalances) {
        const grade = getHighestOwnedGrade(cardBalances)
        if (!!grade) {
          return getGradedID(id, grade)
        }
      }
      return getBaseID(id)
    }, [id, cardBalances])

    const isUnlocked = useMemo(() => {
      return !!cardBalances?.some(
        (balance) => balance.tokenID === idToUse && balance.balance > 0
      )
    }, [cardBalances, idToUse])

    const { addOrRemoveDeckBuilderCard } = useAddOrRemoveDeckBuilderCard()

    const onClick = useCallback(
      (card: CardType) => {
        SoundClient.playSound('JuicySwipeStandalone')
        addOrRemoveDeckBuilderCard(card.baseId)
      },
      [addOrRemoveDeckBuilderCard]
    )

    return (
      <CardRowTooltip disabled={isAnimating} id={idToUse}>
        <CardRow isLocked={isUnlocked === false} id={idToUse} onClick={onClick} />
      </CardRowTooltip>
    )
  }
)

DeckBuilderCardRow.displayName = 'DeckBuilderCardRow'
