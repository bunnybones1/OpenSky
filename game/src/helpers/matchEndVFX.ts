import { listenToProperty } from '@opensky/shared/utils/propertyListeners'
import { Object3D } from 'three'

import { openPortal } from '~/helpers/meshEffectHelpers'
import PortalMeshMaterial from '~/materials/PortalMeshMateiral'
import { Easing } from '~/systems/animation/Easing'
import { simpleTweener } from '~/systems/animation/tweeners'

type Anim = { scale: number }

type AnimatedObjectPack = {
  pivot: Object3D
  obj: Object3D
  anim: Anim
}

function animScale(
  target: Anim,
  scale: number,
  duration: number,
  easing = Easing.Quartic.Out
) {
  return simpleTweener.to({
    description: 'match end scale',
    target,
    propertyGoals: { scale },
    duration,
    easing
  }).finished
}

const __goldenPortals = new Map<Object3D, AnimatedObjectPack>()

export function getGoldenPortal(container: Object3D): AnimatedObjectPack {
  if (!__goldenPortals.has(container)) {
    const portalPivot = new Object3D()
    container.add(portalPivot)
    const portal = openPortal(portalPivot, 2000, 'golden')
    const obj = portal.mesh
    const mat = obj.material as PortalMeshMaterial

    const anim = { scale: 0 }
    listenToProperty(anim, 'scale', v => obj.scale.setScalar(v))
    const goldenPortal = { obj, mat, anim, pivot: portalPivot }
    __goldenPortals.set(container, goldenPortal)
  }
  return __goldenPortals.get(container)!
}

export async function showGoldenPortal(container: Object3D, duration = 400) {
  const goldenPortal = getGoldenPortal(container)
  await animScale(goldenPortal.anim, 1, duration, Easing.Quartic.Out)
}
