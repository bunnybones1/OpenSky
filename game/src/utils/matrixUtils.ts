import { pushToArrayMap } from '@opensky/shared/utils/arrayUtils'
import { Camera, Matrix4, Object3D, Vector3 } from 'three'

const __tracked = new Map<Object3D, Array<(target: Object3D) => void>>()

export function addOverloadToWorldMatrixUpdate<T extends Object3D>(
  obj: T,
  overload: (target: T) => void
) {
  let overloads: Array<(target: T) => void>
  if (!__tracked.has(obj)) {
    overloads = [overload]
    obj.updateMatrixWorld = function overloadedUpdateMatrixWorld(
      force: boolean | undefined
    ) {
      Object3D.prototype.updateMatrixWorld.call(this, force)
      for (const ol of overloads) {
        ol(obj)
      }
    }
    __tracked.set(obj, overloads)
  } else {
    pushToArrayMap(__tracked, obj, overload)
  }
}

const __updateRenderOrderBasedOnRenderZsByCamera = new Map<
  Camera,
  (target: Object3D) => void
>()
export function makeCameraUpdateRenderOrderBasedOnRenderZ(camera: Camera) {
  if (!__updateRenderOrderBasedOnRenderZsByCamera.has(camera)) {
    __updateRenderOrderBasedOnRenderZsByCamera.set(
      camera,
      updateRenderOrderBasedOnRenderZ.bind(null, camera)
    )
  }
  return __updateRenderOrderBasedOnRenderZsByCamera.get(camera)!
}

const __modelViewMatrix = new Matrix4()
const __tempVec3 = new Vector3()
function updateRenderOrderBasedOnRenderZ(camera: Camera, target: Object3D) {
  // to micromanage sort order to prevent all overdraw
  __tempVec3.set(0, 0, 0)
  __modelViewMatrix.multiplyMatrices(
    camera.matrixWorldInverse,
    target.matrixWorld
  )
  __tempVec3.applyMatrix4(__modelViewMatrix)
  target.renderOrder += -__tempVec3.z * 0.0001
}
