import device from '@opensky/shared/device'
import { renderMetrics } from '@opensky/shared/renderMetrics'
import { RESET_USER_SETTINGS_TO_DEFAULTS } from '@opensky/shared/userSettings'
import {
  cleanRemoveFromArrayMap,
  pushToArrayMap
} from '@opensky/shared/utils/arrayUtils'
import { distributions } from '@opensky/shared/utils/distributions'
import { clamp } from '@opensky/shared/utils/math'
import NiceFloatParameter from '@opensky/shared/utils/NiceFloatParameter'
import { Component } from 'gg'
import { Box2, Box3, Camera, Mesh, Object3D, Vector2, Vector3 } from 'three'

import { Box2DPreviewMesh } from '~/meshes/Box2DPreviewMesh'
import queryParams from '~/queryParams'
import input from '~/systems/input/input'
import TextMesh from '~/systems/text/TextMesh'
import { cameraShaker } from '~/utils/cameraShaker'
import { getHandDirection } from '~/utils/handedness'
import Box3Helper from '~/utils/helpers/Box3Helper'
import { taskTimer } from '~/utils/taskTimer'
import { getHierarchicalMatrix } from '~/utils/threeUtils'
import { vector3CloseEnough } from '~/utils/transformUtils'
import {
  Body,
  BodyDef,
  BodyType,
  CircleShape,
  Contact,
  ContactListener,
  degToRad,
  DistanceJointDef,
  Fixture,
  FixtureDef,
  MouseJoint,
  MouseJointDef,
  PolygonShape,
  Vec2,
  World
} from '~/vendor/Box2D/Box2D'

const camera = cameraShaker.camera

const __initialScale = 0.5

const __protectWithRectangle = false
const __protectWithCircle = true
const __minSingleCircleRatio = 1.3
const __idealFrameDuration = 1 / 60
const __fingerTipRadius = 0.3
const __safePadding = 0.005
const __stabilityForgiveness = 0.0015

const __fingerSegments = 4

const __fingerSegmentSpacing = __fingerTipRadius * 1.3
const __fingerAngle = degToRad * -55

const __bb2 = new Box2()
const __vec2 = new Vector2()
const __size = new Vector2()
const __center = new Vector2()
const __vec3 = new Vector3()

const __delta = new Vector3()

const frequencyHz = new NiceFloatParameter(
  'spring-frequencyHz',
  'Spring Frequency Hz',
  0.1,
  0.01,
  10,
  distributions.quadratic,
  v => v.toString(),
  'physics',
  RESET_USER_SETTINGS_TO_DEFAULTS
)

const dampingRatio = new NiceFloatParameter(
  'spring-dampingRatio',
  'Spring Damping Ratio',
  0.5,
  0.01,
  10,
  distributions.quadratic,
  v => v.toString(),
  'physics',
  RESET_USER_SETTINGS_TO_DEFAULTS
)

const linearDamping = new NiceFloatParameter(
  'spring-linearDamping',
  'Spring Linear Damping',
  8,
  0.01,
  200,
  distributions.quadratic,
  v => v.toString(),
  'physics',
  RESET_USER_SETTINGS_TO_DEFAULTS
)

class B2Manager {
  private active: World[]
  private inactive: World[]
  constructor() {
    this.active = []
    this.inactive = []
  }
  allocate() {
    if (this.inactive.length === 0) {
      this.inactive.push(new World(new Vec2()))
    }
    const world = this.inactive.pop()!
    this.active.push(world)
    return world
  }
  release(world: World) {
    let body = world.m_bodyList
    while (body) {
      const next = body.m_next
      world.DestroyBody(body)
      body = next
    }
    let joint = world.m_jointList
    while (joint) {
      const next = joint.m_next
      world.DestroyJoint(joint)
      joint = next
    }
    let particleSystem = world.m_particleSystemList
    while (particleSystem) {
      const next = particleSystem.m_next
      world.DestroyParticleSystem(particleSystem)
      particleSystem = next
    }
    let controller = world.m_controllerList
    while (controller) {
      const next = controller.m_next
      world.RemoveController(controller)
      controller = next
    }

    this.inactive.push(world)
  }
}

const b2Manager = new B2Manager()

function __convertV3ToV2(
  vec3: Vector3,
  node: Object3D,
  camera: Camera,
  aspectRatio: number = 1
) {
  node.localToWorld(vec3)
  vec3.project(camera)
  __vec2.x = vec3.x * aspectRatio
  __vec2.y = vec3.y
  return __vec2
}

function __convertBb3ToBb2(
  bb: Box3,
  node: Object3D,
  camera: Camera,
  aspectRatio: number = 1
) {
  const min = bb.min
  const max = bb.max
  __bb2.min.set(Infinity, Infinity)
  __bb2.max.set(-Infinity, -Infinity)
  __vec2.set(0, 0)

  __vec3.set(0, 0, 0)

  const expand3DPointIn2D = (x: number, y: number, z: number) => {
    if (isNaN(x) || isNaN(y) || isNaN(z)) {
      return
    }
    __vec3.set(x, y, z)
    __bb2.expandByPoint(__convertV3ToV2(__vec3, node, camera, aspectRatio))
  }
  expand3DPointIn2D(max.x, max.y, max.z)
  expand3DPointIn2D(min.x, max.y, max.z)
  expand3DPointIn2D(max.x, min.y, max.z)
  expand3DPointIn2D(min.x, min.y, max.z)
  expand3DPointIn2D(max.x, max.y, min.z)
  expand3DPointIn2D(min.x, max.y, min.z)
  expand3DPointIn2D(max.x, min.y, min.z)
  expand3DPointIn2D(min.x, min.y, min.z)
  return __bb2
}

class ContactPair {
  finger: Fixture
  important: Fixture
  set(finger: Fixture, important: Fixture) {
    this.finger = finger
    this.important = important
    return this
  }
}

const __sharedContactPair = new ContactPair()

function getContactBetweenFingerAndSomethingImportant(contact: Contact) {
  const fixtureA = contact.GetFixtureA()
  const fixtureB = contact.GetFixtureB()

  // make sure only one of the fixtures was a sensor
  if (fixtureA.m_isSensor === fixtureB.m_isSensor) {
    return
  }

  if (fixtureA.m_isSensor && fixtureB.m_body.m_userData === 'important') {
    return __sharedContactPair.set(fixtureA, fixtureB)
  } else if (
    fixtureB.m_isSensor &&
    fixtureA.m_body.m_userData === 'important'
  ) {
    return __sharedContactPair.set(fixtureB, fixtureA)
  } else {
    return
  }
}
//main collision call back function
class FingerContactListener extends ContactListener {
  world: World
  contactPairs: Map<Fixture, Fixture[]>
  constructor(world: World) {
    super()
    this.contactPairs = new Map<Fixture, Fixture[]>()
    this.world = world
  }
  BeginContact(contact: Contact) {
    const contactPair = getContactBetweenFingerAndSomethingImportant(contact)
    if (contactPair) {
      pushToArrayMap(
        this.contactPairs,
        contactPair.finger,
        contactPair.important
      )
    }
  }

  EndContact(contact: Contact) {
    const contactPair = getContactBetweenFingerAndSomethingImportant(contact)
    if (contactPair) {
      if (contactPair) {
        cleanRemoveFromArrayMap(
          this.contactPairs,
          contactPair.finger,
          contactPair.important
        )
      }
    }
  }
}

class ScreenSpaceData {
  bb: Box3
  protectedBbs: Box3[]
  desiredScale: Vector3
  myB2World: World
  b2Preview: Box2DPreviewMesh | undefined
  fingerSpringJoint: MouseJoint
  protectedBody: Body
  fingerContactListener: FingerContactListener
  private lastPosition: Vector3
  private stepsLeft: number
  private extraHelpers: Object3D[] = []
  constructor(
    protectedBbs: Box3[],
    private node: Object3D,
    private lerpRate: number
  ) {
    this.protectedBbs = protectedBbs
    this.stepsLeft = 30

    const myB2World = b2Manager.allocate()
    const bodyDef = new BodyDef()
    const fixtureDef = new FixtureDef()

    bodyDef.fixedRotation = true
    bodyDef.type = BodyType.staticBody
    const BorderBody = myB2World.CreateBody(bodyDef)
    fixtureDef.friction = 0
    const borderMarginWidth = 1
    const templateRect = new PolygonShape().SetAsBox(
      1 * renderMetrics.aspect + borderMarginWidth,
      1 + borderMarginWidth
    )
    const verts = templateRect.m_vertices
    for (let i = 0; i < verts.length; i++) {
      const vert = verts[i]
        .Clone()
        .SelfAdd(verts[(i + 1) % verts.length])
        .SelfMul(0.5)
      const delta = verts[(i + 1) % verts.length]
        .Clone()
        .SelfSub(verts[i])
        .SelfMul(0.5)
        .SelfAbs()
      fixtureDef.shape = new PolygonShape().SetAsBox(
        delta.x + borderMarginWidth,
        delta.y + borderMarginWidth,
        vert
      )
      BorderBody.CreateFixture(fixtureDef)
    }

    __vec3.set(0, 0, 0)
    __convertV3ToV2(__vec3, node, camera, renderMetrics.aspect)
    const offset = __vec2.clone()
    bodyDef.type = BodyType.dynamicBody
    bodyDef.linearDamping = linearDamping.value
    bodyDef.position.Copy(offset)
    const protectedBody = myB2World.CreateBody(bodyDef)
    protectedBody.m_userData = 'important'
    protectedBbs.forEach(bb3 => {
      const bb2 = __convertBb3ToBb2(bb3, node, camera, renderMetrics.aspect)
      bb2.getSize(__size)
      bb2.getCenter(__center).sub(offset)
      if (__protectWithRectangle) {
        fixtureDef.shape = new PolygonShape().SetAsBox(
          __size.x * 0.5,
          __size.y * 0.5,
          __center
        )
        protectedBody.CreateFixture(fixtureDef)
      }
      if (__protectWithCircle) {
        const ratio =
          __size.x > __size.y ? __size.x / __size.y : __size.y / __size.x
        const circleCount =
          ratio < __minSingleCircleRatio
            ? 1
            : Math.round(clamp(ratio, 1, 4) * 1.3 + 0.4)
        const deviationHalf = __size
          .clone()
          .subScalar(Math.min(__size.x, __size.y))
          .multiplyScalar(0.5)
        const start = __center.clone().sub(deviationHalf)
        const end = __center.clone().add(deviationHalf)
        const radius =
          Math.min(__size.x, __size.y) *
          0.5 *
          (ratio < __minSingleCircleRatio ? __minSingleCircleRatio : 1)
        for (let i = 0; i < circleCount; i++) {
          const ratio = circleCount === 1 ? 0.5 : i / (circleCount - 1)
          const circle = new CircleShape(radius)
          circle.m_p.Copy(start.clone().lerp(end, ratio))
          fixtureDef.shape = circle
          protectedBody.CreateFixture(fixtureDef)
        }
      }
    })

    if (device.useTouch) {
      bodyDef.fixedRotation = true
      bodyDef.type = BodyType.dynamicBody
      bodyDef.linearDamping = 400
      const fingerBody = myB2World.CreateBody(bodyDef)
      const normalizedInput = input.positionClipspace.clone()
      if (Math.abs(normalizedInput.x) > Math.abs(normalizedInput.y)) {
        normalizedInput.x *= Math.abs(1.25 / normalizedInput.x)
      } else {
        normalizedInput.y *= Math.abs(1.25 / normalizedInput.y)
      }
      normalizedInput.x *= renderMetrics.aspect
      fingerBody.SetPosition(normalizedInput)
      fixtureDef.isSensor = true
      const direction = getHandDirection(input.positionClipspace.x)
      for (let i = 0; i < __fingerSegments; i++) {
        const distance = (i * __fingerSegmentSpacing) / device.screenShorterCms
        const circle = new CircleShape(
          __fingerTipRadius / device.screenShorterCms
        )
        circle.m_p.Set(
          Math.cos(__fingerAngle) * distance * direction,
          Math.sin(__fingerAngle) * distance
        )
        fixtureDef.shape = circle
        fingerBody.CreateFixture(fixtureDef)
      }
      fixtureDef.isSensor = false
      taskTimer.add(() => {
        normalizedInput.copy(input.positionClipspace)
        normalizedInput.x *= renderMetrics.aspect
        fingerBody.SetPosition(normalizedInput)
      }, 0.5)
      const fingerSpringJointDef = new MouseJointDef()
      fingerSpringJointDef.bodyA = BorderBody
      fingerSpringJointDef.bodyB = fingerBody
      fingerSpringJointDef.target.Set(0, 0)
      fingerSpringJointDef.collideConnected = false
      fingerSpringJointDef.maxForce = 500.0 * fingerBody.GetMass()
      const fingerSpringJoint = myB2World.CreateJoint(fingerSpringJointDef)
      fingerSpringJoint.m_localAnchorB.Set(0, 0)
      this.fingerSpringJoint = fingerSpringJoint
    }

    //keep hovercard near the origin point
    const distJointDef = new DistanceJointDef()
    distJointDef.length = 0
    distJointDef.frequencyHz = frequencyHz.value
    distJointDef.dampingRatio = dampingRatio.value
    distJointDef.bodyA = BorderBody
    distJointDef.bodyB = protectedBody
    distJointDef.localAnchorA.Copy(protectedBody.GetPosition())
    distJointDef.localAnchorB.Set(0, 0)
    distJointDef.collideConnected = true
    myB2World.CreateJoint(distJointDef)

    this.desiredScale = node.scale.clone()
    node.scale.multiplyScalar(__initialScale)
    this.myB2World = myB2World
    this.protectedBody = protectedBody
    this.lastPosition = node.position.clone()
    const fingerContactListener = new FingerContactListener(myB2World)
    this.fingerContactListener = fingerContactListener
    myB2World.SetContactListener(fingerContactListener)

    if (queryParams.debugScreenspace) {
      this.b2Preview = new Box2DPreviewMesh(myB2World)
    }
  }
  update(transform: Object3D, dt: number) {
    if (!transform.parent) {
      return
    }
    if (this.fingerSpringJoint) {
      if (input.isMovedSinceLastFrame) {
        this.fingerSpringJoint.GetBodyB().SetAwake(true)
      }
      this.fingerSpringJoint.m_targetA.x =
        input.positionClipspace.x * renderMetrics.aspect
      this.fingerSpringJoint.m_targetA.y = input.positionClipspace.y
    }
    while (this.stepsLeft > 0) {
      this.stepsLeft--
      this.myB2World.Step(dt * 4, 4, 4)
      this.fingerContactListener.contactPairs.forEach((importants, finger) => {
        const fingerBody = finger.m_body
        const fingerWorldPos = new Vec2()
        const fingerCircle = finger.m_shape as CircleShape
        fingerBody.GetWorldPoint(fingerCircle.m_p, fingerWorldPos)
        for (const important of importants) {
          const importantBody = important.m_body
          const importantCircle = important.m_shape as CircleShape
          const importantWorldPos = new Vec2()
          importantBody.GetWorldPoint(importantCircle.m_p, importantWorldPos)
          const delta = new Vec2()
            .Copy(importantWorldPos)
            .SelfSub(fingerWorldPos)
          delta
            .SelfMul(
              fingerCircle.m_radius + importantCircle.m_radius - delta.Length()
            )
            .SelfMul(10)
          importantBody.ApplyLinearImpulseToCenter(delta, true)
        }
      })
    }

    const pos = this.protectedBody.GetPosition()
    __vec3.set(0, 0, 0)
    transform.localToWorld(__vec3)
    __vec3.project(camera)
    const clipDepth = __vec3.z
    __vec3.set(pos.x / renderMetrics.aspect, pos.y, clipDepth).unproject(camera)
    transform.parent!.worldToLocal(__vec3)
    __delta.copy(__vec3).sub(this.lastPosition)
    const distanceMoved = __delta.length()
    __delta.multiplyScalar(
      Math.max(0, (distanceMoved - __stabilityForgiveness) / distanceMoved)
    )
    this.lastPosition.add(__delta)
    const lerpAmt = 1 - Math.pow(1 - this.lerpRate, dt / __idealFrameDuration)
    if (!vector3CloseEnough(transform.position, this.lastPosition)) {
      transform.position.lerp(this.lastPosition, lerpAmt)
    }
    if (!vector3CloseEnough(transform.scale, this.desiredScale)) {
      transform.scale.lerp(this.desiredScale, lerpAmt)
    }
    transform.updateMatrix()
    transform.updateMatrixWorld(true)
  }
  addHelper(helper: Object3D) {
    this.node.add(helper)
    this.extraHelpers.push(helper)
  }
  dispose() {
    b2Manager.release(this.myB2World)
    for (const helper of this.extraHelpers) {
      this.node.remove(helper)
    }
  }
}

export default class ScreenSpaceComponent extends Component<ScreenSpaceData> {
  obj3D: Object3D
  offset: Vector3

  constructor(obj3D: Object3D, offset: Vector3, lerpRate: number) {
    for (const child of obj3D.children) {
      child.position.add(offset)
      child.updateMatrix()
      child.updateMatrixWorld()
    }
    const protectedMeshes: Mesh[] = []
    const protectedBoxes: Box3Helper[] = []
    obj3D.traverse(obj => {
      obj.updateMatrix()
      obj.updateMatrixWorld(true)
      if (
        obj instanceof TextMesh &&
        !obj.options.fontFace.name.includes('hadow')
      ) {
        protectedMeshes.push(obj)
      } else if (obj instanceof Box3Helper && obj.userData.protector) {
        protectedBoxes.push(obj)
      }
    })
    const protectedBbs = protectedMeshes.map(mesh => {
      if (!mesh.geometry.boundingBox) {
        mesh.geometry.computeBoundingBox()
      }
      const bb = mesh.geometry.boundingBox!.clone()
      bb.applyMatrix4(getHierarchicalMatrix(obj3D, mesh))
      bb.expandByScalar(__safePadding)

      return bb
    })
    protectedBoxes.forEach(pb => {
      const bb = new Box3(
        new Vector3(-0.5, -0.5, -0.5),
        new Vector3(0.5, 0.5, 0.5)
      )
      bb.applyMatrix4(getHierarchicalMatrix(obj3D, pb))
      protectedBbs.push(bb)
    })
    if (protectedBbs.length > 0) {
      const ssd = new ScreenSpaceData(protectedBbs, obj3D, lerpRate)
      if (queryParams.debugScreenspace && ssd.b2Preview) {
        ssd.addHelper(ssd.b2Preview)
      }
      super(ssd)
      this.obj3D = obj3D
      this.offset = offset
    } else {
      throw new Error('This object could not generate a bounding box!')
    }
  }
  update(dt: number) {
    this.value.update(this.obj3D, dt)
  }
  onDetach() {
    this.value.dispose()
    for (const child of this.obj3D.children) {
      child.position.sub(this.offset)
      child.updateMatrix()
    }
  }
}
