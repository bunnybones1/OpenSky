import { Component, Entity } from 'gg'

import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

export default class TraitDashComponent extends Component<void> {
  static entities = new TrackableCollection<Entity<Components>>(
    'TraitDashComponent'
  )
  onAttach(entity: Entity<Components>) {
    TraitDashComponent.entities.add(entity)
  }
  onDetach(entity: Entity<Components>) {
    TraitDashComponent.entities.remove(entity)
  }
}
