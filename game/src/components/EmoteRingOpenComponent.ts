import { Component, Entity } from 'gg'

import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

export default class EmoteRingOpenComponent extends Component<void> {
  static entities = new TrackableCollection<Entity<Components>>(
    'EmoteRingOpenComponent'
  )
  onAttach(entity: Entity<Components>) {
    EmoteRingOpenComponent.entities.add(entity)
  }
  onDetach(entity: Entity<Components>) {
    EmoteRingOpenComponent.entities.remove(entity)
  }
}
