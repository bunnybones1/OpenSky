import { Entity } from 'gg'
import { BackSide, DoubleSide, Vector3 } from 'three'

import { CardCacheWithEntities } from '~/cardCache'
import { Components } from '~/components'
import { scene } from '~/scenes/arena/scene'
import { MeshEffect } from '~/systems/animation/meshAnimationTypes'
import { ActionStack } from '~/systems/AnimationOrchestrator'
import { animationDelay } from '~/utils/asyncUtils'
import { cameraShaker } from '~/utils/cameraShaker'

import { getHero } from './effectHelpers'
import { PaletteName } from './meshAnimationHelpers'

export function cardCastingAdjustments(
  effect: MeshEffect,
  entity: Entity<Components>
) {
  if (entity.has('mesh')) {
    effect.mesh.rotation.copy(entity.get('mesh').rotation)

    const delta = effect.mesh.position
      .clone()
      .sub(cameraShaker.camera.position)
      .normalize()
      .multiplyScalar(0.0035)
    effect.mesh.position.sub(delta)

    if (!entity.has('player')) {
      effect.mesh.position.add(new Vector3(0, 0, 0.00025))
    }
  }
}

export function addEffectToSceneRelativeToCamera(
  effect: MeshEffect,
  translation: Vector3
) {
  effect.mesh.position.copy(cameraShaker.camera.position)
  effect.mesh.position.add(translation)
  effect.mesh.quaternion.copy(cameraShaker.camera.quaternion)
  effect.mesh.rotation.x += Math.PI / 2
  scene.add(effect.mesh)
}

export function puddleChasmAdjustments(
  targetEntity: Entity<Components> | undefined,
  effect: MeshEffect,
  isPlacedAgainstArena?: boolean,
  isChasm?: boolean,
  translation?: Vector3,
  scalarMultiply?: number
) {
  if (targetEntity && targetEntity.has('transform')) {
    const targetTransform = targetEntity.get('transform')
    const position = targetTransform.position.clone()
    const rotation = targetTransform.rotation.clone()

    effect.mesh.position.copy(position)

    if (isPlacedAgainstArena) {
      effect.mesh.position.add(new Vector3(0, -0.0425, -0.05))
      if (isChasm) {
        effect.mesh.position.add(new Vector3(0, 0, -0.01))
      }
      effect.mesh.scale.multiply(new Vector3(1.25, 1, 2))
    } else {
      effect.mesh.rotation.copy(rotation)
      if (scalarMultiply) {
        effect.mesh.scale.multiplyScalar(scalarMultiply)
      }
      if (isChasm) {
        effect.mesh.position.add(new Vector3(0, -0.008, -0.008))
      }
      if (translation) {
        effect.mesh.position.add(translation)
      }
    }

    effect.mesh.position.x += position.x / 30
    if (!targetEntity.has('player')) {
      effect.mesh.position.add(new Vector3(0, 0, -0.004))
    }
    if (targetEntity.has('hero')) {
      effect.mesh.position.add(new Vector3(0, 0, 0.012))
      if (isChasm) {
        effect.mesh.position.add(new Vector3(0, 0, 0.004))
      }
      effect.mesh.position.x -= position.x / 45
    }
  }
}

export function adjustToMidFieldCenter(
  effect: MeshEffect,
  _entity: Entity<Components>
) {
  effect.mesh.position.copy(new Vector3(0, 0.035, 0.05))
}

export function adjustToOpposingFieldCenter(
  effect: MeshEffect,
  entity: Entity<Components>
) {
  if (entity.has('player')) {
    effect.mesh.position.copy(new Vector3(0, 0.035, -0.079185))
  } else {
    effect.mesh.position.copy(new Vector3(0, 0.035, 0.17246))
  }
}

export function adjustToOwnerFieldCenter(
  effect: MeshEffect,
  entity: Entity<Components>
) {
  if (entity.has('player')) {
    effect.mesh.position.copy(new Vector3(0, 0.035, 0.17246))
  } else {
    effect.mesh.position.copy(new Vector3(0, 0.035, -0.079185))
  }
}

export function adjustToOverOwnerGraveyard(
  effect: MeshEffect,
  entity: Entity<Components>
) {
  if (entity.has('player')) {
    effect.mesh.position.copy(new Vector3(-0.25, 0.11, 0.11))
  } else {
    effect.mesh.position.copy(new Vector3(-0.23, 0.13, 0.02))
  }
}

export function horikVengeanceAdjustments(
  effect: MeshEffect,
  entity: Entity<Components>,
  targetEntity: Entity<Components> | undefined
) {
  if (
    entity.has('transform') &&
    targetEntity &&
    targetEntity.has('transform')
  ) {
    const targetTransform = targetEntity.get('transform')
    const mesh = effect.mesh

    scene.add(mesh)

    mesh.position.copy(targetTransform.position)
    mesh.quaternion.copy(targetTransform.quaternion)

    const isTargetPlayerOwned = targetEntity.has('player')

    if (!isTargetPlayerOwned) {
      // adjustments for targeting opponent field
      const translation = new Vector3(-0.0118, 0.33, 0.101).applyQuaternion(
        targetTransform.quaternion
      )
      mesh.position.add(translation)
      mesh.position.x -= targetTransform.position.x / 2.25

      if (targetTransform.position.x < 0) {
        mesh.rotation.z += Math.PI
        mesh.material.side = BackSide
        mesh.position.x += 0.025
      }
    } else {
      // adjustments for targeting player field
      mesh.rotation.y += Math.PI
      mesh.material.side = DoubleSide

      const translation = new Vector3(0.013, 0.24, -0.0425).applyQuaternion(
        targetTransform.quaternion
      )
      mesh.position.add(translation)
      mesh.position.x -= targetTransform.position.x / 2.25

      if (targetTransform.position.x > 0) {
        mesh.scale.x *= -1
        mesh.position.x -= 0.025
      }

      if (effect.name === 'horik_vengeance_axe') {
        animationDelay(350).then(() => {
          mesh.rotation.y += Math.PI
          mesh.rotation.z += Math.PI
          const translation = new Vector3(0, 0, 0.076).applyQuaternion(
            targetTransform.quaternion
          )
          mesh.position.add(translation)
        })
      } else {
        mesh.rotation.y += Math.PI
        mesh.rotation.z += Math.PI

        const translation = new Vector3(0, 0, 0.076).applyQuaternion(
          targetTransform.quaternion
        )
        mesh.position.add(translation)
      }
    }

    if (effect.name === 'horik_vengeance_axe') {
      mesh.position.y += 0.0001
    }
  }
}

export function adjustToInfrontOfCard(
  effect: MeshEffect,
  entity: Entity<Components>
) {
  if (entity.has('transform')) {
    const entityTransform = entity.get('transform')

    effect.mesh.rotation.copy(entityTransform.rotation)
    effect.mesh.rotateX(-entityTransform.rotation.x)

    effect.mesh.position.add(new Vector3(0, 0.0015, 0.0015))
    effect.mesh.position.add(new Vector3(0, 0.001, 0))
  }
}

export function adjustToUnderneathCard(
  effect: MeshEffect,
  entity: Entity<Components>
) {
  if (entity.has('transform')) {
    const entityTransform = entity.get('transform')

    entityTransform.add(effect.mesh)
    effect.mesh.rotation.x = -entityTransform.rotation.x
    effect.mesh.scale.multiplyScalar(0.2)
    effect.mesh.material.opacity = 0.1
    effect.mesh.position.add(new Vector3(0, 0, 0.045))
    scene.attach(effect.mesh)
  }
}

export function spellOwnerHero():
  | ((
      entity?: Entity<Components>,
      context?: ActionStack,
      cardCache?: CardCacheWithEntities
    ) => Entity<Components> | undefined)
  | undefined {
  return (
    _entity?: Entity<Components>,
    context?: ActionStack,
    cardCache?: CardCacheWithEntities
  ) => {
    if (context && context.playerAction[1].type === 'PlayCard' && cardCache) {
      const cardID = context.playerAction[1].cardID
      const cardEntity = cardCache.getEntity(cardID)
      if (cardEntity) {
        const hasPlayer = cardEntity.has('player')
        const heroEntity = getHero(hasPlayer)
        return heroEntity
      } else {
        return undefined
      }
    } else {
      return undefined
    }
  }
}

export function OpposingHero():
  | ((
      entity?: Entity<Components>,
      context?: ActionStack,
      cardCache?: CardCacheWithEntities
    ) => Entity<Components> | undefined)
  | undefined {
  return (
    _entity?: Entity<Components>,
    context?: ActionStack,
    cardCache?: CardCacheWithEntities
  ) => {
    if (context && context.playerAction[1].type === 'PlayCard' && cardCache) {
      const cardID = context.playerAction[1].cardID
      const cardEntity = cardCache.getEntity(cardID)
      if (cardEntity) {
        const hasPlayer = cardEntity.has('player')
        const heroEntity = getHero(!hasPlayer)
        return heroEntity
      } else {
        return undefined
      }
    } else {
      return undefined
    }
  }
}

export function attachToScene():
  | ((
      entity?: Entity<Components>,
      context?: ActionStack,
      cardCache?: CardCacheWithEntities
    ) => Entity<Components> | undefined | null)
  | undefined {
  return (
    _entity?: Entity<Components>,
    _context?: ActionStack,
    _cardCache?: CardCacheWithEntities
  ) => {
    return null
  }
}

export function targetInstanceElement():
  | PaletteName
  | ((
      entity: Entity<Components>,
      context?: ActionStack,
      cardCache?: CardCacheWithEntities,
      targetEntity?: Entity<Components>,
      suffix?: string
    ) => PaletteName | undefined)
  | undefined {
  return (
    _entity: Entity<Components>,
    _context?: ActionStack,
    _cardCache?: CardCacheWithEntities,
    targetEntity?: Entity<Components>,
    suffix = '_mane'
  ) => {
    if (targetEntity && targetEntity.has('cardInstance')) {
      const instance = targetEntity.get('cardInstance')
      const paletteName = instance.state.view.element + suffix
      return paletteName as PaletteName
    } else {
      return undefined
    }
  }
}
