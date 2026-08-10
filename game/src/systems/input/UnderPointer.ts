import { renderMetrics } from '@opensky/shared/renderMetrics'
import { Entity } from 'gg'
import { Object3D, Vector3, Vector4 } from 'three'

import { Components } from '~/components'
import { HIT_TEST_CLIP_SPACE_RADIUS } from '~/constants'
import { isClipCoordWithinObject } from '~/helpers/I2D'
import { hitTestAtPixel } from '~/utils/camera'
import { cameraShaker } from '~/utils/cameraShaker'
import ColliderMesh from '~/utils/ColliderMesh'
import { findContainingScene, traverseVisible } from '~/utils/threeUtils'
import { ReadonlyTrackableCollection } from '~/utils/TrackableCollection'

import { EntityColliderCache } from './EntityColliderCache'
import GeneralInput from './GeneralInput'

/**
 * @returns true to stop propagation, false to continue firing reactions underneath.
 */
type ReactionCallback = (
  entity: Entity<Components>,
  position: Vector3
) => boolean

export class UnderPointer {
  cleanUpEntityCollider(entity: Entity<Components>) {
    this._roots3D.cleanUpEntityCollider(entity)
  }
  collider2D: ColliderMesh | undefined
  entity: Entity<Components> | undefined
  clipSpaceDepth = 1
  worldPos: Vector3 = __interactive.worldPos
  private _roots2D: Object3D[] = []
  private _roots3D: EntityColliderCache<Entity<Components>> =
    new EntityColliderCache()
  private _lastX = -1000
  get lastX() {
    return this._lastX
  }
  set lastX(value) {
    throw new Error('Do no set lastX')
  }
  private _lastY = -1000
  get lastY() {
    return this._lastY
  }
  set lastY(value) {
    throw new Error('Do no set lastY')
  }
  constructor(private _inputProvider: GeneralInput) {
    _inputProvider.onAnything.addListener(this.updateUnder)
  }
  update() {
    this.updateUnder(this._lastX, this._lastY)
  }
  updateUnder = (x: number, y: number) => {
    this._lastX = x
    this._lastY = y
    const { frontMost, clipSpaceDepth } = this.hitTestPixel2D(
      this._roots2D,
      this._roots3D,
      x,
      y,
      () => true
    )
    this.entity = frontMost instanceof Entity ? frontMost : undefined
    this.collider2D = frontMost instanceof ColliderMesh ? frontMost : undefined
    this.clipSpaceDepth = clipSpaceDepth
  }
  addRoot2D(obj: Object3D) {
    this._roots2D.push(obj)
  }
  addRoot3D(collection: ReadonlyTrackableCollection<Entity<Components>>) {
    collection.listenForAdd(e => {
      this._roots3D.add(e, e.get('collidable'))
    })
    collection.listenForRemove(e => {
      this._roots3D.remove(e)
    })
  }
  // If you pass an action, you might exit early.
  testHit(
    x: number,
    y: number,
    action: ReactionCallback
  ): InteractiveReturn | undefined
  testHit(x: number, y: number): InteractiveReturn
  testHit(x: number, y: number, action?: ReactionCallback) {
    // If UI is in front, there's no game object that can be hit.
    // -1 is at the near plane in clip space
    if (action && this.clipSpaceDepth === -1) {
      return __interactive
    }
    return this.hitTestPixel2D(this._roots2D, this._roots3D, x, y, action)
  }

  private checkOutOfTreeIndex: number = 0

  private hitTestPixel2D(
    roots2D: Object3D[],
    roots3D: EntityColliderCache<Entity<Components>>,
    x: number,
    y: number,
    action?: ReactionCallback
  ) {
    let frontMost: ColliderMesh | Entity<Components> | undefined
    /// -1 is near plane, 1 is far plane.
    let frontMostClipSpaceDepth = 1
    for (const root2D of roots2D) {
      traverseVisible(root2D, obj => {
        if (!(obj.userData.collider instanceof ColliderMesh)) {
          return
        }
        const collider = obj.userData.collider
        const finalDepth = collider.material.getFinalDepth()
        // A larger Z in clip space means it's further away from the camera. -1 is your nose, 1 is infinite depth.
        if (finalDepth > frontMostClipSpaceDepth) {
          return
        }
        for (const coords of this._inputProvider.raycastHitTestPoints) {
          const clipX =
            (x / renderMetrics.width) * 2 -
            1 +
            (coords[0] * HIT_TEST_CLIP_SPACE_RADIUS) / renderMetrics.aspect
          const clipY =
            (y / renderMetrics.height) * -2 +
            1 +
            coords[1] * HIT_TEST_CLIP_SPACE_RADIUS
          if (isClipCoordWithinObject(clipX, clipY, collider)) {
            frontMost = collider
            frontMostClipSpaceDepth = finalDepth
            break
          }
        }
      })
    }

    // Only check collisions in 3D scene if our mouse is over UI that isn't on the very top layer.
    if (action && frontMostClipSpaceDepth > -1) {
      // check a random collider for being out of scene
      if (roots3D.colliders.length > 0) {
        this.checkOutOfTreeIndex =
          (this.checkOutOfTreeIndex + 1) % roots3D.colliders.length
        const expectedScene = findContainingScene(
          roots3D.colliders[this.checkOutOfTreeIndex]
        )
        if (!expectedScene) {
          throw new Error('Collider is not in scene!')
        }
      }

      __interactive.worldPos.set(0, 0, 0)
      const cam = cameraShaker.camera
      hitTestAtPixel(
        x,
        y,
        roots3D.colliders,
        (hitObject, position) => {
          __clipSpacePos.w = 1.0
          __clipSpacePos.x = position.x
          __clipSpacePos.y = position.y
          __clipSpacePos.z = position.z
          __clipSpacePos
            .applyMatrix4(cameraShaker.camera.matrixWorldInverse)
            .applyMatrix4(cameraShaker.camera.projectionMatrix)
          __clipSpacePos.divideScalar(__clipSpacePos.w)
          // greater Z in clip space means further away from camera, because -1 is near plane and 1 is far plane
          if (__clipSpacePos.z > frontMostClipSpaceDepth) {
            return false
          }

          const entity = roots3D.resolveCollider(hitObject)
          if (action(entity, position)) {
            frontMost = entity
            frontMostClipSpaceDepth = __clipSpacePos.z
            __interactive.worldPos.copy(position)
            return true
          }
          return false
        },
        cam
      )
    }
    __interactive.frontMost = frontMost
    __interactive.clipSpaceDepth = frontMostClipSpaceDepth
    return __interactive
  }
}

type InteractiveReturn = {
  frontMost: ColliderMesh | Entity<Components> | undefined
  clipSpaceDepth: number
  worldPos: Vector3
}
const __interactive: InteractiveReturn = {
  frontMost: undefined,
  clipSpaceDepth: -1,
  worldPos: new Vector3()
}
const __clipSpacePos = new Vector4()
