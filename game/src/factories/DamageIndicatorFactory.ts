import device from '@opensky/shared/device'
import { Entity } from 'gg'
import { Mesh } from 'three'

import { getAssetsManager } from '~/assets/index'
import { Components } from '~/components'
import * as textOptions from '~/systems/text/TextOptions'
import { addText } from '~/utils/textUtils'

import { RENDER_ORDERS } from '../constants'
import { createPreviewIconEntity } from './PreviewIconFactory'

const TEXT_DEPTH = 0.0001

export function createDamageIndicator(entity: Entity<Components>) {
  const damageIndicator = entity.get('damageIndicator')

  const mobileOffset =
    device.isMobile && entity.get('zone').owner === 'Opponent' ? -0.013 : 0

  const damageEntity = createPreviewIconEntity('Death', entity)

  if (!damageIndicator.death) {
    if (entity.get('zone').current.cardStatus === 'Hand') {
      if (damageIndicator.damage || damageIndicator.wither) {
        const shadow = getAssetsManager().fetchMeshDeepClone(
          'gamePiecesGraphical',
          'zShadow-circle',
          true,
          true
        ) as Mesh
        shadow.name = 'SHADOW'
        shadow.position.set(-0.012, TEXT_DEPTH + 0.0002, -0.005)
        shadow.scale.set(0.8, 1, 0.4)
        shadow.frustumCulled = false
        shadow.renderOrder = RENDER_ORDERS.damage + 1
        damageEntity.get('transform').add(shadow)

        const damageText =
          damageIndicator.damage === undefined || damageIndicator.damage === 0
            ? {
                text: '-0',
                color: textOptions.generic.color
              }
            : damageIndicator.damage > 0
            ? {
                text: `${-damageIndicator.damage}`,
                color: textOptions.damageNumber.color
              }
            : {
                text: `+${-damageIndicator.damage}`,
                color: textOptions.buffNumber.color
              }

        const witherText =
          damageIndicator.wither === undefined || damageIndicator.wither === 0
            ? {
                text: '-0',
                color: textOptions.generic.color
              }
            : damageIndicator.wither > 0
            ? {
                text: `${-damageIndicator.wither}`,
                color: textOptions.damageNumber.color
              }
            : {
                text: `+${-damageIndicator.wither}`,
                color: textOptions.buffNumber.color
              }

        const text = addText(
          damageEntity.get('transform'),
          [
            witherText,
            {
              text: '/',
              color: textOptions.generic.color
            },
            damageText
          ],
          { ...textOptions.damageNumberShadow, size: 26 },
          -0.013,
          TEXT_DEPTH + 0.0004,
          -0.008
        )
        text.name = 'TEXT'
        text.renderOrder = RENDER_ORDERS.damage + 2
      }
    } else {
      if (typeof damageIndicator.damage === 'number') {
        const text =
          damageIndicator.damage === 0
            ? '-0'
            : damageIndicator.damage < 0
            ? `+${-damageIndicator.damage}`
            : `${-damageIndicator.damage}`

        const options =
          damageIndicator.damage < 0
            ? { ...textOptions.buffNumber }
            : { ...textOptions.damageNumber }
        options.size = 40

        const shadowOptions =
          damageIndicator.damage < 0
            ? { ...textOptions.buffNumberShadow }
            : { ...textOptions.damageNumberShadow }
        shadowOptions.size = 40

        const damageText = addText(
          damageEntity.get('transform'),
          text,
          options,
          0.0133,
          TEXT_DEPTH + 0.0004,
          0.015 + mobileOffset
        )
        damageText.name = 'DAMAGE_TEXT'
        damageText.renderOrder = RENDER_ORDERS.damage + 2

        const damageTextShadow = addText(
          damageEntity.get('transform'),
          text,
          shadowOptions,
          0.0133,
          TEXT_DEPTH + 0.0002,
          0.0123 + mobileOffset
        )
        damageTextShadow.name = 'DAMAGE_TEXT_SHADOW'
        damageTextShadow.renderOrder = RENDER_ORDERS.damage + 1
      }
      if (damageIndicator.wither) {
        const text =
          damageIndicator.wither < 0
            ? `+${-damageIndicator.wither}`
            : `${-damageIndicator.wither}`

        const options =
          damageIndicator.wither < 0
            ? { ...textOptions.buffNumber }
            : { ...textOptions.damageNumber }
        options.size = 40

        const shadowOptions =
          damageIndicator.wither < 0
            ? { ...textOptions.buffNumberShadow }
            : { ...textOptions.damageNumberShadow }
        shadowOptions.size = 40

        const witherText = addText(
          damageEntity.get('transform'),
          text,
          options,
          -0.017,
          TEXT_DEPTH + 0.0004,
          0.015 + mobileOffset
        )
        witherText.name = 'WITHER_TEXT'
        witherText.renderOrder = RENDER_ORDERS.damage + 2

        const witherTextShadow = addText(
          damageEntity.get('transform'),
          text,
          shadowOptions,
          -0.017,
          TEXT_DEPTH + 0.0002,
          0.0123 + mobileOffset
        )
        witherTextShadow.name = 'WITHER_TEXT_SHADOW'
        witherTextShadow.renderOrder = RENDER_ORDERS.damage + 1
      }
    }
  }

  return damageEntity
}
