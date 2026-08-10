import { i18n } from '@opensky/language-manager'
import device from '@opensky/shared/device'

import { getAssetsManager } from '~/assets/index'
import { PALETTE_ROW, RENDER_ORDERS } from '~/constants'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import { animationDelay } from '~/utils/asyncUtils'

import { UI } from '..'
import UIContainer from '../components/UIContainer'

export default class WhoseTurnContainer extends UIContainer {
  private textMesh: UITextMesh
  private warningTextMesh: UITextMesh
  private warningTextMeshShadow: UITextMesh
  constructor(ui: UI, priority: number) {
    super(ui, 'your-turn', { priority })
  }
  async announce(isPlayer: boolean, turnsLeftBeforeDraw?: number) {
    this.textMesh.text = `${
      isPlayer
        ? i18n.t('ui.whoseTurn.yourTurn')
        : i18n.t('ui.whoseTurn.enemysTurn')
    }`
    if (turnsLeftBeforeDraw && turnsLeftBeforeDraw <= 11) {
      const text = i18n.t('ui.whoseTurn.untilMatchEndsInDraw', {
        count: turnsLeftBeforeDraw - 1
      })
      this.warningTextMesh.text = text
      this.warningTextMeshShadow.text = text
    }
    await this.fadeIn(200)
    await animationDelay(800)
    await this.fadeOut(400)
  }
  protected init() {
    const shadowMesh = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'shadow-circle',
      true,
      true
    )
    shadowMesh.frustumCulled = false
    shadowMesh.material.paletteRow = PALETTE_ROW.BLACK_AND_WHITE
    shadowMesh.renderOrder = RENDER_ORDERS.text - 100
    this.add(shadowMesh)
    const centerishPin = new Pin(0.5, 0.415)
    shadowMesh.matrix.setConstraints(
      new Pin(0, 0, 400, 200),
      ReadonlyPin.Center,
      centerishPin
    )

    const textMesh = new UITextMesh(
      i18n.t('ui.whoseTurn.yourTurn'),
      textOptions.turnChangeTitle
    )
    this.add(textMesh)
    textMesh.matrix.setConstraintsPosition(centerishPin)
    this.textMesh = textMesh
    const warningOffset = new Pin(0.5, device.isMobile ? 0.52 : 0.475)
    this.warningTextMesh = new UITextMesh(``, textOptions.drawWarningText)

    this.warningTextMesh.matrix.setConstraintsPosition(warningOffset)
    this.warningTextMeshShadow = new UITextMesh(
      ``,
      textOptions.drawWarningTextShadow
    )
    this.warningTextMeshShadow.matrix.setConstraintsPosition(warningOffset)
    this.add(this.warningTextMeshShadow)
    this.add(this.warningTextMesh)

    const actionHistoryContainer = this.ui.getContainer('actionHistory')
    actionHistoryContainer.sidebar.onAnimate((progress, delta) => {
      centerishPin.x.offset = delta * 0.4
      warningOffset.x.offset = delta * 0.4
    })
  }
}
