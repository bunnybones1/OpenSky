import { Component, Entity } from 'gg'

import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

export default class TraitStealthComponent extends Component<void> {
  static entities = new TrackableCollection<Entity<Components>>(
    'TraitStealthComponent'
  )
  onAttach(entity: Entity<Components>) {
    TraitStealthComponent.entities.add(entity)
  }
  onDetach(entity: Entity<Components>) {
    TraitStealthComponent.entities.remove(entity)
  }
}
