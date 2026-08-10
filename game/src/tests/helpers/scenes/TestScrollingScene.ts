import { listenToProperty } from '@opensky/shared/utils/propertyListeners'

import { getAssetsManager } from '~/assets'
import DragValue from '~/helpers/DragValue'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import ScrollValue from '~/helpers/ScrollValue'
import Object2D from '~/meshes/Object2D'
import { UI } from '~/scenes/ui'
import inputProvider from '~/systems/input/input'
import UpdateManager from '~/systems/UpdateManager'

import { BaseTestScene } from './BaseTestScene'

class SimpleTestScrollView {
  inner: Object2D
  outer: Object2D
  constructor(axis: 'x' | 'y', innerLength: number) {
    const outer = new Object2D()
    const bg = getAssetsManager().fetchMeshDeepClone('uiSmall', 'slider-frame')
    bg.material.paletteRow = 6
    bg.matrix.size = new Pin(1, 1, 6, 6)
    outer.add(bg)

    const inner = new Object2D()
    const innerSize = new Pin(1, 1, 0, 0)
    innerSize[axis].scale = 0
    innerSize[axis].offset = innerLength

    const content = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'collider-box',
      true
    )
    content.material.visible = true
    content.material.paletteRow = 4
    inner.add(content)

    inner.matrix.setConstraints(
      innerSize,
      ReadonlyPin.TopLeft,
      ReadonlyPin.TopLeft.cloneOffset(0, 0)
    )
    outer.add(inner)
    this.inner = inner
    this.outer = outer
  }
}

class ComplexTestScrollView extends SimpleTestScrollView {
  constructor(innerWidth: number, innerHeight: number) {
    super('x', innerWidth)
    this.inner.matrix.size = new Pin(0, 0, innerWidth, innerHeight)
  }
}

const WHEEL_LINE_PIXELS = 16
class TestScrollingScene extends BaseTestScene {
  private _isDragging: boolean
  scrollX: ScrollValue
  scrollY: ScrollValue
  dragX: DragValue
  dragY: DragValue
  scrollViewY: SimpleTestScrollView
  scrollViewX: SimpleTestScrollView
  scrollViewXY: ComplexTestScrollView
  scrollXYX: ScrollValue
  scrollXYY: ScrollValue
  allScrolls: ScrollValue[]
  async initUI(ui: UI) {
    await getAssetsManager().loadAsset('uiSmall')
    await getAssetsManager().loadAsset('particle')

    const container = ui.getContainer('randomTests')
    await container.ready

    const scrollViewY = new SimpleTestScrollView('y', 400)

    scrollViewY.outer.matrix.setConstraints(
      new Pin(0.5, 0.5, -20, -20),
      ReadonlyPin.Center,
      new Pin(0.25, 0.75)
    )

    container.add(scrollViewY.outer)

    const scrollViewX = new SimpleTestScrollView('x', 3000)

    scrollViewX.outer.matrix.setConstraints(
      new Pin(0.5, 0.5, -20, -20),
      ReadonlyPin.Center,
      new Pin(0.75, 0.25)
    )

    container.add(scrollViewX.outer)

    const scrollViewXY = new ComplexTestScrollView(500, 500)

    scrollViewXY.outer.matrix.setConstraints(
      new Pin(0.25, 0.25, -20, -20),
      ReadonlyPin.Center,
      new Pin(0.75, 0.75)
    )

    container.add(scrollViewXY.outer)
    container.show()

    super.initUI(ui)

    const dragX = new DragValue()
    const dragY = new DragValue()

    const scrollX = new ScrollValue()
    const scrollY = new ScrollValue()

    const scrollXYX = new ScrollValue()
    const scrollXYY = new ScrollValue()

    const allScrolls = [scrollX, scrollY, scrollXYX, scrollXYY]

    scrollY.speedPPS = -1

    UpdateManager.register({
      update(dt: number) {
        if (dragX.active) {
          const x = dragX.drain()
          scrollX.addPosition(x)
          scrollXYX.addPosition(x)
        }
        if (dragY.active) {
          const y = dragY.drain()
          scrollY.addPosition(y)
          scrollXYY.addPosition(y)
        }
        scrollX.innerSize = scrollViewX.inner.matrixWorld.getWidthInPixels()
        scrollX.outerSize = scrollViewX.outer.matrixWorld.getWidthInPixels()
        scrollY.innerSize = scrollViewY.inner.matrixWorld.getHeightInPixels()
        scrollY.outerSize = scrollViewY.outer.matrixWorld.getHeightInPixels()
        scrollXYX.innerSize = scrollViewXY.inner.matrixWorld.getWidthInPixels()
        scrollXYX.outerSize = scrollViewXY.outer.matrixWorld.getWidthInPixels()
        scrollXYY.innerSize = scrollViewXY.inner.matrixWorld.getHeightInPixels()
        scrollXYY.outerSize = scrollViewXY.outer.matrixWorld.getHeightInPixels()
        scrollX.update(dt)
        scrollY.update(dt)
        scrollXYX.update(dt)
        scrollXYY.update(dt)
      }
    })

    this.scrollViewX = scrollViewX
    this.scrollViewY = scrollViewY
    this.scrollViewXY = scrollViewXY
    this.scrollX = scrollX
    this.scrollY = scrollY
    this.scrollXYX = scrollXYX
    this.scrollXYY = scrollXYY

    this.allScrolls = allScrolls
    this.dragX = dragX
    this.dragY = dragY

    listenToProperty(scrollX, 'innerPos', v => {
      scrollViewX.inner.matrix.offset.x.offset = v
    })
    listenToProperty(scrollY, 'innerPos', v => {
      scrollViewY.inner.matrix.offset.y.offset = v
    })
    listenToProperty(scrollXYX, 'innerPos', v => {
      scrollViewXY.inner.matrix.offset.x.offset = v
    })
    listenToProperty(scrollXYY, 'innerPos', v => {
      scrollViewXY.inner.matrix.offset.y.offset = v
    })
    inputProvider.onPressStart.addListener(this._onDragStart)
    inputProvider.onWheel.addListener(this._handleWheel)
  }
  update(dt: number) {
    super.update(dt)
  }

  private _onDragStart = (clientX: number, clientY: number) => {
    inputProvider.onDrag.addListener(this._onDrag)
    inputProvider.onPressEnd.addListener(this._onDragEnd)
    this.dragX.start(clientX)
    this.dragY.start(clientY)
    for (const scroll of this.allScrolls) {
      scroll.braking = true
      scroll.applyMarginSpring = false
    }
  }

  private _onDrag = (clientX: number, clientY: number) => {
    this.dragX.update(clientX)
    this.dragY.update(clientY)
  }

  private _onDragEnd = (clientX: number, clientY: number) => {
    this.dragX.stop(clientX)
    this.dragY.stop(clientY)

    for (const scroll of this.allScrolls) {
      scroll.braking = false
      scroll.applyMarginSpring = true
    }

    this.scrollX.speedPPS = this.dragX.speedPPS
    this.scrollY.speedPPS = this.dragY.speedPPS
    this.scrollXYX.speedPPS = this.dragX.speedPPS
    this.scrollXYY.speedPPS = this.dragY.speedPPS

    inputProvider.onDrag.removeListener(this._onDrag)
    inputProvider.onPressEnd.removeListener(this._onDragEnd)
  }

  private _handleWheel = (
    deltaX: number,
    deltaY: number,
    _: number,
    deltaMode: number
  ) => {
    const deltaScale = deltaMode ? WHEEL_LINE_PIXELS : 1
    if (deltaX !== 0) {
      this.scrollX.speedPPS = 0
      this.scrollX.addPosition(
        (-deltaX * deltaScale) /
          this.scrollViewY.outer.matrixWorld.getPixelWidth() /
          600
      )
      this.scrollXYX.speedPPS = 0
      this.scrollXYX.addPosition(
        (-deltaX * deltaScale) /
          this.scrollViewXY.outer.matrixWorld.getPixelWidth() /
          600
      )
    }

    if (deltaY !== 0) {
      this.scrollY.speedPPS = 0
      this.scrollY.addPosition(
        (-deltaY * deltaScale) /
          this.scrollViewY.outer.matrixWorld.getPixelHeight() /
          600
      )
      this.scrollXYY.speedPPS = 0
      this.scrollXYY.addPosition(
        (-deltaY * deltaScale) /
          this.scrollViewXY.outer.matrixWorld.getPixelHeight() /
          600
      )
    }
  }
}
export const scene = TestScrollingScene
