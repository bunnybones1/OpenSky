import { Component, Entity } from 'gg'

import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

export default class FlippedComponent extends Component<void> {
  static entities = new TrackableCollection<Entity<Components>>(
    'FlippedComponent'
  )
  onAttach(entity: Entity<Components>) {
    FlippedComponent.entities.add(entity)
  }
  onDetach(entity: Entity<Components>) {
    FlippedComponent.entities.remove(entity)
  }
}
