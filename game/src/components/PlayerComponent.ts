import { Component, Entity } from 'gg'

import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

export default class PlayerComponent extends Component<void> {
  static entities = new TrackableCollection<Entity<Components>>(
    'PlayerComponent'
  )
  onAttach(entity: Entity<Components>) {
    PlayerComponent.entities.add(entity)
  }
  onDetach(entity: Entity<Components>) {
    PlayerComponent.entities.remove(entity)
  }
}
