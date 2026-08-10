import { Component, Entity } from 'gg'

import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

export default class CharacterVisualsDashComponent extends Component<void> {
  static entities = new TrackableCollection<Entity<Components>>(
    'CharacterVisualsDashComponent'
  )
  onAttach(entity: Entity<Components>) {
    CharacterVisualsDashComponent.entities.add(entity)
  }
  onDetach(entity: Entity<Components>) {
    CharacterVisualsDashComponent.entities.remove(entity)
  }
}
