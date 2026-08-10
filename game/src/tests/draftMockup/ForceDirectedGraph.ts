import { Object3D } from 'three'

import {
  Body,
  BodyDef,
  BodyType,
  CircleShape,
  DistanceJointDef,
  FixtureDef,
  Vec2,
  World
} from '~/vendor/Box2D/Box2D'

export class ForceDirectedGraph {
  private _meshesByBodies = new Map<Body, Object3D>()
  private _bodiesByMeshes = new Map<Object3D, Body>()
  private _world: World
  constructor() {
    this._world = new World(new Vec2(0, 0))
  }
  register(obj: Object3D, radius = 0.01) {
    const bodyDef = new BodyDef()
    bodyDef.fixedRotation = true
    bodyDef.type = BodyType.dynamicBody
    bodyDef.linearDamping = 0.4
    const body = this._world.CreateBody(bodyDef)
    body.SetPosition(new Vec2(obj.position.x, obj.position.z))
    const fixtureDef = new FixtureDef()
    fixtureDef.shape = new CircleShape(radius)
    body.CreateFixture(fixtureDef)
    this._meshesByBodies.set(body, obj)
    this._bodiesByMeshes.set(obj, body)
  }
  addChain(fromObj: Object3D, toObj: Object3D, midObj: Object3D) {
    this.register(midObj, 0.01)
    const distanceJointDef = new DistanceJointDef()
    distanceJointDef.length = 0.01
    distanceJointDef.frequencyHz = 0.1
    // distanceJointDef.dampingRatio = 0.001
    distanceJointDef.collideConnected = false
    distanceJointDef.bodyA = this._bodiesByMeshes.get(fromObj)!
    distanceJointDef.bodyB = this._bodiesByMeshes.get(midObj)!
    this._world.CreateJoint(distanceJointDef)
    distanceJointDef.bodyA = this._bodiesByMeshes.get(midObj)!
    distanceJointDef.bodyB = this._bodiesByMeshes.get(toObj)!
    this._world.CreateJoint(distanceJointDef)
    distanceJointDef.length = 0.02
    distanceJointDef.frequencyHz = 0.2
    distanceJointDef.bodyA = this._bodiesByMeshes.get(fromObj)!
    distanceJointDef.bodyB = this._bodiesByMeshes.get(toObj)!
    this._world.CreateJoint(distanceJointDef)
  }
  update(dt: number) {
    this._world.Step(dt, 4, 4)
    let body = this._world.GetBodyList()
    while (body) {
      const mesh = this._meshesByBodies.get(body)
      if (mesh) {
        const pos = body.GetPosition()
        mesh.position.x = pos.x
        mesh.position.z = pos.y
      }
      body = body.GetNext()
    }
  }
}
