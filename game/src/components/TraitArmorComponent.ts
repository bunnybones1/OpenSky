import { Component, Entity } from 'gg'

import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

export default class TraitArmorComponent extends Component<void> {
  static entities = new TrackableCollection<Entity<Components>>(
    'TraitArmorComponent'
  )
  onAttach(entity: Entity<Components>) {
    TraitArmorComponent.entities.add(entity)
  }
  onDetach(entity: Entity<Components>) {
    TraitArmorComponent.entities.remove(entity)
  }
}
