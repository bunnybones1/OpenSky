import { i18n } from '@opensky/language-manager'
import { GameMode } from '@opensky/proto'
import device from '@opensky/shared/device'
import { getUrlParam } from '@opensky/shared/utils/location'
import { listenToProperty } from '@opensky/shared/utils/propertyListeners'
import { Color, Vector2 } from 'three'

import {
  END_TURN_BUTTON_HEIGHT,
  END_TURN_BUTTON_TOP_WIDTH,
  END_TURN_BUTTON_WIDTH,
  PALETTE_ROW,
  TURN_TIMER_WARNING_FRACTION
} from '~/constants'
import env from '~/env'
import { possiblyAdjustButtonRedGreenPalette } from '~/helpers/buttonHelpers'
import { gameMode, LocalGameMode } from '~/helpers/envGameModeHelpers'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import PaletteMappedVertexColorMeshMaterial from '~/materials/PaletteMappedVertexColorMeshMaterial'
import { matchEnded, store } from '~/state'
import { matchInfoStore } from '~/state/stores/MatchInfoStore'
import { emitParticlesInLineShape } from '~/systems/animation/emitParticlesInLineShape'
import { endTurn } from '~/systems/input/StateInteractions'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import { spaceEndsTurn } from '~/userSettings'
import { NOOP } from '~/utils/jsUtils'
import { quickStartTutorialFromQueryParams } from '~/utils/quickSaves'
import { isDeeplyVisible, removeFromParent } from '~/utils/threeUtils'
import {
  createButton,
  createButtonIcon,
  createButtonText,
  giveButtonKeyboardShortcut
} from '~/utils/ui'

import { UI } from '..'
import { ButtonState } from '../components/BaseButton'
import PinnedButton from '../components/PinnedButton'
import TurnTimer from '../components/TurnTimer'
import UIContainer from '../components/UIContainer'
import { makeTextContainerMinWidthCallback } from '../makeTextContainerMinWidthCallback'
import DialogContainer from './dialog'
import { showDrawTimerWarning } from './playerActionError'

if (import.meta.hot) {
  import.meta.hot.accept('./dialog', () => {
    console.warn(
      'DialogContainer updated, not forcing a refresh via endTurnButton.ts'
    )
  })
}
const __shapeData = [
  [END_TURN_BUTTON_WIDTH, 0],
  [0, 0],
  [0, END_TURN_BUTTON_HEIGHT],
  [END_TURN_BUTTON_WIDTH, END_TURN_BUTTON_HEIGHT]
] as const

const gray = new Color(0.4, 0.4, 0.4)
const yellow = new Color(0.9, 0.6, 0.1)
export default class EndTurnButtonContainer extends UIContainer {
  resetButton?: PinnedButton
  resetButtonText: UITextMesh
  endTurnButton?: PinnedButton
  endTurnButtonText?: UITextMesh
  skipButton?: PinnedButton
  skipButtonText?: UITextMesh
  turnTimer?: TurnTimer

  private endTime: number
  stopParticles: (() => void) | undefined
  constructor(ui: UI, priority: number) {
    super(ui, 'endTurnButton', {
      priority
    })
  }

  protected init() {
    if (gameMode === GameMode.TUTORIAL) {
      this.resetButton = createButton(
        this,
        () => {
          DialogContainer.present(
            this.ui,
            i18n.t('common:options.prompt.restart'),
            {
              label: i18n.t('common:options.confirm'),
              onSelect: () => {
                quickStartTutorialFromQueryParams().catch(e =>
                  store.fireClientError(e)
                )
              },
              basePaletteRow: PALETTE_ROW.GREEN,
              useFancyHighlight: true
            },
            {
              label: i18n.t('common:options.cancel'),
              onSelect: NOOP
            }
          )
        },
        Pin.fromPixels(END_TURN_BUTTON_TOP_WIDTH, END_TURN_BUTTON_HEIGHT),
        ReadonlyPin.BottomRight,
        ReadonlyPin.BottomRight.cloneOffset(-3, -END_TURN_BUTTON_HEIGHT - 5),
        undefined,
        undefined,
        'button-end-turn',
        true,
        env.TURN_TIMER_ENABLED
      )
      this.resetButton.basePaletteRow = PALETTE_ROW.PURPLE
      this.resetButtonText = createButtonText(
        this.resetButton.mesh,
        i18n.t('ui.endTurnButton.restart'),
        textOptions.endTurnButtonText,
        undefined,
        ReadonlyPin.Center.cloneOffset(0, -2)
      )
      matchEnded().then(() => {
        this.resetButton!.disabled = true
      })
      listenToProperty(this.resetButton, 'state', state => {
        const isDisabled = state === ButtonState.Disabled
        ;(
          this.resetButton!.mesh
            .material as PaletteMappedVertexColorMeshMaterial
        ).setFancyHighlightColor(isDisabled ? gray : yellow)
        this.resetButton!.basePaletteRow = isDisabled
          ? PALETTE_ROW.GREEN
          : PALETTE_ROW.PURPLE
      })
      this.setResetEnabled(false)

      this.ui.getContainer('tutorial').helperCubeReady.then(() => {
        const helperCube = this.ui.getContainer('tutorial').helperCube
        if (!getUrlParam('lethalPuzzleURL')) {
          const skipButton = createButton(
            this,
            () => {
              helperCube.fastForward()
            },
            Pin.fromPixels(
              END_TURN_BUTTON_TOP_WIDTH * 0.65,
              END_TURN_BUTTON_HEIGHT * 0.8
            ),
            ReadonlyPin.BottomRight,
            ReadonlyPin.BottomRight.cloneOffset(
              -2.5 - 10,
              -END_TURN_BUTTON_HEIGHT - 8 - 15
            ),
            undefined,
            undefined,
            'button-diagonal',
            false,
            false
          )
          const listener = () => {
            const active =
              helperCube.isPlayingMessage && !helperCube.skipCurrentMessage
            skipButton.disabled = !active
          }
          listenToProperty(helperCube, 'skipCurrentMessage', listener)
          listenToProperty(helperCube, 'isPlayingMessage', listener)

          const fastForwardIcon = createButtonIcon(
            skipButton.mesh,
            'ui-icon-fast-forward',
            new Pin(0, 0.5, 20, 0)
          )
          fastForwardIcon.matrix.prescale = new Vector2(1.3, 1.3)

          skipButton.basePaletteRow = PALETTE_ROW.BLUE
          this.skipButtonText = createButtonText(
            skipButton.mesh,
            i18n.t('ui.tutorial.nextTip'),
            textOptions.fastForwardButtonText,
            undefined,
            ReadonlyPin.Center.cloneOffset(10, 0)
          )
          giveButtonKeyboardShortcut(skipButton, ' ')

          this.skipButton = skipButton
        }
      })
    }

    const endTurnButtonSize = Pin.fromPixels(
      END_TURN_BUTTON_WIDTH,
      END_TURN_BUTTON_HEIGHT
    )

    const endTurnButton = createButton(
      this,
      gameMode === LocalGameMode.SPECTATE
        ? () => {
            const stickers = this.ui.getContainer('spectatorStickers')
            stickers.ready.then(() =>
              stickers.visible ? stickers.fadeOut() : stickers.fadeIn()
            )
          }
        : () => {
            const turnsLeftBeforeDraw =
              store.state!.state.gameParams.maxTurnCount -
              (matchInfoStore.turnCount + 1)

            if (turnsLeftBeforeDraw <= 11 && turnsLeftBeforeDraw > 1) {
              showDrawTimerWarning(
                this.ui,
                `${turnsLeftBeforeDraw - 2} turn${
                  turnsLeftBeforeDraw === 3 ? '' : 's'
                } remaining`
              )
            }
            endTurn()
          },
      endTurnButtonSize,
      ReadonlyPin.BottomRight,
      ReadonlyPin.BottomRight.cloneOffset(-3, -3),
      undefined,
      undefined,
      'button-end-turn',
      true,
      env.TURN_TIMER_ENABLED
    )
    giveButtonKeyboardShortcut(endTurnButton, ' ', () => spaceEndsTurn.value)

    if (gameMode === LocalGameMode.SPECTATE) {
      endTurnButton.basePaletteRow = PALETTE_ROW.PURPLE
      createButtonText(
        endTurnButton.mesh,
        i18n.t('ui.stickers'),
        textOptions.endTurnButtonText,
        makeTextContainerMinWidthCallback(endTurnButtonSize),
        ReadonlyPin.Center.cloneOffset(0, -2)
      )
    } else {
      endTurnButton.disabled = true
      endTurnButton.basePaletteRow = PALETTE_ROW.GREEN
      this.endTurnButton = endTurnButton
      const endTurnButtonText = createButtonText(
        endTurnButton.mesh,
        i18n.t('ui.endTurnButton.endTurn'),
        textOptions.endTurnButtonText,
        makeTextContainerMinWidthCallback(endTurnButtonSize),
        ReadonlyPin.Center.cloneOffset(0, -2)
      )
      this.endTurnButtonText = endTurnButtonText
      listenToProperty(matchInfoStore, 'isPlayerTurn', v => {
        endTurnButtonText.text = v
          ? i18n.t('ui.endTurnButton.endTurn')!
          : i18n.t('ui.endTurnButton.enemyTurn')!
      })

      listenToProperty(endTurnButton, 'state', state => {
        const isDisabled = state === ButtonState.Disabled
        ;(
          endTurnButton.mesh.material as PaletteMappedVertexColorMeshMaterial
        ).setFancyHighlightColor(isDisabled ? gray : yellow)
      })

      if (device.isMobile) {
        this.endTurnButton.mesh.matrix.prescale = new Vector2(0.9, 0.9)
      }
    }

    if (env.TURN_TIMER_ENABLED) {
      const turnTimer = new TurnTimer(
        'end-turn',
        env.TURN_TIMER_MAX,
        TURN_TIMER_WARNING_FRACTION
      )

      endTurnButton.mesh.add(turnTimer.mesh)
      const leftOffset = 8
      turnTimer.mesh.matrix.setConstraints(
        new Pin(1, 0, -leftOffset, 5.5),
        ReadonlyPin.BottomLeft,
        ReadonlyPin.TopLeft.cloneOffset(leftOffset, -2)
      )
      this.turnTimer = turnTimer
    } else {
      this.endTime = Date.now() + 10000000000
    }
    listenToProperty(
      matchInfoStore.timer,
      'turnEndTime',
      endTime => {
        this.endTime = endTime
        if (this.turnTimer) {
          this.turnTimer.endTime = endTime
        }
      },
      true
    )
    if (gameMode === LocalGameMode.REPLAY) {
      removeFromParent(endTurnButton.mesh)
    }
  }

  startParticles() {
    if (!this.endTurnButton) {
      return
    }
    const e = emitParticlesInLineShape(
      this.endTurnButton.mesh,
      __shapeData,
      'uiSparks'
    )
    this.stopParticles = e.destroy
  }
  async fadeOut(duration?: number) {
    if (this.turnTimer) {
      this.turnTimer.toggleSparkles(false)
    }
    await super.fadeOut(duration)
  }
  update() {
    if (this.endTurnButton) {
      const shouldEmit =
        possiblyAdjustButtonRedGreenPalette(this.endTurnButton, this.endTime) &&
        isDeeplyVisible(this)
      if (shouldEmit && !this.stopParticles) {
        this.startParticles()
      } else if (!shouldEmit && this.stopParticles) {
        this.stopParticles()
        this.stopParticles = undefined
      }
    }
    this.turnTimer?.update()
  }

  setResetEnabled(enabled: boolean) {
    if (this.resetButton) {
      this.resetButton.mesh.visible = enabled
      this.resetButton.disabled = !enabled
    }
  }
}
