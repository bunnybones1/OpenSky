import { Vector2 } from 'three'

import { getAssetsManager } from '~/assets/index'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import Object2D from '~/meshes/Object2D'

export const CONTAINER_WIDTH = 720
const CONTAINER_HEIGHT = 108

export default class RewardsPanel extends Object2D {
  constructor(height: number = CONTAINER_HEIGHT) {
    super()

    this.matrix.setConstraints(
      Pin.fromPixels(CONTAINER_WIDTH, height),
      ReadonlyPin.Top,
      ReadonlyPin.Top.cloneOffset(0, 170)
    )

    const panelDecor = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'panel-w-faded-sides'
    )
    panelDecor.matrix.prescale = new Vector2(10, 1)
    panelDecor.material.paletteRow = 8

    this.add(panelDecor)
  }
}
