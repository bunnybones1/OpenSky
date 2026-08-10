import { Vector2 } from 'three'

import { getAssetsManager } from './assets/index'
import { putChildAtBottom } from './helpers/I2D'
import { itemsThatNeedlayoutHelpers } from './helpers/utils2D'
import materialLibrary from './materials/library'

let initd = false

export function initVisualHooks() {
  if (initd) {
    return
  }
  initd = true
  itemsThatNeedlayoutHelpers.setAction(target => {
    getAssetsManager()
      .loadAsset('uiSmall')
      .then(() => {
        const box = getAssetsManager().fetchMeshDeepClone(
          'uiSmall',
          'collider-box',
          false,
          true
        )
        box.material = materialLibrary.getLayoutTester(getAssetsManager())
        target.add(box)
        putChildAtBottom(box)
        box.matrix.opacity = 0.5
        box.matrix.prescale = new Vector2(0.25, 0.25)
      })
  })
}
