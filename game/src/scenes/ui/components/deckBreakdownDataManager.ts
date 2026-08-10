import { Entity } from 'gg'

import { Components } from '~/components'
import CardInstanceComponent from '~/components/CardInstanceComponent'
import { ownedZoneCollections } from '~/helpers/zoneCollections'
import { OwnedCardStatus } from '~/types'
import { ReadonlyTrackableCollection } from '~/utils/TrackableCollection'

import DeckBreakdownData from './DeckBreakdownData'

const deckBreakdownDatas = new Map<
  ReadonlyTrackableCollection<CardInstanceComponent>,
  DeckBreakdownData
>()

export function getDeckBreakdownDataFromCards(
  cards: ReadonlyTrackableCollection<CardInstanceComponent>
) {
  if (!deckBreakdownDatas.has(cards)) {
    const deckBreakdownData = new DeckBreakdownData(cards)
    deckBreakdownDatas.set(cards, deckBreakdownData)
  }
  return deckBreakdownDatas.get(cards)!
}

const mapper = (entity: Entity<Components>) =>
  entity.getComponent('cardInstance')!

export const playerGraveyardCardInstances = CardInstanceComponent.entities
  .intersect(ownedZoneCollections.Player_Graveyard)
  .map(mapper)

export const opponentGraveyardCardInstances = CardInstanceComponent.entities
  .intersect(ownedZoneCollections.Opponent_Graveyard)
  .map(mapper)

export const playerDeckCardInstances = CardInstanceComponent.entities
  .intersect(ownedZoneCollections.Player_Deck)
  .map(mapper)

export const deckCardInstanceCollections: Partial<{
  [K in OwnedCardStatus]: ReadonlyTrackableCollection<CardInstanceComponent>
}> = {
  Player_Deck: playerDeckCardInstances,
  Player_Graveyard: playerGraveyardCardInstances,
  Opponent_Graveyard: opponentGraveyardCardInstances
}
