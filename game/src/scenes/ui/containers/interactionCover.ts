import { ReadonlyPin } from '~/helpers/LayoutHelpers'
import RectangleMaterial from '~/materials/RectangleMaterial'
import RectangleMesh from '~/meshes/RectangleMesh'
import { makeInteractive } from '~/utils/makeInteractive'

import { UI } from '..'
import UIContainer from '../components/UIContainer'

export default class InteractionCoverContainer extends UIContainer {
  constructor(ui: UI, priority: number) {
    super(ui, 'interactionCover', {
      priority
    })
  }
  protected init() {
    const material = new RectangleMaterial({})
    material.visible = false
    const bg = new RectangleMesh(material)
    makeInteractive(bg, {
      cursor: 'default'
    })
    bg.matrix.setConstraints(
      ReadonlyPin.FullSize,
      ReadonlyPin.TopLeft,
      ReadonlyPin.TopLeft
    )
    this.add(bg)
  }
}
