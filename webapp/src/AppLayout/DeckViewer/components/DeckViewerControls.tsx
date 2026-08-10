// import { noop } from 'lodash'
import clsx from 'clsx'
import { memo, useCallback } from 'react'
import { push } from 'redux-first-history'

import { Button } from '~/shared/components/Button'
import { makeCloseDeckViewerRoute } from '~/shared/helpers/routes/general'
import { useFavouriteDeck } from '~/shared/mutations/decks/useFavouriteDeck'
import { useUnFavouriteDeck } from '~/shared/mutations/decks/useUnFavouriteDeck'
import { useUserDeck } from '~/shared/queries/decks/useUserDecks'
import { useDispatch } from '~/shared/redux'
import { useSelector } from '~/shared/redux'
import { Sprinkles } from '~/shared/style/Sprinkles.css'

import { deckViewerIdSelector } from '../shared/selectors'
import { DeckViewerControlsStyle } from './DeckViewerControls.css'

interface DeckViewerControlsProps {
  isStatsListOpen?: boolean
  toggleStatsList?: () => void
}

export const DeckViewerControls = memo(
  ({ isStatsListOpen, toggleStatsList }: DeckViewerControlsProps) => {
    const dispatch = useDispatch()
    const deckId = useSelector(deckViewerIdSelector)
    const { data: deck } = useUserDeck(deckId)

    const favouriteDeck = useFavouriteDeck()
    const unfavouriteDeck = useUnFavouriteDeck()

    const toggleDeckFavourited = useCallback(() => {
      if (!deck) return

      if (deck.isFavorite) {
        unfavouriteDeck.mutate(deck.uuid)
      } else {
        favouriteDeck.mutate(deck.uuid)
      }
    }, [deck, favouriteDeck, unfavouriteDeck])

    const closeDeckViewer = useCallback(() => {
      dispatch(push(makeCloseDeckViewerRoute()))
    }, [dispatch])

    return (
      <div
        className={clsx(
          Sprinkles({
            height: 'full',
            top: 0,
            position: 'absolute',
            display: 'grid',
            paddingTop: '8px',
            paddingRight: '8px'
          }),
          DeckViewerControlsStyle
        )}
      >
        <Button
          frameType="default"
          leftAdornment={{ icon: 'close' }}
          colorType="red"
          onClick={closeDeckViewer}
          buttonId="close-deck-viewer"
          buttonClassName={Sprinkles({
            paddingX: '4px'
          })}
        />

        {!!toggleStatsList && isStatsListOpen !== undefined && (
          <Button
            frameType="default"
            leftAdornment={{ icon: 'bar-graph' }}
            isToggled={isStatsListOpen}
            colorType="default"
            buttonId={`stats-button-${!isStatsListOpen ? 'open' : 'close'}`}
            onClick={toggleStatsList}
            buttonClassName={Sprinkles({
              paddingX: '4px'
            })}
          />
        )}

        {!!deck && (
          <Button
            frameType="default"
            leftAdornment={{ icon: deck.isFavorite ? 'star' : 'star-empty' }}
            isToggled={deck.isFavorite}
            buttonId={`favourite-button-${
              !deck.isFavorite ? 'favourite' : 'unfavourite'
            }`}
            onClick={toggleDeckFavourited}
            colorType="default"
            buttonClassName={Sprinkles({
              paddingX: '4px'
            })}
          />
        )}
      </div>
    )
  }
)

DeckViewerControls.displayName = 'DeckViewerControls'
