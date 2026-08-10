import { clamp } from '@opensky/shared/utils/math'
import { System } from 'gg'
import { Color } from 'three'

import { Components } from '~/components'
import { visualInteractiveIndicators } from '~/helpers/compoundCollections'
import queryParams from '~/queryParams'

const __hsl = { h: 0, s: 0, l: 0 }
const __tempColor = new Color()

function __getHSL(color: Color) {
  __tempColor.r = clamp(color.r, 0, 1)
  __tempColor.g = clamp(color.g, 0, 1)
  __tempColor.b = clamp(color.b, 0, 1)
  __tempColor.getHSL(__hsl)
  return __hsl
}

export default class InteractiveIndicatorsSystem extends System<Components> {
  init() {
    visualInteractiveIndicators.listenForAdd(entity => {
      entity.get('interactiveIndicators').dirty = true
    })
  }
  update() {
    for (const entity of visualInteractiveIndicators.items) {
      const ii = entity.get('interactiveIndicators')
      if (ii.update()) {
        const hm = entity.get('highlightMaterial')
        for (const mat of hm.materials) {
          if (queryParams.disableHighlights) {
            mat.visible = false
          } else if (ii.useOpacity) {
            const hsl = __getHSL(ii.color)
            const o = clamp(hsl.l * 2, 0, 1)
            mat.visible = o > 0
            if (mat.visible) {
              mat.color.copy(ii.color)
              // mat.color.setHSL(hsl.h, hsl.s * 0.85, Math.max(0.5, hsl.l))
              mat.opacity = o
              mat.thicknessRatio = o
            }
          } else {
            mat.color.copy(ii.color)
          }
        }
      }
    }
  }
}
