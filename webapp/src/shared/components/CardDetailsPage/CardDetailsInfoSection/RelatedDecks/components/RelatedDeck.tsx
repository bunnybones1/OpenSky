import { DeckRank } from '@opensky/proto'
import { memo, useCallback, useMemo } from 'react'
import { push } from 'redux-first-history'

import { SoundClient } from '~/shared/clients'
import { Deck } from '~/shared/components/Deck/Deck'
import { DeckOwnershipStats } from '~/shared/components/DeckOwnershipStats/DeckOwnershipStats'
import { makeDeckViewerRoute } from '~/shared/helpers/routes/items-decks'
import { useDeckName } from '~/shared/hooks/decks/useDeckName'
import { useDecodedDeckString } from '~/shared/hooks/decks/useDecodedDeckString'
import { useUserDecks } from '~/shared/queries/decks/useUserDecks'
import { useDispatch } from '~/shared/redux/index'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

export const RelatedDeck = memo(
  ({ deckString, score }: Pick<DeckRank, 'score' | 'deckString'>) => {
    const { cardIds, deckClass } = useDecodedDeckString(deckString)
    const dispatch = useDispatch()
    const { data: userDecks } = useUserDecks()

    const firstCard = useMemo(() => {
      return !!cardIds ? cardIds[cardIds.length - 1] : undefined
    }, [cardIds])

    const existingDeck = useMemo(
      () => userDecks?.find((deck) => deck.deckString === deckString),
      [deckString, userDecks]
    )

    const name = useDeckName(false, existingDeck?.name, deckClass)

    const onClick = useCallback(() => {
      dispatch(push(makeDeckViewerRoute(deckString, existingDeck?.uuid)))
    }, [deckString, dispatch, existingDeck?.uuid])

    if (!deckClass || !cardIds) return null

    return (
      <div
        className={Sprinkles({
          width: 'full',
          position: 'relative'
        })}
        onMouseEnter={() => SoundClient.playSound('CursorMainHover')}
        onMouseDown={() => SoundClient.playSound('CursorMainClick')}
      >
        <Deck
          deckClass={deckClass}
          deckString={deckString}
          name={name}
          artCardId={firstCard}
          numCardsInDeck={cardIds.length}
          identifier={deckString}
          onClick={onClick}
          rankInfoNumber={score}
          rankInfoIcon="checkered-flag"
          numCardsRequiredInDeck={cardIds.length}
          gradeType="bbb"
          DeckStats={<DeckOwnershipStats deckString={deckString} />}
        />
      </div>
    )
  }
)

RelatedDeck.displayName = 'RelatedDeck'
