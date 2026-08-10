import { Component, Entity } from 'gg'

import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

export default class PlayableComponent extends Component<void> {
  static entities = new TrackableCollection<Entity<Components>>(
    'PlayableComponent'
  )
  onAttach(entity: Entity<Components>) {
    PlayableComponent.entities.add(entity)
  }
  onDetach(entity: Entity<Components>) {
    PlayableComponent.entities.remove(entity)
  }
}
