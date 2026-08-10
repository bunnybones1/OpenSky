import { Component, Entity } from 'gg'

import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

export default class ColliderActiveComponent extends Component<void> {
  static entities = new TrackableCollection<Entity<Components>>(
    'ColliderActiveComponent'
  )
  constructor() {
    super()
  }
  onAttach(entity: Entity<Components>) {
    ColliderActiveComponent.entities.add(entity)
  }
  onDetach(entity: Entity<Components>) {
    ColliderActiveComponent.entities.remove(entity)
  }
}
