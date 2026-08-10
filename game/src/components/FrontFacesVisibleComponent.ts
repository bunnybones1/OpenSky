import { Component, Entity } from 'gg'

import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

export default class FrontFacesVisibleComponent extends Component<void> {
  static entities = new TrackableCollection<Entity<Components>>(
    'FrontFacesVisibleComponent'
  )
  onAttach(entity: Entity<Components>) {
    FrontFacesVisibleComponent.entities.add(entity)
  }
  onDetach(entity: Entity<Components>) {
    FrontFacesVisibleComponent.entities.remove(entity)
  }
}
