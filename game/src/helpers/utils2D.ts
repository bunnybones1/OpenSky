import queryParams from '~/queryParams'

import { DeferredQueue } from './DeferredQueue'
import { I2D } from './I2D'

export const itemsThatNeedlayoutHelpers = new DeferredQueue<I2D>()
export function maybeAddLayoutHelper(target: I2D) {
  if (queryParams.debugLayout) {
    itemsThatNeedlayoutHelpers.add(target)
  }
}
