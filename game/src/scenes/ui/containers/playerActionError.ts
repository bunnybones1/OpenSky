import { Color, Matrix4, Vector3 } from 'three'

import GamePinCushionComponent from '~/components/GamePinCushionComponent'
import { END_TURN_BUTTON_HEIGHT, END_TURN_BUTTON_WIDTH } from '~/constants'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import { playSound } from '~/helpers/soundHelpers'
import Object2D from '~/meshes/Object2D'
import { Easing } from '~/systems/animation/Easing'
import { simpleTweener } from '~/systems/animation/tweeners'
import { SourceActionError } from '~/systems/input/StateInteractions'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import { removeFromParent } from '~/utils/threeUtils'

import { UI } from '..'
import UIContainer from '../components/UIContainer'

export function showPlayerActionError(ui: UI, err: SourceActionError) {
  const container = ui.getContainer('playerActionError')
  container.ready.then(() => container.present(err))
}
export function showDrawTimerWarning(ui: UI, msg: string) {
  const container = ui.getContainer('playerActionError')
  container.ready.then(() =>
    container.present(
      { msg },
      ReadonlyPin.BottomRight.cloneOffset(
        -END_TURN_BUTTON_WIDTH / 2,
        -END_TURN_BUTTON_HEIGHT * 1.6
      ),
      new Color(0xff429d)
    )
  )
}

export default class PlayerActionErrorContainer extends UIContainer {
  constructor(ui: UI, priority: number) {
    super(ui, 'player-action-error', {
      priority
    })
  }

  present(err: SourceActionError, offsetPin?: Pin, textColor?: Color) {
    this.show()
    const offsetClone = offsetPin?.clone()
    const root = new Object2D()
    this.add(root)
    let dynamicCenterPin = offsetPin ?? new Pin(0.5, 0.75)
    if (err.entity) {
      dynamicCenterPin = GamePinCushionComponent.getPin(err.entity)
    }
    root.matrix.setConstraintsPosition(dynamicCenterPin)
    let removeActionSidebarListener: (() => void) | undefined
    if (!err.entity) {
      const actionHistoryContainer = this.ui.getContainer('actionHistory')
      removeActionSidebarListener = actionHistoryContainer.sidebar.onAnimate(
        (progress, delta) => {
          dynamicCenterPin.x.offset = offsetClone
            ? offsetClone?.x.offset
            : delta * 0.4
        }
      )
    }

    const shadowMesh = new UITextMesh(
      err.msg,
      textOptions.playerActionErrorShadow
    )
    shadowMesh.shouldRenderAsGroup = true
    shadowMesh.matrix.setConstraintsPosition(ReadonlyPin.Center.clone())
    root.add(shadowMesh)

    const textMesh = new UITextMesh(err.msg, {
      ...textOptions.playerActionErrorText,
      color: textColor ?? textOptions.playerActionErrorText.color
    })
    shadowMesh.add(textMesh)

    textMesh.matrix.setConstraintsPosition(Pin.fromPixels(0, 4.5))

    playSound('audioFxCommon', 'Error')
    simpleTweener
      .to({
        description: 'show player error',
        target: shadowMesh.matrix,
        propertyGoals: { opacity: 1 },
        duration: 400,
        easing: Easing.Cubic.Out
      })
      .finished.then(async () => {
        await simpleTweener.to({
          description: 'hide player error',
          target: shadowMesh.matrix,
          propertyGoals: { opacity: 0 },
          delay: 600,
          duration: 1000,
          easing: Easing.Cubic.In
        }).finished
        removeFromParent(root)
        if (removeActionSidebarListener) {
          removeActionSidebarListener()
        }
        if (this.children.length === 0) {
          this.hide()
        }
        if (err.entity) {
          GamePinCushionComponent.releasePin(err.entity)
        }
      })

    simpleTweener.to({
      description: 'slide player error text',
      target: shadowMesh.matrix.offset.y,
      propertyGoals: { offset: -20 },
      duration: 2000
    })
  }
  init() {
    // noop!
  }
}

const __vec = new Vector3()
const __mat4 = new Matrix4()
