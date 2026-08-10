import { System } from 'gg'
import { Vector3 } from 'three'

import { Components } from '~/components'
import { RENDER_ORDERS } from '~/constants'
import { highlightablePublicCards } from '~/helpers/compoundCollections'
import { cameraShaker } from '~/utils/cameraShaker'
import { overlays } from '~/utils/ui'

export default class HighlightMaterialSystem extends System<Components> {
  init() {
    //
  }
  update() {
    outer: for (const c of highlightablePublicCards.items) {
      const mesh = c.get('highlightMaterial').mesh
      _vec3.set(0, 0, 0)
      _vec3.applyMatrix4(mesh.matrixWorld)
      _vec3.project(cameraShaker.camera)

      let previousOverlayDepth = undefined
      let previousOverlayRenderOrder = 0
      let currOverlayDepth = 0
      let currOverlayRenderOrder = 0
      const targetDepth = _vec3.z
      for (const o of overlays.items) {
        currOverlayDepth = o.material.getFinalDepth()
        currOverlayRenderOrder = o.renderOrder
        if (targetDepth <= currOverlayDepth) {
          previousOverlayDepth = currOverlayDepth
          previousOverlayRenderOrder = currOverlayRenderOrder
        } else {
          if (previousOverlayDepth === undefined) {
            mesh.renderOrder = RENDER_ORDERS.highlight
          } else {
            mesh.renderOrder =
              (previousOverlayRenderOrder + currOverlayRenderOrder) / 2
          }
          continue outer
        }
      }
      mesh.renderOrder = currOverlayRenderOrder + 10
    }
  }
}

const _vec3 = new Vector3()
