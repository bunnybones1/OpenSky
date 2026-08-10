import { Component, Entity } from 'gg'

import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

export default class SpecialConjureComponent extends Component<void> {
  static entities = new TrackableCollection<Entity<Components>>(
    'SpecialConjureComponent'
  )
  onAttach(entity: Entity<Components>) {
    SpecialConjureComponent.entities.add(entity)
  }
  onDetach(entity: Entity<Components>) {
    SpecialConjureComponent.entities.remove(entity)
  }
}
