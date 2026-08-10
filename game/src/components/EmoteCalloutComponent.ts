import { Component, Entity } from 'gg'

import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

export default class EmoteCalloutComponent extends Component<void> {
  static entities = new TrackableCollection<Entity<Components>>(
    'EmoteCalloutComponent'
  )
  onAttach(entity: Entity<Components>) {
    EmoteCalloutComponent.entities.add(entity)
  }
  onDetach(entity: Entity<Components>) {
    EmoteCalloutComponent.entities.remove(entity)
  }
}
