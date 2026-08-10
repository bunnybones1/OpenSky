import { Component, Entity } from 'gg'

import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

export default class InHandComponent extends Component<void> {
  static entities = new TrackableCollection<Entity<Components>>(
    'InHandComponent'
  )
  onAttach(entity: Entity<Components>) {
    InHandComponent.entities.add(entity)
  }
  onDetach(entity: Entity<Components>) {
    InHandComponent.entities.remove(entity)
  }
}
