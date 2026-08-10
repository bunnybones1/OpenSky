import { Entity } from 'gg'
import { Mesh } from 'three'

import { Components } from '~/components'
import DamageIndicatorComponent from '~/components/DamageIndicatorComponent'
import { createDamageIndicator } from '~/factories/DamageIndicatorFactory'
import { removeWorldEntity } from '~/helpers/worldHelpers'
import ZShadowMeshMaterial from '~/materials/ZShadowMeshMaterial'
import IconIndicator from '~/meshes/IconIndicator'
import {
  findObject3DByName,
  findObject3DsWhoseNamesInclude
} from '~/utils/threeUtils'

import { world } from '../../world'
import TextMesh from '../text/TextMesh'
import { Easing } from './Easing'
import { simpleTweener } from './tweeners'

export function createDamageIndicatorAnimation(
  parentEntity: Entity<Components>,
  damageIndicator: DamageIndicatorComponent['value']
) {
  const damageEntity = createDamageIndicator(parentEntity)
  damageIndicator.entityId = damageEntity.id
  if (parentEntity.has('interactiveIndicators')) {
    const interactiveIndicators = parentEntity.get('interactiveIndicators')
    if (
      (damageIndicator.damage !== undefined && damageIndicator.damage > 0) ||
      damageIndicator.death
    ) {
      interactiveIndicators.damagePredictionState.value = true
    }
    if (damageIndicator.damage !== undefined && damageIndicator.damage < 0) {
      interactiveIndicators.healingPredictionState.value = true
    }
  }

  const transform = damageEntity.get('transform')
  const deathMesh = damageEntity.get('mesh')

  deathMesh.visible = !!damageIndicator.death

  if (
    !damageIndicator.death &&
    parentEntity.get('zone').current.cardStatus === 'Hand'
  ) {
    try {
      const shadow = findObject3DByName<Mesh>(transform, 'SHADOW')

      if (shadow.material instanceof ZShadowMeshMaterial) {
        shadow.material.uniforms.uOpacity.value = 0

        simpleTweener.to({
          description: 'show damage indicator shadow',
          target: shadow.material.uniforms.uOpacity,
          propertyGoals: { value: 1 },
          duration: 200,
          easing: Easing.Cubic.Out
        })
      } else {
        throw new Error('expected a ZShadowMeshMaterial')
      }

      simpleTweener.to({
        description: 'slide damage indicator shadow',
        target: shadow.position,
        propertyGoals: {
          z: shadow.position.z - 0.01
        },
        duration: 200
      })
    } catch {
      // damage indicator shadow might not exist
    }
  }

  for (const mesh of findObject3DsWhoseNamesInclude<TextMesh>(
    transform,
    'TEXT'
  )) {
    mesh.opacity = 0

    simpleTweener.to({
      description: 'show damage indicator',
      target: mesh,
      propertyGoals: { opacity: 1 },
      duration: 200,
      easing: Easing.Cubic.Out
    })

    simpleTweener.to({
      description: 'slide damage indicator',
      target: mesh.position,
      propertyGoals: {
        z: mesh.position.z - 0.01
      },
      duration: 200
    })
  }
}

export function removeDamageIndicatorAnimation(
  parentEntity: Entity<Components>,
  damageIndicator: DamageIndicatorComponent['value']
) {
  if (parentEntity.has('interactiveIndicators')) {
    const interactiveIndicators = parentEntity.get('interactiveIndicators')
    interactiveIndicators.damagePredictionState.value = false
    interactiveIndicators.healingPredictionState.value = false
  }

  if (!damageIndicator.entityId) {
    return
  }
  const damageEntity = world.getEntity(damageIndicator.entityId)
  if (!damageEntity) {
    return
  }
  const entityId = damageEntity.id
  const transform = damageEntity.get('transform')
  const deathMesh = damageEntity.get('mesh') as IconIndicator

  for (const mesh of findObject3DsWhoseNamesInclude<TextMesh>(
    transform,
    'TEXT'
  )) {
    simpleTweener.to({
      description: 'remove damage indicator',
      target: mesh,
      propertyGoals: { opacity: 0 },
      duration: 500,
      easing: Easing.Cubic.Out
    })
  }

  try {
    const shadow = findObject3DByName<Mesh>(transform, 'SHADOW')

    if (shadow.material instanceof ZShadowMeshMaterial) {
      simpleTweener.to({
        description: 'remove damage indicator shadow',
        target: shadow.material.uniforms.uOpacity,
        propertyGoals: { value: 0 },
        duration: 500,
        easing: Easing.Cubic.Out
      })
    } else {
      console.error('expected a ZShadowMeshMaterial')
    }
  } catch {
    // damage indicator shadow might not exist
  }

  simpleTweener.to({
    description: 'remove death preview',
    target: deathMesh,
    propertyGoals: { opacity: 0 },
    duration: 500,
    easing: Easing.Cubic.Out,
    onComplete() {
      removeWorldEntity(entityId)
    }
  })
}
