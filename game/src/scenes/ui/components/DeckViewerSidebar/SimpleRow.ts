import { SIDEBAR_WIDTH } from '~/constants'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import Object2D from '~/meshes/Object2D'
import { CursorType } from '~/systems/input/CursorType'
import IInteractive from '~/systems/input/IInteractive'
import ColliderMesh from '~/utils/ColliderMesh'

import { ROW_HEIGHT } from '../SlideOutSidebar/constants'

let __rowCounter = 0
function __nextRowId() {
  return __rowCounter++
}

export default class SimpleRow<Item> extends Object2D implements IInteractive {
  name = 'sidebar-row'
  contents = new Object2D()
  cursor: CursorType = 'pointer'
  rowId = __nextRowId()
  constructor(public item: Item) {
    super()
    this.contents.name = 'sidebar-row-contents'
    this.add(this.contents)
    const collider = new ColliderMesh(this, -1)
    collider.matrix.setConstraints(
      ReadonlyPin.FullSize,
      ReadonlyPin.Center,
      ReadonlyPin.Center
    )
    collider.userData.button = this
    this.userData.collider = collider

    this.matrix.setConstraints(
      Pin.fromPixels(SIDEBAR_WIDTH, ROW_HEIGHT),
      ReadonlyPin.TopLeft,
      ReadonlyPin.TopLeft.clone()
    )
    this.contents.add(collider)
  }

  teardown() {
    // We remove the live prop listeners so we don't leak it
  }
}
