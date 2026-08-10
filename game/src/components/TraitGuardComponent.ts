import { Component, Entity } from 'gg'

import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

export default class TraitGuardComponent extends Component<void> {
  static entities = new TrackableCollection<Entity<Components>>(
    'TraitGuardComponent'
  )
  onAttach(entity: Entity<Components>) {
    TraitGuardComponent.entities.add(entity)
  }
  onDetach(entity: Entity<Components>) {
    TraitGuardComponent.entities.remove(entity)
  }
}
