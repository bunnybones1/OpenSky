import { CODE_PRISMS, PrismClass } from '@opensky/shared/constants'
import { useMemo } from 'react'
import { useSnapshot } from 'valtio'

import { Deck, DeckType } from '~/lib/proto'
import { DECK_SORTING_OPTIONS } from '~/shared/constants/decks'
import {
  deckFavouriteSort,
  isDeckStarterSort
} from '~/shared/helpers/decks/deck-sorting'
import { Criteria, filterItems } from '~/shared/helpers/filter-items'
import { useUserDecks } from '~/shared/queries/decks/useUserDecks'
import { useHeroUnlockLevels } from '~/shared/queries/useHeroUnlockLevels'

import {
  ItemsDecksFilters,
  itemsDecksFilterState
} from '../../../../shared/state/items-decks/items-decks-filter-state'
import { BUY_DECKS_BUTTON_ID, CREATE_DECK_BUTTON_ID } from '../shared/constants'

type BaseSearchDeckFilters = Omit<ItemsDecksFilters, 'sort'>

type ItemsDecksSearchCriteria = {
  [K in keyof BaseSearchDeckFilters]: BaseSearchDeckFilters[K] | undefined
}

const DECK_FILTER_CRITERIA: Criteria<Deck, ItemsDecksSearchCriteria> = {
  prism: {
    isApplied: (value) => !!value?.length,
    isFiltered: (deck, value) => {
      const prisms = CODE_PRISMS[deck.class]

      if (!value) return false

      if (value.length === 1) {
        return (
          prisms.length === 1 && prisms[0] === (value[0].toUpperCase() as PrismClass)
        )
      }

      return value.every((prism) =>
        prisms.includes(prism.toUpperCase() as PrismClass)
      )
    }
  },
  search: {
    isApplied: (value) => !!value,
    isFiltered: (deck, value) => {
      return !!value && deck.name.toLowerCase().includes(value.toLowerCase())
    }
  }
}

const getFilteredDecks = (decks: Deck[], filters: BaseSearchDeckFilters) => {
  return filterItems({
    items: decks,
    filters,
    criteria: DECK_FILTER_CRITERIA
  })
}

export const useItemsDecksList = () => {
  const { data: userDecks } = useUserDecks()

  const { search, sort, prism } = useSnapshot(itemsDecksFilterState)

  const { data: unlockLevels } = useHeroUnlockLevels()

  return useMemo(() => {
    if (userDecks === undefined || unlockLevels === undefined) return undefined

    let filteredDecks = getFilteredDecks(userDecks, { search, prism })

    const starterDecks = filteredDecks.filter((deck) => {
      return (
        deck.deckType === DeckType.LOCKED_STARTER ||
        deck.deckType === DeckType.UNLOCKED_STARTER
      )
    })

    filteredDecks = filteredDecks.filter((deck) => {
      return (
        deck.deckType !== DeckType.LOCKED_STARTER &&
        deck.deckType !== DeckType.UNLOCKED_STARTER
      )
    })

    if (sort === DECK_SORTING_OPTIONS.LAST_MODIFIED_DESCENDING) {
      filteredDecks = filteredDecks.sort((a, b) => {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      })
    } else if (sort === DECK_SORTING_OPTIONS.ALPHABETICAL_ASCENDING) {
      filteredDecks = filteredDecks.sort((a, b) => a.name.localeCompare(b.name))
    } else {
      filteredDecks = filteredDecks.sort((a, b) => b.name.localeCompare(a.name))
    }

    const deckIds = filteredDecks
      .sort(deckFavouriteSort)
      .concat(
        starterDecks.sort((a, b) => {
          return isDeckStarterSort(a, b, unlockLevels)
        })
      )
      .map((deck) => ({ id: deck.uuid }))

    return [{ id: CREATE_DECK_BUTTON_ID }, ...deckIds, { id: BUY_DECKS_BUTTON_ID }]
  }, [prism, search, sort, unlockLevels, userDecks])
}
