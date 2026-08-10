import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import Object2D from '~/meshes/Object2D'

export default class PaddingRow extends Object2D {
  constructor(size: number) {
    super()
    this.matrix.setConstraints(
      Pin.fromPixels(0, size),
      ReadonlyPin.TopLeft,
      ReadonlyPin.TopLeft.clone()
    )
  }
}
