import { Component, Entity } from 'gg'

import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

export default class ForegroundInhibitorComponent extends Component<void> {
  static entities = new TrackableCollection<Entity<Components>>(
    'ForegroundInhibitorComponent'
  )
  onAttach(entity: Entity<Components>) {
    ForegroundInhibitorComponent.entities.add(entity)
  }
  onDetach(entity: Entity<Components>) {
    ForegroundInhibitorComponent.entities.remove(entity)
  }
}
