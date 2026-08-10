import { renderMetrics } from '@opensky/shared/renderMetrics'
import {
  Camera,
  Intersection,
  Object3D,
  Plane,
  Ray,
  Raycaster,
  Vector2,
  Vector3
} from 'three'

import { HIT_TEST_CLIP_SPACE_RADIUS, MOUSE_HIT_TEST_POINTS } from '~/constants'

const ray: Ray = new Ray()
const origin = new Vector3(0, 0, 0)
const flatPlane: Plane = new Plane(new Vector3(0, -1, 0), 1)
const anyPlane: Plane = new Plane(new Vector3(0, -1, 0), 1)
const intersection: Vector3 = new Vector3()

function get2DPositionOnPlane(
  camera: Camera,
  cameraWorldPos: Vector3,
  x: number,
  y: number,
  plane: Plane
) {
  ray.origin.copy(cameraWorldPos)
  ray.direction.set(x, y, 0.5).unproject(camera).sub(cameraWorldPos).normalize()

  ray.intersectPlane(plane, intersection)
  return intersection
}
export function get2DPositionAtDepth(
  camera: Camera,
  cameraWorldPos: Vector3,
  x: number,
  y: number,
  atDepth: number = 0
) {
  flatPlane.constant = atDepth
  return get2DPositionOnPlane(camera, cameraWorldPos, x, y, flatPlane)
}
function get2DPositionOnPlaneHelper(
  camera: Camera,
  cameraWorldPos: Vector3,
  x: number,
  y: number,
  coPlanarPoint: Vector3,
  normal: Vector3
) {
  anyPlane.setFromNormalAndCoplanarPoint(normal, coPlanarPoint)
  return get2DPositionOnPlane(camera, cameraWorldPos, x, y, anyPlane)
}

export function toClipX(screenX: number) {
  return (screenX / renderMetrics.width) * 2 - 1
}

export function toClipY(screenY: number) {
  return -(screenY / renderMetrics.height) * 2 + 1
}

export function toScreenX(clipX: number) {
  return ((clipX + 1) * renderMetrics.width) / 2
}

export function toScreenY(clipY: number) {
  return ((-clipY + 1) * renderMetrics.height) / 2
}

const _position3D = new Vector3()
function worldToNDC(camera: Camera, position3D: Vector3) {
  //return position3D.clone().project(camera)
  return _position3D.copy(position3D).project(camera)
}

function NDCToScreen(v: Vector3) {
  return new Vector2(toScreenX(v.x), toScreenY(v.y))
}

function NDCToUV(v: Vector3) {
  return new Vector2(v.x + 1, -v.y + 1).multiplyScalar(0.5)
}

export function getScreenSpace(camera: Camera, position3D: Vector3) {
  return NDCToScreen(worldToNDC(camera, position3D))
}

export function getUVSpace(camera: Camera, position3D: Vector3) {
  return NDCToUV(worldToNDC(camera, position3D))
}

export function getPixelOnGroundPlane(
  camera: Camera,
  cameraWorldPos: Vector3,
  x: number,
  y: number,
  depth: number = 0
) {
  return get2DPositionAtDepth(
    camera,
    cameraWorldPos,
    toClipX(x),
    toClipY(y),
    depth
  )
}

export function clipToWorld(
  camera: Camera,
  clipX: number,
  clipY: number,
  planePos = origin
) {
  return get2DPositionOnPlaneHelper(
    camera,
    camera.position,
    clipX,
    clipY,
    planePos,
    camera.position.clone().normalize()
  )
}

const __v2 = new Vector2()
const __intersections: Intersection[] = []
const __raycaster = new Raycaster()
let __hitTesting = false
export function hitTestAtPixel(
  x: number,
  y: number,
  items: Object3D[],
  reaction: (item: Object3D, position: Vector3) => boolean,
  camera: Camera
) {
  if (__hitTesting) {
    throw new Error('recursive hit testing not allowed')
  }
  __hitTesting = true

  doneTesting: {
    for (const coords of MOUSE_HIT_TEST_POINTS) {
      //work in clipspace coordinates (-1 to 1)
      __v2.set(
        toClipX(x) +
          (coords[0] * HIT_TEST_CLIP_SPACE_RADIUS) / renderMetrics.aspect,
        toClipY(y) + coords[1] * HIT_TEST_CLIP_SPACE_RADIUS
      )

      __raycaster.setFromCamera(__v2, camera)
      __raycaster.intersectObjects(items, false, __intersections)

      for (const intersection of __intersections) {
        if (reaction(intersection.object, intersection.point)) {
          break doneTesting
        }
      }
      __intersections.length = 0
    }
  }

  __intersections.length = 0
  __hitTesting = false
}
