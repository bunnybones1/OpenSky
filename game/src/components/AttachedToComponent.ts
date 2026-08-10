import { Component, Entity } from 'gg'

import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

interface AttachedToValue {
  entity: Entity<Components>
  active: boolean
}

export default class AttachedToComponent extends Component<AttachedToValue> {
  static entities = new TrackableCollection<Entity<Components>>(
    'AttachedToComponent'
  )
  onAttach(entity: Entity<Components>) {
    AttachedToComponent.entities.add(entity)
  }
  onDetach(entity: Entity<Components>) {
    AttachedToComponent.entities.remove(entity)
  }
  constructor(entity: Entity<Components>) {
    super({
      entity,
      active: true
    })
  }
}
