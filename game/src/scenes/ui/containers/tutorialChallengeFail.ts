import { lerp, unlerp } from '@opensky/shared/utils/math'
import { Color } from 'three'

import { getAssetsManager } from '~/assets/index'
import {
  ACTION_HISTORY_SIDEBAR_WIDTH,
  BUTTON_HEIGHT,
  BUTTON_MARGINS,
  PALETTE_ROW
} from '~/constants'
import { debugAccounts } from '~/debugAccounts'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import MatchResolutionPlaque, {
  getMatchResolutionPlaque
} from '~/helpers/MatchResolutionPlaque'
import Object2D from '~/meshes/Object2D'
import ScreenSpaceRingGlowingMesh from '~/meshes/ScreenSpaceRingGlowingMesh'
import { accountsLoaded, store } from '~/state'
import { accountsStore } from '~/state/AccountStore'
import { simpleTweener } from '~/systems/animation/tweeners'
import * as textOptions from '~/systems/text/TextOptions'
import { animationDelay } from '~/utils/asyncUtils'
import { quickStartTutorialFromQueryParams } from '~/utils/quickSaves'
import { createButton, createButtonText } from '~/utils/ui'

import { UI } from '..'
import Button from '../components/Button'
import { SidebarStatus } from '../components/SlideOutSidebar/constants'
import UIContainer from '../components/UIContainer'
import { goBackToWebapp } from '../helpers'

const BUTTON_WIDTH = 274
export default class TutorialChallengeFailContainer extends UIContainer {
  continue: Promise<void>
  backButton: Button
  private _rings: ScreenSpaceRingGlowingMesh[] = []
  private _plaque: MatchResolutionPlaque
  constructor(ui: UI, priority: number) {
    super(ui, 'tutorial-challenge-fail', {
      priority
    })
  }
  update(dt: number) {
    for (const ring of this._rings) {
      const ul = unlerp(0, 0.5, ring.material.progress)
      const l = lerp(40, 6, 1 - (1 - ul) * (1 - ul))
      ring.material.angle += dt * l
    }
  }
  protected async init() {
    const gradientBottom = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'gradient-bottom',
      true
    )
    gradientBottom.matrix.setConstraints(
      new Pin(1, 0, 0, 150),
      ReadonlyPin.Bottom,
      ReadonlyPin.Bottom
    )
    gradientBottom.matrix.setColor(new Color(0x0f0b21))
    this.add(gradientBottom)

    await accountsLoaded
    const account =
      store && accountsStore.accounts
        ? accountsStore.accounts[store.player!]
        : debugAccounts[0]
    this._plaque = await getMatchResolutionPlaque('defeat', account.name)

    const nonActionHistoryArea = new Object2D()
    const remainingSize = ReadonlyPin.FullSize.clone()
    if (this.ui.hasContainer('actionHistory')) {
      const actionHistory = this.ui.getContainer('actionHistory')
      if (actionHistory.initd) {
        actionHistory.sidebar.onToggle(s => {
          const open =
            s.status !== SidebarStatus.Hiding &&
            s.status !== SidebarStatus.Hidden
          simpleTweener.to({
            description: 'open/close action history at match end',
            target: remainingSize.x,
            propertyGoals: {
              offset: open ? -ACTION_HISTORY_SIDEBAR_WIDTH : 0
            },
            duration: 300
          })
        })
      }
    }
    nonActionHistoryArea.matrix.setConstraints(
      remainingSize,
      ReadonlyPin.TopRight,
      ReadonlyPin.TopRight
    )
    this.add(nonActionHistoryArea)

    const backButton = createButton(
      this,
      () => {
        goBackToWebapp()
      },
      Pin.fromPixels(BUTTON_WIDTH, BUTTON_HEIGHT * 1.5),
      ReadonlyPin.Bottom,
      ReadonlyPin.Bottom.cloneOffset(
        -BUTTON_WIDTH / 2 - BUTTON_MARGINS,
        -BUTTON_MARGINS * 2
      )
    )
    backButton.basePaletteRow = PALETTE_ROW.PURPLE_TRANSLUCENT
    createButtonText(
      backButton.mesh,
      'BACK TO MENU',
      textOptions.tutorialTryAgainButtonText
    )
    this.backButton = backButton
    const tryAgainButton = createButton(
      this,
      () => {
        quickStartTutorialFromQueryParams().catch(e => store.fireClientError(e))
        this.hide()
      },
      Pin.fromPixels(BUTTON_WIDTH, BUTTON_HEIGHT * 1.5),
      ReadonlyPin.Bottom,
      ReadonlyPin.Bottom.cloneOffset(
        BUTTON_WIDTH / 2 + BUTTON_MARGINS,
        -BUTTON_MARGINS * 2
      ),
      undefined,
      undefined,
      undefined,
      true
    )
    tryAgainButton.basePaletteRow = PALETTE_ROW.GREEN
    createButtonText(
      tryAgainButton.mesh,
      'TRY AGAIN',
      textOptions.tutorialTryAgainButtonText
    )
  }

  show() {
    this.fadeIn()
  }
  async fadeIn(duration = 400) {
    if (this.ui.hasContainer('endTurnButton')) {
      const endTurn = this.ui.getContainer('endTurnButton')
      if (endTurn.initd) {
        endTurn.hide()
      }
    }
    await Promise.all([
      animationDelay(1900).then(() => super.fadeIn(duration)),
      this._plaque.animateIn()
    ])
  }
  hide() {
    this.fadeOut()
  }
  async fadeOut(duration = 400) {
    if (this.ui.hasContainer('endTurnButton')) {
      const endTurn = this.ui.getContainer('endTurnButton')
      if (endTurn.initd) {
        endTurn.show()
      }
    }
    await Promise.all([
      super.fadeOut(duration),
      this._plaque.animateAllTheWayOut()
    ])
  }
}
