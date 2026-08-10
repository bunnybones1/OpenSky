import { Entity, EntityManager, System } from 'gg'
import { Mesh } from 'three'

import { SleepingArchetype } from '~/archetypes'
import { getAssetsManager } from '~/assets/index'
import { Components } from '~/components'
import { RENDER_ORDERS } from '~/constants'
import { getSharedPlaneBufferGeometry } from '~/utils/geometry'

import { simpleTweener } from '../animation/tweeners'
import { TextureAnimation } from '../TextureAnimationSystem'

function __makeVisuals() {
  const anim = new TextureAnimation({
    assetsManager: getAssetsManager(),
    map: 'sleepingAnimation',
    columns: 4,
    rows: 8,
    fps: 30,
    opacity: 0
  })
  const material = anim.material
  const mesh = new Mesh(getSharedPlaneBufferGeometry(), material)
  mesh.frustumCulled = false
  mesh.scale.multiplyScalar(0.02)
  mesh.rotation.set(-Math.PI / 2.0, 0, 0)
  mesh.position.set(0.015, 0.001, -0.035)
  mesh.name = 'sleep'
  mesh.renderOrder = RENDER_ORDERS.traits
  return {
    mesh,
    anim
  }
}

interface Visuals {
  mesh: Mesh
  anim: TextureAnimation
}

export default class SleepingSystem extends System<Components> {
  private registry = new Map<Entity<Components>, Visuals>()
  init(manager: EntityManager<Components>) {
    manager.getArchetype(SleepingArchetype).onChange(ev => {
      let visuals: Visuals
      switch (ev.type) {
        case 'add':
          visuals = __makeVisuals()
          this.registry.set(ev.entity, visuals)
          ev.entity.get('transform').add(visuals.mesh)
          visuals.anim.opacity = 0
          simpleTweener.to({
            description: 'start sleep',
            target: visuals.anim,
            propertyGoals: { opacity: 1 },
            duration: 400
          })
          break
        case 'remove':
          visuals = this.registry.get(ev.entity)!
          simpleTweener.to({
            description: 'end sleep',
            target: visuals.anim,
            propertyGoals: { opacity: 0 },
            duration: 400,
            onComplete: () => {
              const parent = visuals.mesh.parent
              if (parent) {
                parent.remove(visuals.mesh)
              }
            }
          })
          break
      }
    })
  }
  update() {
    //nothing
  }
}
