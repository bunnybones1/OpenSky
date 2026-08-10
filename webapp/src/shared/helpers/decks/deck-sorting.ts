import { Deck, DeckType } from '@opensky/proto'

export const deckSortAlphaSort = (a: Deck, b: Deck) => {
  if (a.name < b.name) {
    return -1
  }
  if (a.name > b.name) {
    return 1
  }
  return 0
}

export const deckFavouriteSort = (a: Deck, b: Deck) => {
  const aIsFavourited = a.isFavorite
  const bIsFavourited = b.isFavorite

  if (!aIsFavourited && !bIsFavourited) {
    return 1
  } else if (!aIsFavourited) {
    return 1
  } else if (!bIsFavourited) {
    return -1
  } else {
    return 0
  }
}

export const isDeckStarterSort = (
  a: Deck,
  b: Deck,
  unlockLevels: { [key: string]: number }
) => {
  const aIsStarter =
    a.deckType === DeckType.LOCKED_STARTER || a.deckType === DeckType.UNLOCKED_STARTER
  const bIsStarter =
    b.deckType === DeckType.LOCKED_STARTER || b.deckType === DeckType.UNLOCKED_STARTER

  if (aIsStarter && bIsStarter) {
    return unlockLevels[a.class] - unlockLevels[b.class]
  } else if (aIsStarter) {
    return 1
  } else if (bIsStarter) {
    return -1
  } else {
    return 0
  }
}
