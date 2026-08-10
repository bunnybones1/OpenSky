import { decode, encode, VERSION } from '@opensky/deck-string-codec'
import { BaseCard, CardLibrary } from '@skyweaver/state-metadata'
import { useCallback } from 'react'
import { push } from 'redux-first-history'

import { DeckClass } from '~/lib/proto'
import { makeUpdateDeckBuilderDeckstringRoute } from '~/shared/helpers/routes/deck-builder'
import { useDispatch, useReduxStore } from '~/shared/redux'
import { updateDeckBuilderState } from '~/shared/state/deck-builder/deck-builder-state'

import {
  deckBuilderDeckClassSelector,
  deckBuilderDeckStringSelector
} from '../selectors'

export const useAddOrRemoveDeckBuilderCard = () => {
  const store = useReduxStore()
  const dispatch = useDispatch()

  const pushToNewDeckString = useCallback(
    (cardsToPushTo: BaseCard[]) => {
      const deckClass = deckBuilderDeckClassSelector(store.getState())
      if (!deckClass) return

      const sortedCards = cardsToPushTo.sort((a, b) => {
        return Number(a) - Number(b)
      })

      const newDeckString = encode(VERSION, sortedCards, deckClass as DeckClass)

      if (newDeckString) {
        dispatch(push(makeUpdateDeckBuilderDeckstringRoute(newDeckString)))
      }
    },
    [dispatch, store]
  )

  const addOrRemoveDeckBuilderCard = useCallback(
    (id: BaseCard) => {
      const currentDeckString = deckBuilderDeckStringSelector(store.getState())

      if (!currentDeckString) return

      const decoded = decode(CardLibrary, currentDeckString)

      if (decoded && Array.isArray(decoded) && !!decoded.length) {
        const currentCards = decoded[2] as BaseCard[]

        if (currentCards.includes(id)) {
          const newCards = currentCards.filter((_id) => id !== _id)

          pushToNewDeckString(newCards)
          updateDeckBuilderState('lastClickedCardId', undefined)
        } else {
          pushToNewDeckString([...currentCards, id])
          updateDeckBuilderState('lastClickedCardId', id)
        }
      }
    },
    [pushToNewDeckString, store]
  )

  return { addOrRemoveDeckBuilderCard }
}
