import { BaseCard } from '@skyweaver/state-metadata'
import { proxy, subscribe } from 'valtio'

import { deckBuilderFilterState } from './deck-builder-filter-state'

interface DeckBuilderState {
  numSearchResults?: number
  // The Base Id of the last clicked card. Used to update the decks art
  lastClickedCardId?: BaseCard
  newName?: string
  // Used to see if the decks cards have been updated, and can be saved.
  originalDeckString?: string
  // The pathname of the page that the user navigated from to
  // get to the deckbuilder. Used for the back button / save button
  previousLocationPath?: string
}

export const deckBuilderState = proxy<DeckBuilderState>({
  numSearchResults: undefined,
  lastClickedCardId: undefined,
  newName: undefined,
  originalDeckString: undefined,
  previousLocationPath: undefined
})

export const updateDeckBuilderState = <T extends keyof DeckBuilderState>(
  key: T,
  value: DeckBuilderState[T]
) => {
  deckBuilderState[key] = value
}

subscribe(deckBuilderFilterState, () => {
  window.scrollTo({ top: 0 })
})

export const resetDeckbuilderState = () => {
  deckBuilderState.numSearchResults = undefined
  deckBuilderState.lastClickedCardId = undefined
  deckBuilderState.newName = undefined
  deckBuilderState.originalDeckString = undefined
  deckBuilderState.previousLocationPath = undefined
}
