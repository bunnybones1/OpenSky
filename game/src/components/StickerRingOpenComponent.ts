import { Component, Entity } from 'gg'

import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

export default class StickerRingOpenComponent extends Component<void> {
  static entities = new TrackableCollection<Entity<Components>>(
    'StickerRingOpenComponent'
  )
  onAttach(entity: Entity<Components>) {
    StickerRingOpenComponent.entities.add(entity)
  }
  onDetach(entity: Entity<Components>) {
    StickerRingOpenComponent.entities.remove(entity)
  }
}
