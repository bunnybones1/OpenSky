import { Component, Entity } from 'gg'

import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

export default class EventCardComponent extends Component<void> {
  static entities = new TrackableCollection<Entity<Components>>(
    'EventCardComponent'
  )
  onAttach(entity: Entity<Components>) {
    EventCardComponent.entities.add(entity)
  }
  onDetach(entity: Entity<Components>) {
    EventCardComponent.entities.remove(entity)
  }
}
