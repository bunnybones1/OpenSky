import { Mesh } from 'three'

import { ACTION_HISTORY_SIDEBAR_WIDTH } from '~/constants'
import { debugAccounts } from '~/debugAccounts'
import { ReadonlyPin } from '~/helpers/LayoutHelpers'
import MatchResolutionPlaque, {
  getMatchResolutionPlaque
} from '~/helpers/MatchResolutionPlaque'
import Object2D from '~/meshes/Object2D'
import { accountsLoaded, store, storeHelper } from '~/state'
import { accountsStore } from '~/state/AccountStore'
import { simpleTweener } from '~/systems/animation/tweeners'
import { animationDelay } from '~/utils/asyncUtils'

import { UI } from '..'
import { SidebarStatus } from '../components/SlideOutSidebar/constants'
import UIContainer from '../components/UIContainer'

export default class MatchEndReviewContainer extends UIContainer {
  private _gradientTop: Mesh
  private _gradientBottom: Mesh
  private _plaque: MatchResolutionPlaque
  constructor(ui: UI, priority: number) {
    super(ui, 'match-end-review', {
      priority
    })
  }

  protected async init() {
    const endType = await storeHelper.getMatchEndType()

    // const gradientTop = getAssetsManager().fetchMeshDeepClone(
    //   'uiSmall',
    //   'gradient-top',
    //   true,
    //   true
    // )
    // const gradientBottom = getAssetsManager().fetchMeshDeepClone(
    //   'uiSmall',
    //   'gradient-bottom',
    //   true,
    //   true
    // )

    // gradientTop.matrix.setColor(COLOR_DARK_BLUE_GRADIENT)
    // gradientBottom.matrix.setColor(COLOR_DARK_BLUE_GRADIENT)

    // gradientTop.material.depth = 0.9

    this._handleResize()

    await accountsLoaded
    const account =
      store && accountsStore.accounts
        ? accountsStore.accounts[store.player!]
        : debugAccounts[0]
    this._plaque = await getMatchResolutionPlaque(endType, account.name)

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
  }

  show() {
    this.fadeIn()
  }
  async fadeIn(duration = 400) {
    await Promise.all([
      animationDelay(1900).then(() => super.fadeIn(duration)),
      this._plaque.animateIn()
    ])
  }
  protected _handleResize() {
    super._handleResize()
    if (!this._gradientTop) {
      return
    }
  }
}
