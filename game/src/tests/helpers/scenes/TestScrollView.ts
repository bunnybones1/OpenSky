import { getAssetsManager } from '~/assets'
import { makeHSL } from '~/colors/utils'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import RectangleMaterial from '~/materials/RectangleMaterial'
import RectangleMesh from '~/meshes/RectangleMesh'
import { UI } from '~/scenes/ui'
import ScrollView from '~/scenes/ui/components/ScrollView'

import { BaseTestScene } from './BaseTestScene'

class TestItem extends RectangleMesh {
  constructor(i: number, axis: 'x' | 'y') {
    super(new RectangleMaterial({}))
    this.matrix.setColor(makeHSL(i * 0.05 + (i % 2) * 0.33, 0.7, 0.75))
    const sizePin = new Pin(1, 1)
    sizePin[axis].offset = 100
    sizePin[axis].scale = 0
    this.matrix.setConstraints(
      sizePin,
      ReadonlyPin.TopLeft,
      ReadonlyPin.TopLeft.clone()
    )
  }
}
class TestScrollView extends BaseTestScene {
  horView: ScrollView<TestItem> | undefined
  vertView: ScrollView<TestItem> | undefined
  async initUI(ui: UI) {
    await Promise.all([
      getAssetsManager().loadAsset('uiSmall'),
      getAssetsManager().loadAsset('gamePiecesPhysical'),
      getAssetsManager().loadAsset('gamePiecesGraphical')
    ])

    const container = ui.getContainer('randomTests')
    await container.ready
    container.show()
    this.vertView = new ScrollView({
      scrollAxis: 'y'
    })
    this.vertView.matrix.setConstraints(
      new Pin(0.25, 0.75, -10, -10),
      ReadonlyPin.TopRight.cloneOffset(5, -5),
      ReadonlyPin.TopRight
    )
    container.add(this.vertView)
    for (let i = 0; i < 50; i++) {
      this.vertView.push(new TestItem(i, 'y'))
    }

    this.horView = new ScrollView({
      scrollAxis: 'x'
    })
    this.horView.matrix.setConstraints(
      new Pin(0.75, 0.25, -10, -10),
      ReadonlyPin.BottomLeft.cloneOffset(-5, 5),
      ReadonlyPin.BottomLeft
    )
    container.add(this.horView)
    for (let i = 50; i < 100; i++) {
      this.horView.push(new TestItem(i, 'x'))
    }

    super.initUI(ui)
  }

  update(dt: number) {
    super.update(dt)
    this.horView?.update(dt)
    this.vertView?.update(dt)
  }
}
export const scene = TestScrollView
