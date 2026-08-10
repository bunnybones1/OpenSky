import { Component, Entity } from 'gg'

import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

export default class CharacterComponent extends Component<void> {
  static entities = new TrackableCollection<Entity<Components>>(
    'CharacterComponent'
  )

  onAttach(entity: Entity<Components>) {
    CharacterComponent.entities.add(entity)
  }

  onDetach(entity: Entity<Components>) {
    CharacterComponent.entities.remove(entity)
  }
}
