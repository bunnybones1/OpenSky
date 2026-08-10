import { getAssetsManager } from '~/assets/index'
import { Pin } from '~/helpers/LayoutHelpers'
import { Easing } from '~/systems/animation/Easing'
import { simpleTweener } from '~/systems/animation/tweeners'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import { animationDelay } from '~/utils/asyncUtils'

import { UI } from '..'
import UIContainer from '../components/UIContainer'

export default class SpecialMessageContainer extends UIContainer {
  private textMesh: UITextMesh
  private _panelSizePin: Pin
  constructor(ui: UI, priority: number) {
    super(ui, 'your-turn', { priority })
  }
  async announce(message: string, duration = 2000) {
    this.textMesh.text = message
    await this.fadeIn(200)
    await animationDelay(duration)
    await this.fadeOut(400)
  }

  protected _animateOpacity(opacity: number, duration: number) {
    if (this._targetOpacity === opacity) {
      return
    }
    simpleTweener.to({
      description: 'UI container panel size',
      target: this._panelSizePin.y,
      duration,
      propertyGoals: { offset: opacity * 120 },
      easing: Easing.Quartic.InOut
    })
    return super._animateOpacity(opacity, duration)
  }
  protected init() {
    const centerishPin = new Pin(0.5, 0.415)
    const panelMesh = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'breakdown-box-curved',
      true,
      true
    )
    const panelSizePin = new Pin(1, 0, -10, 0)
    panelMesh.matrix.setConstraints(panelSizePin, undefined, centerishPin)
    this.add(panelMesh)
    const textMesh = new UITextMesh('YOUR TURN', textOptions.turnChangeTitle)
    this.add(textMesh)
    textMesh.matrix.setConstraintsPosition(centerishPin)
    this.textMesh = textMesh
    this._panelSizePin = panelSizePin
  }
}
