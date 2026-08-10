import {
  CardAttributes,
  CardInstance,
  CardState,
  SkyWeaver
} from '@skyweaver/state-metadata'
import { Component, Entity } from 'gg'

import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

export type RelaxedCardAttributes = Omit<
  CardAttributes,
  'health' | 'power' | 'cost'
> & {
  health: string | number
  power: string | number
  cost: string | number
}

type RelaxedCardState = Omit<CardState, 'instance' | 'view'> & {
  view: RelaxedCardAttributes
}

export type RelaxedCardInstance = Omit<CardInstance<SkyWeaver>, 'state'> & {
  state: RelaxedCardState
}

export default class CardInstanceComponent extends Component<
  Readonly<RelaxedCardInstance>
> {
  static entities = new TrackableCollection<Entity<Components>>(
    'CardInstanceComponent'
  )
  onAttach(entity: Entity<Components>) {
    CardInstanceComponent.entities.add(entity)
  }
  onDetach(entity: Entity<Components>) {
    CardInstanceComponent.entities.remove(entity)
  }
}
