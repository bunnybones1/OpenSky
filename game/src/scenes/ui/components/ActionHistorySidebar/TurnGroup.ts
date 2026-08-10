import { Player } from '@skyweaver/state-metadata'

import { getAssetsManager } from '~/assets/index'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import { Easing } from '~/systems/animation/Easing'
import { CompleteStatus } from '~/systems/animation/RawTweener'
import { simpleTweener } from '~/systems/animation/tweeners'

import Object2D from '../../../../meshes/Object2D'
import ScrollView from '../ScrollView'
import { getPlayerColor } from './rowUtils'

export default class TurnGroup {
  mesh: Object2D
  private _height = 0
  private _padding: number = 0
  get padding(): number {
    return this._padding
  }
  set padding(value: number) {
    this._padding = value
  }

  private _rows: Object2D[]
  constructor(
    playerId: Player,
    public scrollView: ScrollView<Object2D>,
    padding: number
  ) {
    this._padding = padding
    this._height = padding
    const mesh = new Object2D()
    this._rows = []
    mesh.matrix.setConstraints(
      new Pin(1, 0, 0, 1),
      ReadonlyPin.TopLeft,
      ReadonlyPin.TopLeft.clone()
    )
    // this.itemsSize = row.scrollItemSize

    const bg = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'turn-group-box'
    )
    bg.matrix.setColor(getPlayerColor(playerId), 0.5)
    bg.matrix.offset = bg.matrix.offset.clone()
    mesh.add(bg)
    this.mesh = mesh
  }
  async add(object: Object2D) {
    this.height += object.matrix.size.y.offset
    await this.shiftChildren(object.matrix.size.y.offset)
    this.mesh.add(object)
    this._rows.push(object)
    object.matrix.offset.x.scale = -1
    object.matrix.offset.y.offset = 0 + this._padding
    simpleTweener.to({
      description: 'action history group position',
      target: object.matrix.offset.x,
      propertyGoals: {
        scale: 0
      },
      duration: 200,
      delay: 100,
      easing: Easing.Cubic.Out
    })
  }

  async shiftChildren(offset: number) {
    const anims: Promise<CompleteStatus>[] = []
    for (const r of this._rows) {
      const val = r.matrix.offset.y.offset + offset
      const anim = simpleTweener.to({
        description: 'action history group position',
        target: r.matrix.offset.y,
        propertyGoals: {
          offset: val
        },
        duration: 200,
        easing: Easing.Cubic.Out
      }).finished
      anims.push(anim)
    }
    await Promise.all(anims)
  }
  get height() {
    return this._height
  }
  set height(val: number) {
    if (this._height === val) {
      return
    }
    this._height = val
    simpleTweener.to({
      description: 'action history group size',
      target: this.mesh.matrix.size.y,
      propertyGoals: {
        offset: val
      },
      duration: 200,
      easing: Easing.Quartic.Out,
      onUpdate: () => {
        this.scrollView.makeDirty()
      }
    }).finished
  }
}
