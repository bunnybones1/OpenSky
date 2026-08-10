import { GameMode } from '@opensky/proto'
import device from '@opensky/shared/device'
import { renderMetrics } from '@opensky/shared/renderMetrics'

import { gameMode, LocalGameMode } from '~/helpers/envGameModeHelpers'
import {
  animationOrchestratorReadyToStartMatch,
  getAnimationOrchestrator
} from '~/systems/AnimationOrchestrator'
import { cameraShaker } from '~/utils/cameraShaker'

import ActionHistorySidebar from '../components/ActionHistorySidebar'
import { SidebarStatus } from '../components/SlideOutSidebar/constants'
import UIContainer from '../components/UIContainer'
import { UI } from '../index'

export default class ActionHistoryContainer extends UIContainer {
  sidebar: ActionHistorySidebar

  constructor(ui: UI, priority: number) {
    super(ui, 'actionHistory', {
      priority
    })
  }

  update(dt: number) {
    super.update(dt)
    this.sidebar.scrollView.update(dt)
  }

  protected async init() {
    const sidebar = new ActionHistorySidebar(cameraShaker.camera)
    this.sidebar = sidebar

    this.add(sidebar)

    if (gameMode === LocalGameMode.REPLAY) {
      return
    }

    if (device.isMobile || gameMode === GameMode.TUTORIAL) {
      sidebar.close()
    }
    await animationOrchestratorReadyToStartMatch
    getAnimationOrchestrator().subscribe(ev => {
      sidebar.process(ev)
    })

    const handleViewportChange = (progress: number, delta: number) => {
      delta *= 0.8 // Scale down the zoom slightly

      const vertPad = delta / renderMetrics.aspect

      cameraShaker.setViewOffset(
        renderMetrics.width,
        renderMetrics.height,
        -delta,
        -vertPad / 2,
        renderMetrics.width + delta,
        renderMetrics.height + vertPad
      )
    }

    sidebar.onAnimate(handleViewportChange)
    renderMetrics.onSizeChange(() =>
      handleViewportChange(
        sidebar.status === SidebarStatus.Revealed ? 1 : 0,
        sidebar.exposedWidth
      )
    )
  }
}
