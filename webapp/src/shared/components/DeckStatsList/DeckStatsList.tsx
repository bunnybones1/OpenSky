import { getBaseID } from '@opensky/shared/assetsIDs'
import clsx from 'clsx'
import { memo, useMemo } from 'react'

import { Cards } from '~/shared/constants/cards'
import { isDefined } from '~/shared/helpers/is-defined-is-not-null'
import { useDecodedDeckString } from '~/shared/hooks/decks/useDecodedDeckString'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { DeckCardTypeRatio } from './components/DeckCardTypeRatio'
import { DeckCurve } from './components/DeckCurve'
import { DeckElements } from './components/DeckElements'
import { DeckOtherEffects } from './components/DeckOtherEffects'
import { DeckPrismRatio } from './components/DeckPrismRatio'
import { DeckTraitList } from './components/DeckTraitList'
import { DeckUnitEffects } from './components/DeckUnitEffects'
import { DeckStatsListStyle } from './DeckStatsList.css'
import { DeckStatsTopPlayer } from './DeckStatsTopPlayer/DeckStatsTopPlayer'

interface DeckStatsListProps {
  deckString: string
  hideTopPlayer?: boolean
}

export const DeckStatsList = memo(
  ({ deckString, hideTopPlayer }: DeckStatsListProps) => {
    const { cardIds, deckClass } = useDecodedDeckString(deckString)

    const cards = useMemo(() => {
      if (!cardIds) return null
      return cardIds.map((id) => Cards.get(getBaseID(id))).filter(isDefined)
    }, [cardIds])

    return (
      <div
        className={clsx(
          Sprinkles({
            width: 'full',
            height: 'full',
            paddingX: '12px',
            paddingY: '12px',
            display: 'grid',
            backgroundColor: 'purple3',
            position: 'absolute',
            right: 0,
            top: 0
          }),
          DeckStatsListStyle
        )}
      >
        {/* {!!TopPlayerComponent && <TopPlayerComponent />} */}
        {!!cards && !!deckClass && (
          <>
            {!hideTopPlayer && <DeckStatsTopPlayer deckString={deckString} />}
            <DeckPrismRatio cards={cards} deckClass={deckClass} />
            <DeckCardTypeRatio cards={cards} />
            <DeckCurve cards={cards} />
            <DeckElements cards={cards} />
            <DeckTraitList cards={cards} />
            <DeckUnitEffects cards={cards} />
            <DeckOtherEffects cards={cards} />
          </>
        )}
      </div>
    )
  }
)

DeckStatsList.displayName = 'DeckStatsList'
