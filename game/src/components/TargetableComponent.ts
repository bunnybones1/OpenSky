import { Component, Entity } from 'gg'

import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

export default class TargetableComponent extends Component<void> {
  static entities = new TrackableCollection<Entity<Components>>(
    'TargetableComponent'
  )
  onAttach(entity: Entity<Components>) {
    TargetableComponent.entities.add(entity)
  }
  onDetach(entity: Entity<Components>) {
    TargetableComponent.entities.remove(entity)
  }
}
