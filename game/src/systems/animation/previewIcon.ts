import { Entity } from 'gg'

import { Components } from '~/components'
import PreviewIconComponent from '~/components/PreviewIconComponent'
import { createPreviewIconEntity } from '~/factories/PreviewIconFactory'
import { removeWorldEntity } from '~/helpers/worldHelpers'
import IconIndicator from '~/meshes/IconIndicator'
import { cameraShaker } from '~/utils/cameraShaker'

import { world } from '../../world'
import { Easing } from './Easing'
import { simpleTweener } from './tweeners'

export function createPreviewIconAnimation(
  parentEntity: Entity<Components>,
  previewIcon: PreviewIconComponent['value']
) {
  const entity = createPreviewIconEntity(previewIcon.iconName, parentEntity)
  const transform = entity.get('transform')
  const icon = transform.children[0] as IconIndicator

  if (parentEntity.has('deck')) {
    const delta = icon.position
      .clone()
      .sub(cameraShaker.camera.position)
      .normalize()
      .multiplyScalar(0.02)
    icon.position.add(delta)
    icon.position.x -= 0.008
  }

  previewIcon.entityId = entity.id

  simpleTweener.to({
    description: 'add preview icon',
    target: icon,
    propertyGoals: { opacity: 1 },
    duration: 200,
    easing: Easing.Cubic.Out
  })

  return entity
}

export function removePreviewIconAnimation(
  previewIcon: PreviewIconComponent['value']
) {
  if (!previewIcon.entityId) {
    return
  }
  const entity = world.getEntity(previewIcon.entityId)
  if (!entity) {
    return
  }
  const transform = entity.get('transform')
  const icon = transform.children[0] as IconIndicator
  const entityId = entity.id

  simpleTweener.to({
    description: 'remove preview icon',
    target: icon,
    propertyGoals: { opacity: 0 },
    duration: 500,
    easing: Easing.Cubic.Out,
    onComplete() {
      removeWorldEntity(entityId)
    }
  })
}
