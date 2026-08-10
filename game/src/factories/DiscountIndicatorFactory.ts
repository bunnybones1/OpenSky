import { Entity } from 'gg'
import { Vector3 } from 'three'

import { Components } from '~/components'
import TransformComponent from '~/components/TransformComponent'
import { createWorldEntity } from '~/helpers/worldHelpers'
import * as textOptions from '~/systems/text/TextOptions'
import { addText } from '~/utils/textUtils'

import { RENDER_ORDERS } from '../constants'

const TEXT_DEPTH = 0.0001

export function createDiscountIndicator(entity: Entity<Components>) {
  const discountIndicator = entity.get('discountIndicator')

  const discountEntity = createWorldEntity([
    new TransformComponent({
      parentID: entity.id,
      position: new Vector3(-0.033, 0.005, -0.05)
    })
  ])

  if (discountIndicator.discount) {
    const text =
      discountIndicator.discount < 0
        ? `+${-discountIndicator.discount}`
        : `${-discountIndicator.discount}`

    const options =
      discountIndicator.discount < 0
        ? { ...textOptions.damageNumber }
        : { ...textOptions.buffNumber }
    options.size = 40

    const shadowOptions =
      discountIndicator.discount < 0
        ? { ...textOptions.damageNumberShadow }
        : { ...textOptions.buffNumberShadow }
    shadowOptions.size = 40

    const discountText = addText(
      discountEntity.get('transform'),
      text,
      options,
      0.018,
      TEXT_DEPTH + 0.0004,
      0.015
    )
    discountText.name = 'TEXT'
    discountText.renderOrder = RENDER_ORDERS.damage + 2

    const discountTextShadow = addText(
      discountEntity.get('transform'),
      text,
      shadowOptions,
      0.018,
      TEXT_DEPTH + 0.0002,
      0.0123
    )
    discountTextShadow.name = 'TEXT_SHADOW'
    discountTextShadow.renderOrder = RENDER_ORDERS.damage + 1
  }

  return discountEntity
}
