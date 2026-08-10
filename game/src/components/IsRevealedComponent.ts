import { Component, Entity } from 'gg'

import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

export default class IsRevealedComponent extends Component<void> {
  static entities = new TrackableCollection<Entity<Components>>(
    'IsRevealedComponent'
  )
  onAttach(entity: Entity<Components>) {
    IsRevealedComponent.entities.add(entity)
  }
  onDetach(entity: Entity<Components>) {
    IsRevealedComponent.entities.remove(entity)
  }
}
