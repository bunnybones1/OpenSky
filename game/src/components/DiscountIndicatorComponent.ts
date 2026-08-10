import { Component, Entity } from 'gg'

import {
  createDiscountIndicatorAnimation,
  removeDiscountIndicatorAnimation
} from '~/systems/animation/discountIndicator'

import { Components } from '.'

interface DiscountIndicatorValue {
  discount: number
  entityId?: number
}

export default class DiscountIndicatorComponent extends Component<DiscountIndicatorValue> {
  onAttach(entity: Entity<Components>) {
    createDiscountIndicatorAnimation(entity, this.value)
  }

  onDetach(entity: Entity<Components>) {
    removeDiscountIndicatorAnimation(entity, this.value)
  }
}
