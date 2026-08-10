import { Component, Entity } from 'gg'

import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

export default class HolographicComponent extends Component<void> {
  static entities = new TrackableCollection<Entity<Components>>(
    'HolographicComponent'
  )

  onAttach(entity: Entity<Components>) {
    HolographicComponent.entities.add(entity)
  }

  onDetach(entity: Entity<Components>) {
    HolographicComponent.entities.remove(entity)
  }
}
