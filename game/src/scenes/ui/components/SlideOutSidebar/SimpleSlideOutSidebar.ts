import { Color } from 'three'

import { getAssetsManager } from '~/assets/index'
import { SIDEBAR_WIDTH } from '~/constants'
import { makeSuperOpaque } from '~/helpers/I2D'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import { Sorter } from '~/helpers/SortType'
import RectangleMaterial from '~/materials/RectangleMaterial'
import Object2D from '~/meshes/Object2D'
import RectangleMesh from '~/meshes/RectangleMesh'
import { CursorType } from '~/systems/input/CursorType'
import IInteractive from '~/systems/input/IInteractive'
import { recursivelySetDepth } from '~/utils/threeUtils'

import SimpleRow from '../DeckViewerSidebar/SimpleRow'
import SimpleScrollView from '../SimpleScrollView'
import { SidebarPosition } from './constants'

const BG_COLOR = new Color('rgb(10, 7, 28)')

export class SimpleSlideOutSidebar<Item, RowKlass extends SimpleRow<Item>>
  extends Object2D
  implements IInteractive
{
  changeSort(sorter: Sorter<Item>) {
    this.scrollView.itemSorter = sorter
  }
  shouldRenderAsGroup = true

  update(dt: number) {
    if (this._dirty) {
      this.updateVisuals()
      this._dirty = false
    }
    this.scrollView.update(dt)
  }

  scrollView: SimpleScrollView<Item, RowKlass>

  cursor: CursorType = 'grab'

  private _dirty = false
  side = SidebarPosition.Left

  constructor(
    private rowConstructor: {
      new (item: Item): RowKlass
    },
    private _addToBottom?: boolean
  ) {
    super()

    const backgroundMesh = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'rectangle-double-outline-shadowed',
      true
    )

    const backgroundMeshOpaque = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'rectangle',
      true
    )
    makeSuperOpaque(backgroundMeshOpaque)
    backgroundMeshOpaque.matrix.setColor(BG_COLOR)

    const gradientHeight = 31

    const solidBlockBottomHeight = 15

    this.scrollView = new SimpleScrollView<Item, RowKlass>({
      scrollAxis: 'y',
      overflowStart: 10,
      overflowEnd: solidBlockBottomHeight
    })

    const topGradientMesh = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'gradient-top'
    )

    topGradientMesh.matrix.setColor(BG_COLOR, 0.9)

    const bottomGradientMesh = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'gradient-bottom'
    )
    bottomGradientMesh.matrix.setConstraints(
      new Pin(1, 0, 0, gradientHeight),
      ReadonlyPin.Bottom,
      ReadonlyPin.Bottom.cloneOffset(0, -solidBlockBottomHeight)
    )
    bottomGradientMesh.matrix.setColor(BG_COLOR, 0.9)

    const bottomPaddingCoverMesh = new RectangleMesh(new RectangleMaterial({}))
    bottomPaddingCoverMesh.matrix.setColor(BG_COLOR, 0.9)
    bottomPaddingCoverMesh.matrix.setConstraints(
      new Pin(1, 0, 0, solidBlockBottomHeight),
      ReadonlyPin.Bottom,
      ReadonlyPin.Bottom
    )

    const yOffset = 62

    const solidBlockTopHeight = yOffset
    const topOfListYOffset = solidBlockTopHeight + 10
    this.scrollView.matrix.setConstraints(
      new Pin(0, 1, SIDEBAR_WIDTH, -topOfListYOffset - solidBlockBottomHeight),
      ReadonlyPin.TopLeft,
      ReadonlyPin.TopLeft.cloneOffset(0, topOfListYOffset)
    )
    topGradientMesh.matrix.setConstraints(
      new Pin(1, 0, 0, gradientHeight),
      ReadonlyPin.Top,
      ReadonlyPin.Top.cloneOffset(0, solidBlockTopHeight)
    )
    this.add(backgroundMesh)
    this.add(backgroundMeshOpaque)
    this.add(this.scrollView)
    this.add(topGradientMesh)

    this.add(bottomPaddingCoverMesh)
    this.add(bottomGradientMesh)

    this.updateVisuals()
  }

  addRow(item: Item) {
    const row = new this.rowConstructor(item)

    if (this._addToBottom) {
      this.scrollView.push(row)
    } else {
      this.scrollView.unshift(row)
    }
    this.makeDirty()
  }

  hasRow(item: Item) {
    return this.scrollView.items.some(row => row.item === item)
  }

  getRow(item: Item) {
    return this.scrollView.items.find(row => row.item === item)
  }

  removeRow(item: Item) {
    const row = this.getRow(item)

    if (row) {
      this.scrollView.removeItem(row)
      row.teardown?.()
    }
    this.makeDirty()
  }
  makeDirty = () => {
    this._dirty = true
  }
  private updateVisuals() {
    this.scrollView.recalculate()
    recursivelySetDepth(this, 0.91)
  }
}
