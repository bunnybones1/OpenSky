import { unlerpClamped } from '@opensky/shared/utils/math'
import { isHero } from '@skyweaver/state-metadata'
import { Entity, System } from 'gg'
import { Object3D, Scene } from 'three'

import { Components } from '~/components'
import ShadowComponent from '~/components/ShadowComponent'
import { zoneCollections } from '~/helpers/zoneCollections'

type E = Entity<Components>
const t = 0.005
const s = 0.9

export default class ShadowSystem extends System<Components> {
  shadowMeshMap: Map<E, Object3D> = new Map()

  constructor(private scene: Scene) {
    super()
  }

  init() {
    zoneCollections.Field.listenForAdd(e => {
      if (isHero(e.get('cardInstance'))) {
        e.add(new ShadowComponent(0.6 * s, 0.04 + t, 0.0475 + t * 2, 0.03))
      } else {
        e.add(new ShadowComponent(0.52 * s, 0.0325 + t, 0.04 + t * 2, 0.018))
      }
    })

    zoneCollections.Field.listenForRemove(e => {
      e.remove('shadow')
    })

    ShadowComponent.entities.listenForAdd(e => {
      const shadow = e.get('shadow')
      this.scene.add(shadow.mesh)
      this.shadowMeshMap.set(e, shadow.mesh)
    })

    ShadowComponent.entities.listenForRemove(e => {
      const shadow = this.shadowMeshMap.get(e)!
      this.scene.remove(shadow)
      this.shadowMeshMap.delete(e)
    })
  }

  update() {
    for (const e of ShadowComponent.entities.items) {
      if (e.has('transform') && e.has('shadow')) {
        const transform = e.get('transform')
        const shadow = e.get('shadow')
        const mesh = shadow.mesh
        const height = transform.matrixWorld.elements[13]
        const strength =
          1 - unlerpClamped(shadow.minHeight, shadow.maxHeight, height)

        mesh.material.strength = strength

        mesh.scale.setScalar(shadow.size * (strength * 0.4 + 1.8))

        mesh.position.x = transform.position.x
        mesh.position.z = transform.position.z + shadow.zOffset
      }
    }
  }
}
