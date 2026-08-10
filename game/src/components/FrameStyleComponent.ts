import { ItemType } from '@opensky/proto'
import { Rarity } from '@skyweaver/state-metadata'
import { Component, Entity } from 'gg'

import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

export function getFrameStyleFromItem(item: ItemType | undefined): Rarity {
  if (item === ItemType.SW_SILVER_CARDS) {
    return 'silver'
  } else if (item === ItemType.SW_GOLD_CARDS) {
    return 'gold'
  } else {
    return 'base'
  }
}

export default class FrameStyleComponent extends Component<Rarity> {
  static entities = new TrackableCollection<Entity<Components>>(
    'FrameStyleComponent'
  )

  onAttach(entity: Entity<Components>) {
    FrameStyleComponent.entities.add(entity)
  }

  onDetach(entity: Entity<Components>) {
    FrameStyleComponent.entities.remove(entity)
  }
}
