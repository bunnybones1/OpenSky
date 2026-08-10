import { renderMetrics } from '@opensky/shared/renderMetrics'

import {
  BUTTON_HEIGHT,
  BUTTON_MARGINS,
  END_TURN_BUTTON_HEIGHT,
  PALETTE_ROW,
  SIDEBAR_WIDTH
} from '~/constants'
import { Pin, PinVal, ReadonlyPin } from '~/helpers/LayoutHelpers'
import Object2D from '~/meshes/Object2D'
import queryParams from '~/queryParams'
import DraftCardListViewer from '~/scenes/ui/components/DeckViewerSidebar/DraftCardListViewer'
import DraftPlayerActivityViewer from '~/scenes/ui/components/DeckViewerSidebar/DraftPlayerActivityViewer'
import PinnedButton from '~/scenes/ui/components/PinnedButton'
import UIContainer from '~/scenes/ui/components/UIContainer'
import { Easing } from '~/systems/animation/Easing'
import { simpleTweener } from '~/systems/animation/tweeners'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import { spaceEndsTurn } from '~/userSettings'
import AnimatedNumber from '~/utils/AnimatedNumber'
import { cameraShaker } from '~/utils/cameraShaker'
import SafeListeners from '~/utils/helpers/SafeListeners'
import { NOOP } from '~/utils/jsUtils'
import {
  createButton,
  createButtonText,
  giveButtonKeyboardShortcut
} from '~/utils/ui'

import { attemptMovePinVal } from './attemptMove2D'
import CostCurveWidget from './CostCurveWidget'
import { isFirstPlayer } from './draftDealerSteps/utils'
import { DraftLookingAtDeckUIElements } from './DraftLookingAtDeckUIElements'
import { DraftLookingAtUIElements } from './DraftLookingAtUIElements'
import DraftState from './DraftState'
import { EventStateLifeAuctionDealer } from './EventStateLifeAuction'
import { getDraftCardSorters } from './getDraftCardSorters'

const ARROW_BUTTON_SIZE = BUTTON_HEIGHT * 1.5

class LabelledButton {
  constructor(
    public button: PinnedButton,
    public label: UITextMesh
  ) {
    //
  }
}

export default function draftMockupInternalsUI(
  ui: UIContainer,
  state: DraftState
) {
  const container = new Object2D()
  ui.add(container)
  const safe = new SafeListeners()

  safe.listenForAdd(state.players, player => {
    const topTextShadow = new UITextMesh('', {
      ...textOptions.cardSelectTextShadow,
      vAlign: 'top'
    })
    topTextShadow.matrix.setConstraintsPosition(new Pin(0.5, 0.025))
    container.add(topTextShadow)
    const topText = new UITextMesh(topTextShadow.text, {
      ...textOptions.cardSelectText,
      vAlign: 'top'
    })
    topText.matrix.setConstraintsPosition(new Pin(0.5, 0.025))
    container.add(topText)

    if (isFirstPlayer(state, player)) {
      const sideBar = new DraftCardListViewer()
      sideBar.matrix.setConstraints(
        new Pin(0, 1, SIDEBAR_WIDTH, 0),
        ReadonlyPin.BottomLeft.clone(),
        ReadonlyPin.BottomLeft.clone()
      )
      container.add(sideBar)

      let finishButton: LabelledButton | undefined
      function getFinishButton() {
        if (!finishButton) {
          const button = createButton(
            container,
            () => (player.choiceCommited = true),
            Pin.fromPixels(150, END_TURN_BUTTON_HEIGHT * 2),
            ReadonlyPin.Right,
            ReadonlyPin.Right.cloneOffset(-BUTTON_MARGINS, 0),
            undefined,
            undefined,
            undefined,
            true
          )
          giveButtonKeyboardShortcut(button, ' ', () => spaceEndsTurn.value)
          const label = createButtonText(
            button.mesh,
            'CONFIRM CHOICE',
            textOptions.buttonText
          )
          function updateButtonDisabled() {
            button.disabled = !player.currentCardChoice || player.choiceCommited
          }
          safe.listenToProperty(player, 'choiceCommited', commited => {
            label.text = commited ? 'CHOICE COMMITED' : 'CONFIRM CHOICE'
            updateButtonDisabled()
          })
          button.basePaletteRow = PALETTE_ROW.GREEN
          finishButton = new LabelledButton(button, label)
          safe.listenToProperty(
            player,
            'currentCardChoice',
            updateButtonDisabled
          )
        }
        return finishButton!
      }
      safe.listenToProperty(player, 'currentCardPack', (newPack, oldPack) => {
        if (newPack) {
          const finishButton = getFinishButton()
          if (!oldPack) {
            const target = finishButton.button.mesh.matrix
            target.opacity = 0
            simpleTweener.to({
              description: 'show button',
              target,
              propertyGoals: { opacity: 1 },
              duration: 200
            })
          }
        } else if (oldPack) {
          const finishButton = getFinishButton()
          const target = finishButton.button.mesh.matrix
          target.opacity = 1
          simpleTweener.to({
            description: 'hide button',
            target,
            propertyGoals: { opacity: 0 },
            duration: 200
          })
        }
      })
      let deckInspectElements: Object2D | undefined
      function getDeckInspectElements() {
        if (!deckInspectElements) {
          deckInspectElements = new DraftLookingAtDeckUIElements(player, safe)
          deckInspectElements.matrix.opacity = 0
          sideBar.add(deckInspectElements)
        }
        return deckInspectElements!
      }
      let boonsInspectElements: Object2D | undefined
      function getBoonsInspectElements() {
        if (!boonsInspectElements) {
          boonsInspectElements = new DraftLookingAtUIElements(player)
          boonsInspectElements.matrix.opacity = 0
          sideBar.add(boonsInspectElements)
        }
        return boonsInspectElements!
      }

      function getLookAtUIElements(type: 'deck' | 'boons') {
        let obj: Object2D
        if (type === 'deck') {
          obj = getDeckInspectElements()
        } else {
          obj = getBoonsInspectElements()
        }
        obj.matrix.setConstraints(
          new Pin(1, 1),
          ReadonlyPin.TopRight,
          ReadonlyPin.TopLeft
        )
        return obj
      }

      function changeUIElementsVisibility(
        obj: Object2D,
        show: boolean,
        instantaneous: boolean
      ) {
        const target = obj.matrix
        const opacity = show ? 1 : 0
        if (instantaneous) {
          target.opacity = opacity
          obj.visible = show
        } else {
          if (show) {
            obj.visible = true
          }
          const onComplete = show
            ? NOOP
            : function () {
                obj.visible = false
              }
          simpleTweener.to({
            description: 'show buttons',
            target,
            propertyGoals: { opacity },
            duration: 200,
            onComplete
          })
        }
      }

      safe.listenToProperty(
        player,
        'lookingAt',
        (newLookTarget, oldLookTarget) => {
          const instantaneous = oldLookTarget === newLookTarget
          if (newLookTarget !== 'none') {
            changeUIElementsVisibility(
              getLookAtUIElements(newLookTarget),
              true,
              instantaneous
            )
          }
          if (oldLookTarget !== 'none' && !instantaneous) {
            changeUIElementsVisibility(
              getLookAtUIElements(oldLookTarget),
              false,
              instantaneous
            )
          }
        }
      )
      safe.listenToProperty(state, 'dealerEventState', newDealerEventState => {
        if (
          newDealerEventState &&
          newDealerEventState instanceof EventStateLifeAuctionDealer
        ) {
          safe.listenToProperty(
            newDealerEventState,
            'activePlayer',
            (newPlayer, oldPlayer) => {
              if (newPlayer && isFirstPlayer(state, newPlayer)) {
                const finishButton = getFinishButton()
                if (newPlayer !== oldPlayer) {
                  const target = finishButton.button.mesh.matrix
                  target.opacity = 0
                  simpleTweener.to({
                    description: 'show button',
                    target,
                    propertyGoals: { opacity: 1 },
                    duration: 200
                  })
                }
              } else if (oldPlayer && isFirstPlayer(state, oldPlayer)) {
                const finishButton = getFinishButton()
                const target = finishButton.button.mesh.matrix
                target.opacity = 1
                simpleTweener.to({
                  description: 'hide button',
                  target,
                  propertyGoals: { opacity: 0 },
                  duration: 200
                })
              }
            }
          )
        }
      })

      const topBarHeight = { value: 120 }
      const topBarLeftOffset = { value: 0 }
      const horizontalViewOffset = { value: 0 }

      const topBarHeightAnim = new AnimatedNumber(
        updateViewport,
        topBarHeight.value,
        200,
        Easing.Custom.SnappyButSmooth
      )

      const horizontalViewOffsetAnim = new AnimatedNumber(
        updateViewport,
        horizontalViewOffset.value,
        200,
        Easing.Custom.SnappyButSmooth
      )

      function updateViewport() {
        const vertPad = -topBarHeightAnim.animatedValue
        const horPad = vertPad * renderMetrics.aspect
        cameraShaker.setViewOffset(
          renderMetrics.width,
          renderMetrics.height,
          horPad / 2 - horizontalViewOffsetAnim.animatedValue,
          vertPad,
          renderMetrics.width - horPad,
          renderMetrics.height - vertPad
        )
      }

      safe.listenToProperty(topBarHeight, 'value', v =>
        topBarHeightAnim.animateToValue(v, 200)
      )
      safe.listenToProperty(horizontalViewOffset, 'value', v =>
        horizontalViewOffsetAnim.animateToValue(v, 200)
      )

      const cleanupRenderMetricsResize = renderMetrics.onSizeChange(
        updateViewport,
        true
      )
      safe.addCleanup(cleanupRenderMetricsResize)

      const playerActivity = new DraftPlayerActivityViewer(state, safe)
      playerActivity.matrix.setConstraints(
        new Pin(1, 0, 0, topBarHeight.value),
        ReadonlyPin.TopRight.clone(),
        ReadonlyPin.TopRight.clone()
      )
      container.add(playerActivity)

      const buttonTopBarArrow = new PinnedButton(
        () =>
          (state.uiPlayerActivityBarExpanded =
            !state.uiPlayerActivityBarExpanded),
        new Pin(0, 0, ARROW_BUTTON_SIZE, ARROW_BUTTON_SIZE),
        ReadonlyPin.TopRight.cloneOffset(BUTTON_MARGINS, -BUTTON_MARGINS),
        ReadonlyPin.BottomRight
      )
      buttonTopBarArrow.mesh.matrix.unlockConstraints()

      const buttonTopBarArrowLabel = createButtonText(
        buttonTopBarArrow.mesh,
        state.uiPlayerActivityBarExpanded ? '↑' : '↓',
        textOptions.debugTextBig
      )
      safe.listenToProperty(state, 'uiPlayerActivityBarExpanded', expanded => {
        buttonTopBarArrowLabel.text = expanded ? '↑' : '↓'
        topBarHeight.value = expanded ? 120 : 60
      })

      playerActivity.add(buttonTopBarArrow.mesh)

      const buttonSideBarRight = new PinnedButton(
        () => {
          if (state.uiHorizonMode === 'normal') {
            state.uiHorizonMode = 'sidebar'
          } else if (state.uiHorizonMode === 'sidebar') {
            state.uiHorizonMode = 'deckReader'
          }
        },
        new Pin(0, 0, ARROW_BUTTON_SIZE, ARROW_BUTTON_SIZE),
        ReadonlyPin.BottomLeft,
        ReadonlyPin.BottomRight.cloneOffset(
          BUTTON_MARGINS * 2 + ARROW_BUTTON_SIZE * 2,
          -BUTTON_MARGINS
        )
      )
      buttonSideBarRight.mesh.matrix.unlockConstraints()
      createButtonText(buttonSideBarRight.mesh, '→', textOptions.debugTextBig)
      sideBar.add(buttonSideBarRight.mesh)

      const buttonSideBarLeft = new PinnedButton(
        () => {
          if (state.uiHorizonMode === 'sidebar') {
            state.uiHorizonMode = 'normal'
          } else if (state.uiHorizonMode === 'deckReader') {
            state.uiHorizonMode = 'sidebar'
          }
        },
        new Pin(0, 0, ARROW_BUTTON_SIZE, ARROW_BUTTON_SIZE),
        ReadonlyPin.BottomRight,
        ReadonlyPin.BottomRight.cloneOffset(-BUTTON_MARGINS, -BUTTON_MARGINS)
      )
      buttonSideBarLeft.mesh.matrix.unlockConstraints()
      createButtonText(buttonSideBarLeft.mesh, '←', textOptions.debugTextBig)
      sideBar.add(buttonSideBarLeft.mesh)

      const costCurveWidget = new CostCurveWidget()
      safe.listenForAdd(player.deck, () => costCurveWidget.update(player.deck))
      safe.listenForRemove(player.deck, () =>
        costCurveWidget.update(player.deck)
      )

      costCurveWidget.matrix.setConstraints(
        new Pin(0, 0, ARROW_BUTTON_SIZE * 2, ARROW_BUTTON_SIZE),
        ReadonlyPin.BottomLeft,
        ReadonlyPin.BottomRight.cloneOffset(BUTTON_MARGINS, -BUTTON_MARGINS)
      )
      costCurveWidget.matrix.unlockConstraints()
      sideBar.add(costCurveWidget)

      safe.listenForAdd(player.deck, item => {
        sideBar.addRow(item)
        sideBar.deckBreakdownData.regenBreakdown(player.deck)
      })
      safe.listenToProperty(player, 'lookingAtDeckSortBy', newSortMode => {
        sideBar.changeSort(getDraftCardSorters()[newSortMode])
      })
      safe.listenForRemove(player.deck, item => {
        sideBar.removeRow(item)
        sideBar.deckBreakdownData.regenBreakdown(player.deck)
      })
      safe.listenToProperty(state, 'uiHorizonMode', newMode => {
        let leftButtonRightAlign = true
        const sm = sideBar.matrix
        const ccwm = costCurveWidget.matrix
        const bsblm = buttonSideBarLeft.mesh.matrix
        const bsbrm = buttonSideBarRight.mesh.matrix
        if (newMode === 'normal') {
          attemptMovePinVal(sm.size.y, new PinVal(1, 0))
          attemptMovePinVal(sm.anchor.x, new PinVal(0, 0))
          attemptMovePinVal(sm.offset.x, new PinVal(0, -SIDEBAR_WIDTH))
          topBarLeftOffset.value = 0
          horizontalViewOffset.value = 0
          attemptMovePinVal(ccwm.anchor.x, new PinVal(0))
          attemptMovePinVal(ccwm.offset.x, new PinVal(1, BUTTON_MARGINS))
          attemptMovePinVal(bsbrm.anchor.x, new PinVal(0))
          attemptMovePinVal(
            bsbrm.offset.x,
            new PinVal(1, BUTTON_MARGINS * 2 + ARROW_BUTTON_SIZE * 2)
          )
        } else if (newMode === 'sidebar') {
          attemptMovePinVal(sm.size.y, new PinVal(1, 0))
          attemptMovePinVal(sm.anchor.x, new PinVal(0, 0))
          attemptMovePinVal(sm.offset.x, new PinVal(0, 0))
          topBarLeftOffset.value = SIDEBAR_WIDTH
          horizontalViewOffset.value = SIDEBAR_WIDTH * 0.5
          attemptMovePinVal(ccwm.anchor.x, new PinVal(0.5))
          attemptMovePinVal(ccwm.offset.x, new PinVal(0.5))
          attemptMovePinVal(bsbrm.anchor.x, new PinVal(0))
          attemptMovePinVal(bsbrm.offset.x, new PinVal(1, BUTTON_MARGINS))
        } else if (newMode === 'deckReader') {
          attemptMovePinVal(sm.size.y, new PinVal(1, -topBarHeight.value))
          attemptMovePinVal(sm.anchor.x, new PinVal(1, 0))
          attemptMovePinVal(sm.offset.x, new PinVal(1, 0))
          topBarLeftOffset.value = 0
          horizontalViewOffset.value = SIDEBAR_WIDTH * -0.5
          attemptMovePinVal(ccwm.anchor.x, new PinVal(1))
          attemptMovePinVal(ccwm.offset.x, new PinVal(0, -BUTTON_MARGINS))
          leftButtonRightAlign = false
        }

        if (leftButtonRightAlign) {
          attemptMovePinVal(bsblm.anchor.x, new PinVal(1))
          attemptMovePinVal(bsblm.offset.x, new PinVal(1, -BUTTON_MARGINS))
        } else {
          attemptMovePinVal(bsblm.anchor.x, new PinVal(0))
          attemptMovePinVal(bsblm.offset.x, new PinVal(0, BUTTON_MARGINS))
        }
      })
      safe.listenToProperty(topBarLeftOffset, 'value', offset => {
        attemptMovePinVal(playerActivity.matrix.size.x, new PinVal(1, -offset))
      })

      safe.listenToProperty(topBarHeight, 'value', height => {
        if (state.uiHorizonMode === 'deckReader') {
          attemptMovePinVal(
            sideBar.matrix.size.y,
            new PinVal(1, -topBarHeight.value)
          )
        }
        attemptMovePinVal(playerActivity.matrix.size.y, new PinVal(0, height))
      })

      safe.onRafUpdate(sideBar)
    }
  })

  if (queryParams.debugDealer) {
    const buttonShowDealerBrain = createButton(
      container,
      () => (state.dealerShowBrain = !state.dealerShowBrain),
      Pin.fromPixels(200, END_TURN_BUTTON_HEIGHT),
      ReadonlyPin.TopRight,
      ReadonlyPin.TopRight.cloneOffset(-BUTTON_MARGINS, BUTTON_MARGINS + 180),
      undefined,
      undefined,
      undefined,
      true
    )
    const labelShowDealerBrain = createButtonText(
      buttonShowDealerBrain.mesh,
      '',
      textOptions.buttonText
    )
    safe.listenToProperty(state, 'dealerShowBrain', showBrain => {
      labelShowDealerBrain.text = `${
        showBrain ? 'HIDE' : 'SHOW'
      } DEALER'S BRAIN`
    })

    const topTextShadow = new UITextMesh('', {
      ...textOptions.cardSelectTextShadow,
      vAlign: 'top'
    })
    topTextShadow.matrix.setConstraintsPosition(new Pin(0.5, 0.95))
    container.add(topTextShadow)
    const topText = new UITextMesh(topTextShadow.text, {
      ...textOptions.cardSelectText,
      vAlign: 'top'
    })
    safe.listenToProperty(state, 'dealerCurrentStep', v => {
      topText.text = v
      topTextShadow.text = v
    })
    topText.matrix.setConstraintsPosition(new Pin(0.5, 0.95))
    container.add(topText)
  }
  return function cleanup() {
    safe.cleanup()
    ui.remove(container)
  }
}
