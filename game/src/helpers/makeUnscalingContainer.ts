import { renderMetrics } from '@opensky/shared/renderMetrics'
import { listenToProperty } from '@opensky/shared/utils/propertyListeners'
import { Vector2 } from 'three'

import Object2D from '~/meshes/Object2D'

export function makeUnscalingContainer(
  axis: 'uiWidth' | 'uiHeight',
  referenceSize: number
) {
  const prescale = new Vector2(1, 1)

  listenToProperty(renderMetrics, axis, v => {
    const s = v / referenceSize
    prescale.set(s, s)
  })

  const unscalingContainer = new Object2D()
  unscalingContainer.matrix.prescale = prescale

  return unscalingContainer
}
