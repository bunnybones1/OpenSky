import device from '@opensky/shared/device'
import { Player } from '@skyweaver/state-metadata'
import { Vector2 } from 'three'

import { getAssetsManager } from '~/assets/index'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import Object2D from '~/meshes/Object2D'
import { store } from '~/state'
import { TextSegment } from '~/systems/text/TextMesh'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'

import { SCALE_CONSTANT } from './UIContainer'

class HandSizeCounter extends Object2D {
  private _handSize: number = 0
  private _maxHandSize: number = 0
  private _textMesh: UITextMesh

  constructor(player: Player) {
    super()

    const container = new Object2D()
    container.matrix.setConstraints(
      new Pin(1, 1),
      ReadonlyPin.Left,
      ReadonlyPin.Left,
      new Vector2(1 / SCALE_CONSTANT, 1 / SCALE_CONSTANT)
    )
    this.add(container)

    const handCountMesh = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'ui-icon-hand-count',
      undefined,
      true
    )
    handCountMesh.frustumCulled = false
    handCountMesh.matrix.setConstraints(
      new Pin(0, 0, 0, 0),
      ReadonlyPin.TopLeft,
      ReadonlyPin.TopLeft,
      new Vector2(1.5, 1.5)
    )

    container.add(handCountMesh)

    this._textMesh = new UITextMesh(this.text, {
      ...textOptions.cardCountText,
      align: 'left'
    })
    this._textMesh.matrix.setConstraintsPosition(
      ReadonlyPin.Left.cloneOffset(27, device.isMobile ? 1 : 0)
    )

    container.add(this._textMesh)

    store.subscribeToStateChanges(() => {
      const { state } = store
      if (!state) {
        return
      }
      const { playerCards } = state
      this._maxHandSize = state.state.gameParams.maxHandSize
      this._handSize = playerCards[player].hand.length

      this.update()
    })
  }

  update() {
    this._textMesh.text = this.text
  }

  get text(): TextSegment[] {
    return [
      {
        text: `${this._handSize}`,
        color: 0xffffff
      },
      {
        text: `/${this._maxHandSize}`,
        color: 0x675678
      }
    ]
  }
}

export default HandSizeCounter
