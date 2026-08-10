import { Component, Entity } from 'gg'

import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

let idCounter = 0

export default class CardComponent extends Component<number> {
  static entities = new TrackableCollection<Entity<Components>>('CardComponent')
  constructor() {
    super(idCounter++)
  }
  onAttach(entity: Entity<Components>) {
    CardComponent.entities.add(entity)
  }
  onDetach(entity: Entity<Components>) {
    CardComponent.entities.remove(entity)
  }
}
