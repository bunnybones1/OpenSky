import { Entity } from 'gg'
import { Material, Mesh, Vector3 } from 'three'

import { Components } from '~/components'
import { createTrigger } from '~/factories/TriggerFactory'
import { removeWorldEntity } from '~/helpers/worldHelpers'
import { getYadaYadaDuration } from '~/helpers/yadaYadaDurationHelper'
import { animationDelay } from '~/utils/asyncUtils'

import { Easing } from './Easing'
import { simpleTweener } from './tweeners'

export async function createTriggerAnimation(
  parent: Entity<Components> | Vector3,
  type: 'trigger' | 'aura'
) {
  const entity = createTrigger(
    parent instanceof Entity ? parent.id : parent,
    type
  )
  const transform = entity.get('transform')

  if (
    parent instanceof Entity &&
    parent.has('character') &&
    parent.has('triggersHolder')
  ) {
    transform.position.z += 0.037
  }
  const mesh = transform.children[0] as Mesh
  const material = mesh.material as Material

  // cache the entity ID, in case this entityis released & reused in between
  const entityId = entity.id

  await animationDelay(400 * getYadaYadaDuration('trigger'))

  simpleTweener.to({
    description: 'trigger anim',
    target: material,
    propertyGoals: { opacity: 0 },
    duration: 1000,
    easing: Easing.Cubic.Out,
    onComplete() {
      removeWorldEntity(entityId)
    }
  })
}
