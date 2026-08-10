import { Entity } from 'gg'
import { Vector3 } from 'three'

import { Components } from '~/components'
import TransformComponent from '~/components/TransformComponent'
import { TextSentiment } from '~/helpers/typeHelpers'
import { createWorldEntity } from '~/helpers/worldHelpers'
import * as textOptions from '~/systems/text/TextOptions'
import { addText } from '~/utils/textUtils'

import { RENDER_ORDERS } from '../constants'

const TEXT_DEPTH = 0.0001
const flavorLookup = {
  positive: textOptions.attachmentPopupPositive,
  negative: textOptions.attachmentPopupNegative,
  neutral: textOptions.attachmentPopup,
  defensive: textOptions.attachmentPopup,
  offensive: textOptions.attachmentPopup
} as const

export function createAttachmentPopup(
  parent: Entity<Components>,
  text: string,
  flavor: TextSentiment
) {
  const entity = createWorldEntity([
    new TransformComponent({
      parentID: parent.id,
      position: new Vector3(0, 0.005, 0)
    })
  ])

  const textMesh = addText(
    entity.get('transform'),
    text,
    flavorLookup[flavor],
    0,
    TEXT_DEPTH + 0.0004,
    0.02
  )
  textMesh.name = 'TEXT'
  textMesh.renderOrder = RENDER_ORDERS.damage + 2

  const shadowMesh = addText(
    entity.get('transform'),
    text,
    textOptions.attachmentPopupShadow,
    0,
    TEXT_DEPTH + 0.0002,
    0.0183
  )
  shadowMesh.name = 'TEXT_SHADOW'
  shadowMesh.renderOrder = RENDER_ORDERS.damage + 1

  return entity
}
