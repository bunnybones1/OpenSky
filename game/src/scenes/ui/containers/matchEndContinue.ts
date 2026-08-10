import { i18n } from '@opensky/language-manager'
import { Color } from 'three'

import { COLOR_WHITE } from '~/colors/colorLibrary'
import {
  END_TURN_BUTTON_HEIGHT,
  END_TURN_BUTTON_WIDTH,
  PALETTE_ROW
} from '~/constants'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import { shouldShowTutorialContinueButton } from '~/helpers/tutorialContinueHelper'
import { storeHelper } from '~/state/index'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import {
  CONTINUE_BUTTON_NAME,
  createButton,
  createButtonText,
  giveButtonKeyboardShortcut
} from '~/utils/ui'

import { UI } from '..'
import Button from '../components/Button'
import PinnedButton from '../components/PinnedButton'
import UIContainer from '../components/UIContainer'
import {
  continueHandler,
  continueToNextTutorial,
  restartThisTutorial
} from '../helpers'
import { makeTextContainerMinWidthCallback } from '../makeTextContainerMinWidthCallback'

// const BUTTON_WIDTH = 274
export default class MatchEndContinueContainer extends UIContainer {
  continueButton: Button
  buttonLabel: UITextMesh
  numPresses: number = 0
  buttonSettings: PinnedButton
  constructor(ui: UI, priority: number) {
    super(ui, 'match-end-continue', {
      priority
    })
  }
  async fadeOut(duration?: number) {
    if (this.continueButton) {
      this.continueButton.mesh.visible = false
    }
    await super.fadeOut(duration)
  }
  protected async init() {
    const shouldShowTutorialContinue = await shouldShowTutorialContinueButton()
    if (shouldShowTutorialContinue) {
      const playerLost = (await storeHelper.getMatchEndType()) === 'defeat'
      const nextButtonSize = Pin.fromPixels(
        END_TURN_BUTTON_WIDTH,
        END_TURN_BUTTON_HEIGHT
      )
      const nextButton = createButton(
        this,
        () => {
          // Do *not* disable the next button on the first try.
          // if you call flipAll twice, the 2nd time will return right away,
          // so we want double-clicking to finish  ASAP
          if (this.numPresses > 0) {
            nextButton.disabled = true
          }
          this.numPresses += 1
          if (playerLost) {
            restartThisTutorial()
          } else {
            continueToNextTutorial()
          }
        },
        nextButtonSize,
        ReadonlyPin.BottomRight,
        ReadonlyPin.BottomRight.cloneOffset(-3, -3),
        undefined,
        undefined,
        'button-end-turn',
        true
      )
      nextButton.basePaletteRow = PALETTE_ROW.GREEN
      nextButton.mesh.material.setFancyHighlightColor(COLOR_WHITE)
      nextButton.mesh.name = CONTINUE_BUTTON_NAME
      this.buttonLabel = createButtonText(
        nextButton.mesh,
        playerLost
          ? i18n.t('ui.endTurnButton.retryTutorial')
          : i18n.t('ui.endTurnButton.playNextTutorial'),
        { ...textOptions.endTurnButtonText, size: 26 },
        makeTextContainerMinWidthCallback(nextButtonSize),
        ReadonlyPin.Center.cloneOffset(0, -2)
      )
    } else {
      const continueButton = createButton(
        this,
        () => {
          // Do *not* disable the continue button on the first try.
          // if you call flipAll twice, the 2nd time will return right away,
          // so we want double-clicking to finish  ASAP
          if (this.numPresses > 0) {
            continueButton.disabled = true
          }
          this.numPresses += 1
          continueHandler()
        },
        Pin.fromPixels(END_TURN_BUTTON_WIDTH, END_TURN_BUTTON_HEIGHT),
        ReadonlyPin.BottomRight,
        ReadonlyPin.BottomRight.cloneOffset(-3, -3),
        undefined,
        undefined,
        'button-end-turn',
        true
      )
      this.buttonLabel = createButtonText(
        continueButton.mesh,
        shouldShowTutorialContinue
          ? i18n.t('ui.endTurnButton.backToMenu')
          : i18n.t('ui.endTurnButton.continue'),
        textOptions.endTurnButtonText,
        undefined,
        ReadonlyPin.Center.cloneOffset(0, -2)
      )
      giveButtonKeyboardShortcut(continueButton, ' ')
      continueButton.basePaletteRow = PALETTE_ROW.PURPLE
      continueButton.mesh.matrix.setColor(new Color(3, 2.2, 2.2))
      continueButton.mesh.material.setFancyHighlightColor(COLOR_WHITE)
      continueButton.mesh.name = CONTINUE_BUTTON_NAME
      this.continueButton = continueButton
    }
  }
}
