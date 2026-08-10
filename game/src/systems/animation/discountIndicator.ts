import { Entity } from 'gg'

import { Components } from '~/components'
import DiscountIndicatorComponent from '~/components/DiscountIndicatorComponent'
import { createDiscountIndicator } from '~/factories/DiscountIndicatorFactory'
import { findObject3DsWhoseNamesInclude } from '~/utils/threeUtils'

import { world } from '../../world'
import TextMesh from '../text/TextMesh'
import { Easing } from './Easing'
import { simpleTweener } from './tweeners'

export function createDiscountIndicatorAnimation(
  parentEntity: Entity<Components>,
  discountIndicator: DiscountIndicatorComponent['value']
) {
  const discountEntity = createDiscountIndicator(parentEntity)
  discountIndicator.entityId = discountEntity.id

  const transform = discountEntity.get('transform')

  for (const mesh of findObject3DsWhoseNamesInclude<TextMesh>(
    transform,
    'TEXT'
  )) {
    mesh.opacity = 0

    simpleTweener.to({
      description: 'discount indicator',
      target: mesh,
      propertyGoals: { opacity: 1 },
      duration: 200,
      easing: Easing.Cubic.Out
    })

    simpleTweener.to({
      description: 'discount indicator',
      target: mesh.position,
      propertyGoals: {
        z: mesh.position.z - 0.01
      },
      duration: 200
    })
  }
}

export function removeDiscountIndicatorAnimation(
  _parentEntity: Entity<Components>,
  discountIndicator: DiscountIndicatorComponent['value']
) {
  if (discountIndicator.entityId === undefined) {
    return
  }
  const discountEntity = world.getEntity(discountIndicator.entityId)
  if (discountEntity === undefined) {
    return
  }
  const transform = discountEntity.get('transform')

  for (const mesh of findObject3DsWhoseNamesInclude<TextMesh>(
    transform,
    'TEXT'
  )) {
    simpleTweener.to({
      description: 'spin between seats',
      target: mesh,
      propertyGoals: { opacity: 0 },
      duration: 500,
      easing: Easing.Cubic.Out,
      onComplete: () => {
        world.removeEntity(discountIndicator.entityId!)
      }
    })
  }
}
