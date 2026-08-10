import { Component, Entity } from 'gg'

import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

export default class InspectableComponent extends Component<void> {
  static entities = new TrackableCollection<Entity<Components>>(
    'InspectableComponent'
  )
  onAttach(entity: Entity<Components>) {
    InspectableComponent.entities.add(entity)
  }
  onDetach(entity: Entity<Components>) {
    InspectableComponent.entities.remove(entity)
  }
}
