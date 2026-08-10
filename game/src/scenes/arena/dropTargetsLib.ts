import { Entity } from 'gg'
import { Mesh, Object3D, Quaternion, Vector2, Vector3 } from 'three'

import { getAssetsManager } from '~/assets/index'
import {
  getExtraMagicSoundLayer as getMagicGlowExtraSoundLayer,
  getMagicGlowBaseSoundLayer
} from '~/audio/soundLayersLibrary'
import { COLOR_BLACK } from '~/colors/colorLibrary'
import { Components } from '~/components'
import CollidableComponent from '~/components/CollidableComponent'
import HighlightMaterialComponent from '~/components/HighlightMaterialComponent'
import InteractiveIndicatorsComponent from '~/components/InteractiveIndicatorsComponent'
import MeshComponent from '~/components/MeshComponent'
import TransformComponent from '~/components/TransformComponent'
import { ValidDropTarget } from '~/helpers/dropTargetTypes'
import { getFireHighlightOptionOverrides } from '~/helpers/fireHighlightMaterialFactory'
import { createWorldEntity } from '~/helpers/worldHelpers'
import MagicFireHighlightMeshMaterial from '~/materials/MagicFireHighlightMeshMaterial'
import { emitParticlesInCircle } from '~/systems/animation/emitParticlesInCircle'
import UpdateManager from '~/systems/UpdateManager'
import { findObject3DByName, maybeFindObject3DByName } from '~/utils/threeUtils'

import { scene } from './scene'

const __dropTargetsLibrary = new Map<ValidDropTarget, Entity<Components>>()

export function getDropTarget(baseName: ValidDropTarget) {
  if (!__dropTargetsLibrary.has(baseName)) {
    const dropColliderPivot = findObject3DByName<Mesh>(
      scene,
      baseName + '-collider'
    )
    const dropColliderMesh = findObject3DByName<Mesh>(
      scene,
      baseName + '-collider',
      true
    )
    const dropHighlightPivot = findObject3DByName<Mesh>(
      scene,
      baseName + '-highlight'
    )
    const dropHighlightMesh = findObject3DByName<Mesh>(
      scene,
      baseName + '-highlight',
      true
    )
    const dropHighlightBeamMesh = maybeFindObject3DByName<Mesh>(
      scene,
      baseName + '-highlight-beams',
      true
    )
    const mats: MagicFireHighlightMeshMaterial[] = []
    function giveFireHighlightMaterial(mesh: Mesh, suffix: '-beams' | '' = '') {
      const settingsName =
        baseName === 'field'
          ? (`${baseName}${suffix}` as const)
          : (`${baseName}` as const)
      const mat = new MagicFireHighlightMeshMaterial(getAssetsManager(), {
        color: COLOR_BLACK,
        opacityRamp: new Vector2(1.3, -0.8),
        uvScaleV: 3,
        ...getFireHighlightOptionOverrides(settingsName)
      })
      mesh.material = mat
      mats.push(mat)
    }
    giveFireHighlightMaterial(dropHighlightMesh)
    if (dropHighlightBeamMesh) {
      dropHighlightMesh.attach(dropHighlightBeamMesh)
      giveFireHighlightMaterial(dropHighlightBeamMesh, '-beams')
      dropHighlightBeamMesh.visible = true
    }
    dropHighlightPivot.visible = true
    dropHighlightMesh.visible = true

    const ii = new InteractiveIndicatorsComponent()

    const entity = createWorldEntity([
      new TransformComponent({
        position: scene.position,
        rotation: scene.rotation,
        scale: scene.scale
      }),
      new MeshComponent(dropColliderPivot, true),
      new CollidableComponent(dropHighlightPivot, dropColliderMesh, true),
      new HighlightMaterialComponent({
        materials: mats,
        mesh: dropHighlightBeamMesh || dropHighlightMesh
      }),
      ii
    ])
    if (baseName === 'field') {
      const updateBaseMagicSound = getMagicGlowBaseSoundLayer().getController()
      const updateExtraMagicSound =
        getMagicGlowExtraSoundLayer().getController()
      const magicState = ii.value.targetableState
      let lastKnownValue = 0
      let destroy: (() => void) | undefined
      const z = -0.012
      UpdateManager.register({
        update() {
          updateBaseMagicSound(magicState.animatedValue)
          updateExtraMagicSound(ii.value.hoveringState.animatedValue)
          if (lastKnownValue === 0 && magicState.animatedValue > 0) {
            destroy = emitParticlesInCircle(
              entity,
              [new Vector3(-0.02, 0, z), new Vector3(0.02, 0, z)],
              'evaporatedMagicCircle'
            )
          } else if (lastKnownValue > 0 && magicState.animatedValue === 0) {
            if (destroy) {
              destroy()
              destroy = undefined
            }
          }
          lastKnownValue = magicState.animatedValue
        }
      })
    }
    __dropTargetsLibrary.set(baseName, entity)
  }
  return __dropTargetsLibrary.get(baseName)!
}

export function matchDropTargetToTransform(
  entity: Entity<Components>,
  transform: Object3D,
  offset?: Vector3,
  scale?: number,
  quat?: Quaternion
) {
  let c = entity.get('collidable')!
  if (!c.name.includes('collider')) {
    c = c.parent!
  }
  if (!c.name.includes('collider')) {
    throw new Error('Cant find collider mesh')
  }
  const highlightName = c.name.replace('collider', 'highlight')
  const h = findObject3DByName<Mesh>(c.parent!, highlightName)
  c.attach(h)
  transform.add(c)
  if (offset) {
    c.position.copy(offset)
  }
  if (quat) {
    c.applyQuaternion(quat)
  }
  if (scale) {
    c.scale.set(scale, scale, scale)
  }
}
