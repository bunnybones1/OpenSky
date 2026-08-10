import { i18n } from '@opensky/language-manager'
import { lerp, unlerp } from '@opensky/shared/utils/math'

import { COLOR_WHITE } from '~/colors/colorLibrary'
import {
  END_TURN_BUTTON_HEIGHT,
  END_TURN_BUTTON_WIDTH,
  PALETTE_ROW
} from '~/constants'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import ScreenSpaceRingGlowingMesh from '~/meshes/ScreenSpaceRingGlowingMesh'
import queryParams from '~/queryParams'
import { emitParticlesInLineShape } from '~/systems/animation/emitParticlesInLineShape'
import { simpleTweener } from '~/systems/animation/tweeners'
import CardFocusInspectionSystem from '~/systems/CardFocusInspectionSystem'
import EmoteSystem from '~/systems/EmoteSystem'
import FunPokeSystem from '~/systems/FunPokeSystem'
import TextMesh from '~/systems/text/TextMesh'
import * as textOptions from '~/systems/text/TextOptions'
import { removeFromParent } from '~/utils/threeUtils'
import {
  createButton,
  createButtonText,
  giveButtonKeyboardShortcut
} from '~/utils/ui'
import { world } from '~/world'

import { UI } from '..'
import PinnedButton from '../components/PinnedButton'
import UIContainer from '../components/UIContainer'
import { makeTextContainerMinWidthCallback } from '../makeTextContainerMinWidthCallback'

const z = -40
const __shapeData = [
  [END_TURN_BUTTON_WIDTH, 0, z],
  [0, 0, z],
  [0, END_TURN_BUTTON_HEIGHT, z],
  [END_TURN_BUTTON_WIDTH, END_TURN_BUTTON_HEIGHT, z]
] as const

export default class TutorialPlayButtonContainer extends UIContainer {
  play: Promise<void>
  button: PinnedButton
  buttonText: TextMesh
  shouldEmit: boolean = true
  private _rings: ScreenSpaceRingGlowingMesh[] = []

  stopParticles: (() => void) | undefined
  constructor(ui: UI, priority: number) {
    super(ui, 'tutorialPlayButton', {
      priority
    })
  }

  protected init() {
    let continueText: TextMesh | undefined
    this.play = new Promise(resolve => {
      const playButtonSize = Pin.fromPixels(
        END_TURN_BUTTON_WIDTH,
        END_TURN_BUTTON_HEIGHT
      )
      const playButton = createButton(
        this,
        () => {
          playButton.disabled = true
          if (this.ui.hasContainer('actionHistory')) {
            const actionHistory = this.ui.getContainer('actionHistory')
            this.ui.getContainer('hud').buttonActionHistory.disabled = true
            if (actionHistory.initd) {
              actionHistory.sidebar.closeAndLock().then(() => {
                actionHistory.hide()
              })
            }
          }
          if (world.hasSystem(FunPokeSystem)) {
            world.getSystem(FunPokeSystem).disable()
          }
          if (world.hasSystem(EmoteSystem)) {
            world.getSystem(EmoteSystem).disable()
          }
          if (world.hasSystem(CardFocusInspectionSystem)) {
            world.getSystem(CardFocusInspectionSystem).disable()
          }
          // const interactionCover = this.ui.getContainer('interactionCover')
          // await interactionCover.ready
          // interactionCover.show()
          if (continueText) {
            simpleTweener.to({
              description: 'hide continueText',
              target: continueText,
              propertyGoals: { opacity: 0 },
              onComplete() {
                removeFromParent(continueText!)
              },
              duration: 500
            })
          }
          const ringColor = COLOR_WHITE.clone()
          const ring = new ScreenSpaceRingGlowingMesh({
            radius: 20,
            innerThickness: 3,
            outerThickness: 20,
            color: ringColor,
            progress: 0,
            targetProgress: 0.6,
            willNeedAngle: true,
            transitionDuration: 700
          })
          // continueButton.mesh.add(ring)
          // ring.matrix.setConstraintsPosition(ReadonlyPin.Center)
          this._rings.push(ring)
          this.shouldEmit = false
          resolve()
        },
        playButtonSize,
        ReadonlyPin.BottomRight,
        ReadonlyPin.BottomRight.cloneOffset(-3, -3),
        undefined,
        undefined,
        'button-end-turn',
        true,
        false
      )
      this.button = playButton

      this.button.basePaletteRow = PALETTE_ROW.GREEN
      this.button.highlight = true

      const playText = !!queryParams.lethalPuzzleURL
        ? i18n.t('ui.endTurnButton.playPuzzle')
        : i18n.t('ui.endTurnButton.playTutorial', {
            level: queryParams.tutorialLevel
          })
      continueText = createButtonText(
        this.button.mesh,
        playText,
        textOptions.endTurnButtonText,
        makeTextContainerMinWidthCallback(playButtonSize),
        ReadonlyPin.Center.cloneOffset(0, -2)
      )
      this.buttonText = continueText

      giveButtonKeyboardShortcut(this.button, ' ')
    })
  }

  startParticles() {
    this.stopParticles = emitParticlesInLineShape(
      this.button.mesh,
      __shapeData,
      'uiSparks'
    ).destroy
  }

  fadeIn(duration?: number): Promise<void> {
    if (this.ui.hasContainer('endTurnButton')) {
      const endTurn = this.ui.getContainer('endTurnButton')
      if (endTurn.initd) {
        // so it doesn't stay on top of end match UI
        endTurn.fadeOut()
      }
    }
    return super.fadeIn(duration)
  }

  update(dt: number) {
    for (const ring of this._rings) {
      const ul = unlerp(0, 0.5, ring.material.progress)
      const l = lerp(40, 6, 1 - (1 - ul) * (1 - ul))
      ring.material.angle += dt * l
    }

    if (this.shouldEmit && !this.stopParticles) {
      this.startParticles()
    } else if (!this.shouldEmit && this.stopParticles) {
      this.stopParticles()
      this.stopParticles = undefined
    }
  }
}
