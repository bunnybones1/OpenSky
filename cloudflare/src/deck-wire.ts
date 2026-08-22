import type { Deck } from '@opensky/proto'

type SourceDeckInput = Omit<
  Deck,
  'createdAt' | 'updatedAt' | 'favoritedAt'
> & {
  createdAt?: string | null
  updatedAt?: string | null
  favoritedAt?: string | null
}

// Go's encoding/json emits every public Deck field. Its three time pointers
// remain present as explicit nulls when nil; AccountID and Cursor are private.
export const sourceDeckWire = (deck: SourceDeckInput): Deck =>
  ({
    uuid: deck.uuid,
    name: deck.name,
    class: deck.class,
    deckString: deck.deckString,
    cardIds: deck.cardIds,
    art: deck.art,
    createdAt: deck.createdAt ?? null,
    updatedAt: deck.updatedAt ?? null,
    isFavorite: deck.isFavorite,
    favoritedAt: deck.favoritedAt ?? null,
    deckType: deck.deckType,
    isNew: deck.isNew,
    conquestV2Points: deck.conquestV2Points
  }) as unknown as Deck
