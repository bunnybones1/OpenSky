import { Component, Entity } from 'gg'

import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

export default class HeroComponent extends Component<void> {
  static entities = new TrackableCollection<Entity<Components>>('HeroComponent')
  onAttach(entity: Entity<Components>) {
    HeroComponent.entities.add(entity)
  }
  onDetach(entity: Entity<Components>) {
    HeroComponent.entities.remove(entity)
  }
}
