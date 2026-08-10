import { Component, Entity } from 'gg'

import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

export default class TraitBannerComponent extends Component<void> {
  static entities = new TrackableCollection<Entity<Components>>(
    'TraitBannerComponent'
  )
  onAttach(entity: Entity<Components>) {
    TraitBannerComponent.entities.add(entity)
  }
  onDetach(entity: Entity<Components>) {
    TraitBannerComponent.entities.remove(entity)
  }
}
