import { Color } from 'three'
import { lerp } from 'three/src/math/MathUtils'

import { getAssetsManager } from '~/assets'
import { COLOR_BLACK, COLOR_GRAY, COLOR_WHITE } from '~/colors/colorLibrary'
import { makeSuperOpaque } from '~/helpers/I2D'
import { Pin, PinVal, ReadonlyPin } from '~/helpers/LayoutHelpers'
import RectangleMaterial from '~/materials/RectangleMaterial'
import Mesh2D from '~/meshes/Mesh2D'
import Object2D from '~/meshes/Object2D'
import RectangleMesh from '~/meshes/RectangleMesh'
import { deckCounterNumber } from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import { TrackableCollection } from '~/utils/TrackableCollection'

import { attemptMovePinVal } from './attemptMove2D'
import { DraftStateCard } from './DraftState'
import { getCachedCardStateView } from './getCachedCardStateView'

export default class CostCurveWidget extends Object2D {
  private _fillsByCost: Mesh2D[]
  private _label: UITextMesh
  constructor() {
    super()

    const backgroundMeshOpaque = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'rectangle-rounded',
      true
    )
    makeSuperOpaque(backgroundMeshOpaque)
    backgroundMeshOpaque.matrix.setColor(COLOR_BLACK)
    backgroundMeshOpaque.matrix.prescale.set(8, 8)

    this.add(backgroundMeshOpaque)

    const handCountIconBar = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'ui-icon-hand-count',
      true
    )
    this.add(handCountIconBar)
    handCountIconBar.matrix.prescale.set(1.5, 1.5)
    handCountIconBar.matrix.offset = new Pin(0.5, 0.5, 16, 5)
    const label = new UITextMesh(
      [
        {
          text: '11',
          color: COLOR_WHITE
        },
        {
          text: '/30',
          color: COLOR_GRAY
        }
      ],
      { ...deckCounterNumber, size: 20 }
    )
    label.matrix.setConstraints(
      undefined,
      new Pin(0, 0),
      new Pin(0.5, 0, 16, 12)
    )
    this._label = label
    this.add(label)

    const colorBarBG = new Color(0.3, 0.3, 0.3)

    const protoRect = new RectangleMesh(new RectangleMaterial({}))
    const fillsByCost: Mesh2D[] = []
    for (let i = 0; i < 11; i++) {
      const ratio = (i + 0.5) / 11
      const xLayout = lerp(0.1, 0.9, ratio)
      const container = new Object2D()
      this.add(container)
      const rect = protoRect.clone()
      rect.matrix.setColor(colorBarBG)
      container.matrix.setConstraints(
        new Pin(0.5 / 11, 0.6, 0, -8),
        ReadonlyPin.Bottom,
        new Pin(xLayout, 1, 0, -4)
      )
      const fill = rect.clone()
      fill.matrix.unlockConstraints()
      fill.matrix.setConstraints(
        new Pin(1, 0, 0, 0),
        ReadonlyPin.Bottom,
        ReadonlyPin.Bottom
      )
      //   fill.matrix.size.y.scale = 0
      fill.matrix.setColor(COLOR_WHITE)
      container.add(rect)
      container.add(fill)
      fillsByCost.push(fill)
    }
    this._fillsByCost = fillsByCost
  }

  update(cards: TrackableCollection<DraftStateCard>) {
    const newScales: number[] = []
    for (let i = 0; i < this._fillsByCost.length; i++) {
      newScales.push(0)
    }
    for (const card of cards.items) {
      const cardView = getCachedCardStateView(card)
      const cost = cardView.state.view.cost
      if (typeof cost === 'string') {
        this._fillsByCost[0].matrix.size.y.scale++
      } else {
        const iCost = Math.min(cost, this._fillsByCost.length - 1)
        newScales[iCost]++
      }
    }
    const max = newScales.reduce((p, c) => Math.max(p, c), 0)
    const maxVis = Math.max(5, max)
    for (let i = 0; i < newScales.length; i++) {
      attemptMovePinVal(
        this._fillsByCost[i].matrix.size.y,
        new PinVal(newScales[i] / maxVis)
      )
    }
    this._label.text = [
      {
        text: cards.length.toString(),
        color: COLOR_WHITE
      },
      {
        text: '/30',
        color: COLOR_GRAY
      }
    ]
  }
}
