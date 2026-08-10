import { Component, Entity } from 'gg'

import {
  createDamageIndicatorAnimation,
  removeDamageIndicatorAnimation
} from '~/systems/animation/damageIndicator'

import { Components } from '.'

interface DamageIndicatorValue {
  death: boolean
  damage?: number
  wither?: number
  entityId?: number
}

export default class DamageIndicatorComponent extends Component<DamageIndicatorValue> {
  onAttach(entity: Entity<Components>) {
    createDamageIndicatorAnimation(entity, this.value)
  }

  onDetach(entity: Entity<Components>) {
    removeDamageIndicatorAnimation(entity, this.value)
  }
}
