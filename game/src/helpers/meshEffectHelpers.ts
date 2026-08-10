import { prismsToDeckClass } from '@opensky/shared/helpers'
import { Prism } from '@skyweaver/state-metadata'
import {
  AdditiveBlending,
  Material,
  Mesh,
  MeshBasicMaterial,
  Object3D
} from 'three'

import { getAssetsManager } from '~/assets/index'
import BasicMapMeshMaterial from '~/materials/BasicMapMeshMaterial'
import PortalMeshMaterial from '~/materials/PortalMeshMateiral'
import { scene } from '~/scenes/arena/scene'
import { Easing } from '~/systems/animation/Easing'
import { AnimatedObject, CompleteStatus } from '~/systems/animation/RawTweener'
import { simpleTweener } from '~/systems/animation/tweeners'
import { animationDelay } from '~/utils/asyncUtils'
import { getSharedPlaneBufferGeometry } from '~/utils/geometry'
import { safelyResetFlipY } from '~/utils/textureUtils'
import { maybeFindMeshByName } from '~/utils/threeUtils'

import { portalVariantParams, SupportedPortalVariants } from './portalSettings'

const __armorAnimationRegistry = new Map<Object3D, AnimatedObject<any>>()

export function wrapInArmorBubble(target: Object3D) {
  let armorBubble = maybeFindMeshByName(target, 'armor-bubble')
  if (!armorBubble) {
    armorBubble = getAssetsManager().fetchMeshDeepClone(
      'gameArmorEffect',
      'armor-bubble',
      true,
      true
    ) as Mesh
    armorBubble.scale.set(1.2, 1.2, 1.2)
    armorBubble.position.z = -0.006
    target.add(armorBubble)
    const initMat = armorBubble.material as Material
    initMat.opacity = 0.0
  }
  const mat = armorBubble.material as Material
  const animVal = { value: 0 }
  const initLight = mat.opacity
  if (__armorAnimationRegistry.has(armorBubble)) {
    simpleTweener.kill(__armorAnimationRegistry.get(armorBubble)!)
  }
  __armorAnimationRegistry.set(
    armorBubble,
    simpleTweener.to({
      description: 'wrap in armor bubble',
      target: animVal,
      propertyGoals: {
        value: 1
      },
      duration: 4000,
      onUpdate() {
        const v = animVal.value
        const iv = 1 - v
        const newBurst = (1 - Math.pow(iv, 32)) * (iv * iv)
        const lightFloor = initLight * (1 - v)
        const lightRoom = 1 - lightFloor
        mat.opacity = lightFloor + lightRoom * newBurst
      },
      onComplete: cs => {
        if (cs === CompleteStatus.Finished) {
          armorBubble!.parent?.remove(armorBubble!)
          __armorAnimationRegistry.delete(armorBubble!)
        }
      }
    })
  )
}

const __portalRegistry = new Map<Object3D, AnimatedObject<any>>()

export function openPortal(
  target: Object3D,
  duration = 1500,
  variant?: SupportedPortalVariants
) {
  let portal = maybeFindMeshByName(target, 'spiral')
  if (!portal) {
    portal = getAssetsManager().fetchMeshDeepClone(
      'gamePiecesPhysical',
      'spiral',
      undefined,
      true
    ) as Mesh
    const portal2 = maybeFindMeshByName(portal, 'spiral2')
    if (portal.material instanceof PortalMeshMaterial) {
      portal.material = variant
        ? portal.material.variant(portalVariantParams[variant])
        : portal.material.clone()
    }
    const initMat = portal.material as PortalMeshMaterial
    initMat.opacity = 0.0
    if (portal2) {
      if (portal2.material instanceof PortalMeshMaterial) {
        const mat2 = variant
          ? portal2.material.variant(portalVariantParams[variant])
          : portal2.material.clone()
        mat2.uniforms.uniqueness = initMat.uniforms.uniqueness
        portal2.material = mat2
      }
      const initMat2 = portal2.material as PortalMeshMaterial
      initMat2.opacity = 0.0
    }
    target.add(portal)
    animationDelay(100).then(() => {
      scene.attach(portal!)
    })

    portal.scale.set(
      variant && portalVariantParams[variant].reverse ? -3 : 3,
      3,
      3
    )
    portal.position.z = -0.006

    if (
      portal &&
      variant &&
      ['agy', 'wis', 'int', 'str', 'hrt'].includes(variant)
    ) {
      const myPortal = portal
      portal.scale.multiplyScalar(1.5)
      const prism: Prism[] = []
      prism.push(variant as Prism)
      getPrismMesh3D(prism, true).then(prismMesh => {
        prismMesh.scale.multiplyScalar(0.01)
        target.add(prismMesh)
        prismMesh.rotation.x -= Math.PI * 0.5
        prismMesh.position.y += 0.03
      })

      getAssetsManager()
        .load('texture', `game/prisms/large/${variant.toUpperCase()}.png`)
        .then(prismsTexture => {
          safelyResetFlipY(prismsTexture)
          const mat = new BasicMapMeshMaterial(
            {
              map: prismsTexture,
              supportOpacity: true
            },
            {
              depthWrite: false,
              opacity: 0
            }
          )
          const animProxy = { val: 0 }
          const geo = getSharedPlaneBufferGeometry()
          const prismMesh = new Mesh(geo, mat)

          const overlayMat = mat.clone()
          overlayMat.blending = AdditiveBlending
          const prismMeshOverlay = new Mesh(geo, overlayMat)

          for (const mesh of [prismMesh, prismMeshOverlay]) {
            mesh.rotateX(Math.PI * 0.5)
            mesh.rotateY(Math.PI)
            mesh.scale.multiplyScalar(0.01)
            mesh.renderOrder = 1
            mesh.position.z = -0.015
          }

          myPortal.add(prismMesh)
          myPortal.add(prismMeshOverlay)

          simpleTweener.to({
            description: 'prism icon animate in',
            target: animProxy,
            propertyGoals: { val: 1 },
            duration: 1500,
            easing: Easing.Linear,
            onUpdate: () => {
              mat.opacity = Easing.Custom.FadeInOut(animProxy.val)
              overlayMat.opacity = Easing.Custom.FadeInOut(animProxy.val)
            }
          })
        })
    }
  }
  const mat = portal.material as Material
  const portal2 = maybeFindMeshByName(portal, 'spiral2')!
  const mat2 = portal2.material as Material
  const animVal = { value: 0 }
  const initLight = mat.opacity
  if (__portalRegistry.has(portal)) {
    simpleTweener.kill(__portalRegistry.get(portal)!)
  }
  const animation = simpleTweener.to({
    description: 'open portal',
    target: animVal,
    propertyGoals: {
      value: 1
    },
    duration,
    onUpdate() {
      const v = animVal.value
      const iv = 1 - v
      const newBurst = (1 - Math.pow(iv, 32)) * (1 - Math.pow(v, 8))
      const lightFloor = initLight * iv
      const lightRoom = 1 - lightFloor
      mat.opacity = lightFloor + lightRoom * newBurst
      mat2.opacity = mat.opacity
    },
    onComplete: cs => {
      if (cs === CompleteStatus.Finished) {
        portal!.parent?.remove(portal!)
        __portalRegistry.delete(portal!)
      }
    }
  })
  __portalRegistry.set(portal, animation)
  return { mesh: portal, animation }
}

function getPrismMesh3D(prisms: Prism[], large = false) {
  const prismsUrl = `game/prisms/${large ? 'large/' : ''}${prismsToDeckClass(
    prisms
  )}.png`
  return getAssetsManager()
    .load('texture', prismsUrl)
    .then(prismsTexture => {
      safelyResetFlipY(prismsTexture)
      const mat = new MeshBasicMaterial({
        map: prismsTexture
      })
      const geo = getSharedPlaneBufferGeometry()
      return new Mesh(geo, mat)
    })
}
