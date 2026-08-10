import { Color } from 'three'

import { ReadonlyPin } from '~/helpers/LayoutHelpers'
import RectangleMaterial from '~/materials/RectangleMaterial'
import RectangleMesh from '~/meshes/RectangleMesh'
import { simpleTweener } from '~/systems/animation/tweeners'

import { UI } from '..'
import UIContainer from '../components/UIContainer'

export default class DarkenCoverContainer extends UIContainer {
  private bg: RectangleMesh
  constructor(ui: UI, priority: number) {
    super(ui, 'darkenCover', {
      priority
    })
  }
  async semiFade(duration: number = 2000) {
    await simpleTweener.to({
      description: 'semifade darken cover',
      target: this.bg.matrix,
      propertyGoals: { opacity: 0.4 },
      duration
    }).finished
  }
  protected init() {
    const bg = new RectangleMesh(new RectangleMaterial({}))
    bg.matrix.setColor(new Color(0), 1)
    bg.matrix.setConstraints(
      ReadonlyPin.FullSize,
      ReadonlyPin.TopLeft,
      ReadonlyPin.TopLeft
    )
    this.add(bg)
    this.bg = bg
  }
}
