import { Component, Entity } from 'gg'

import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

export default class MiniComponent extends Component<void> {
  static entities = new TrackableCollection<Entity<Components>>('MiniComponent')
  onAttach(entity: Entity<Components>) {
    MiniComponent.entities.add(entity)
  }
  onDetach(entity: Entity<Components>) {
    MiniComponent.entities.remove(entity)
  }
}
