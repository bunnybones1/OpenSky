import { DeckClass } from '@opensky/proto'
import { proxy } from 'valtio'

interface CreateDeckState {
  deckClass: DeckClass
  deckString: string
  deckStringError?: string
}

const DEFAULT_CREATE_DECK_STATE: CreateDeckState = {
  deckClass: DeckClass.STR,
  deckString: '',
  deckStringError: undefined
}

export const createDeckState = proxy<CreateDeckState>(DEFAULT_CREATE_DECK_STATE)

export const updateCreateDeckState = <T extends keyof CreateDeckState>(
  key: T,
  value: CreateDeckState[T]
) => {
  createDeckState[key] = value
}

export const resetCreateDeckState = () => {
  createDeckState.deckClass = DeckClass.STR
  createDeckState.deckString = ''
  createDeckState.deckStringError = undefined
}
