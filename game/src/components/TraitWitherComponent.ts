import { Component, Entity } from 'gg'

import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

export default class TraitWitherComponent extends Component<void> {
  static entities = new TrackableCollection<Entity<Components>>(
    'TraitWitherComponent'
  )
  onAttach(entity: Entity<Components>) {
    TraitWitherComponent.entities.add(entity)
  }
  onDetach(entity: Entity<Components>) {
    TraitWitherComponent.entities.remove(entity)
  }
}
