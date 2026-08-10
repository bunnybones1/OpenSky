import { DeckRank } from '@opensky/proto'
import { memo, useCallback, useMemo } from 'react'
import { push } from 'redux-first-history'
import { useSnapshot } from 'valtio'

import { Deck } from '~/shared/components/Deck/Deck'
import { DeckOwnershipStats } from '~/shared/components/DeckOwnershipStats/DeckOwnershipStats'
import { makeDeckViewerRoute } from '~/shared/helpers/routes/items-decks'
import { useDeckName } from '~/shared/hooks/decks/useDeckName'
import { useDecodedDeckString } from '~/shared/hooks/decks/useDecodedDeckString'
import { useUserDecks } from '~/shared/queries/decks/useUserDecks'
import { useDispatch } from '~/shared/redux/index'
import { marketDecksFilterState } from '~/shared/state/market-decks/market-decks-filter-state'
import { Sprinkles } from '~/shared/style/Sprinkles.css'
import { MARKET_DECK_COLUMN_TYPE } from '~/shared/types/market'

import { MarketDeckBalanceAndPriceInfo } from './components/MarketDeckBalanceAndPriceInfo'

export const MarketDeck = memo(({ deckString, score, gamesPlayed }: DeckRank) => {
  const { cardIds, deckClass } = useDecodedDeckString(deckString)
  const name = useDeckName(false, undefined, deckClass)
  const dispatch = useDispatch()
  const { column } = useSnapshot(marketDecksFilterState)
  const { data: userDecks } = useUserDecks()

  const firstCard = useMemo(() => {
    return !!cardIds ? cardIds[cardIds.length - 1] : undefined
  }, [cardIds])

  const onClick = useCallback(() => {
    const existingDeck = userDecks?.find((deck) => deck.deckString === deckString)

    dispatch(push(makeDeckViewerRoute(deckString, existingDeck?.uuid)))
  }, [deckString, dispatch, userDecks])

  if (!deckClass || !cardIds) return null

  return (
    <div
      className={Sprinkles({
        width: 'full',
        position: 'relative'
      })}
    >
      <MarketDeckBalanceAndPriceInfo deckString={deckString} />
      <Deck
        deckClass={deckClass}
        // isSelected={!!deckId && deckId === deck.uuid}
        deckString={deckString}
        name={name}
        numCardsInDeck={cardIds.length}
        identifier={deckString}
        onClick={onClick}
        rankInfoNumber={
          column === MARKET_DECK_COLUMN_TYPE.TOP_DECKS ? score : gamesPlayed
        }
        rankInfoIcon={
          column === MARKET_DECK_COLUMN_TYPE.TOP_DECKS
            ? 'checkered-flag'
            : 'star-empty'
        }
        artCardId={firstCard}
        numCardsRequiredInDeck={cardIds.length}
        gradeType="sss"
        DeckStats={<DeckOwnershipStats deckString={deckString} />}
      />
    </div>
  )
})

MarketDeck.displayName = 'MarketDeck'
