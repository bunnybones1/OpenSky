import { Component, Entity } from 'gg'

import { OwnedCardStatus } from '~/types'
import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

interface DeckValue {
  faceUp: boolean
  reverseOrder: boolean
  ownedCardStatus: OwnedCardStatus
}

export default class DeckComponent extends Component<DeckValue> {
  static entities = new TrackableCollection<Entity<Components>>('DeckComponent')
  onAttach(entity: Entity<Components>) {
    DeckComponent.entities.add(entity)
  }
  onDetach(entity: Entity<Components>) {
    DeckComponent.entities.remove(entity)
  }
}
