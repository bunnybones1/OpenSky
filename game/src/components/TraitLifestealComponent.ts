import { Component, Entity } from 'gg'

import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

export default class TraitLifestealComponent extends Component<void> {
  static entities = new TrackableCollection<Entity<Components>>(
    'TraitLifestealComponent'
  )
  onAttach(entity: Entity<Components>) {
    TraitLifestealComponent.entities.add(entity)
  }
  onDetach(entity: Entity<Components>) {
    TraitLifestealComponent.entities.remove(entity)
  }
}
