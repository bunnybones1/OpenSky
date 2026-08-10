import { DECK_CARDS_REQUIRED } from '@opensky/shared/deckConsts'
import { memo } from 'react'

import { deckBuilderDeckStringSelector } from '~/DeckBuilder/shared/selectors'
import { CostGraph } from '~/shared/components/CostGraph/CostGraph'
import { Text } from '~/shared/components/Text'
import { useDecodedDeckString } from '~/shared/hooks/decks/useDecodedDeckString'
import { useSelector } from '~/shared/redux'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

export const HeaderCostGraph = memo(() => {
  const deckString = useSelector(deckBuilderDeckStringSelector)

  const { cardIds } = useDecodedDeckString(deckString)

  if (!deckString) return null

  return (
    <div
      className={Sprinkles({
        display: 'flex',
        alignItems: 'center',
        flexDirection: 'column',
        justifyContent: 'center',
        marginLeft: '12px'
      })}
    >
      <CostGraph deckString={deckString} />
      <Text color="purple8" fontSize="12px" marginTop="4px">
        {`${cardIds?.length || 0}/${DECK_CARDS_REQUIRED}`}
      </Text>
    </div>
  )
})

HeaderCostGraph.displayName = 'HeaderCostGraph'
