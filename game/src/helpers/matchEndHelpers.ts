import { Account, Reward } from '@opensky/proto'
import { delayPromise } from '@opensky/shared/utils/async'

import { UI } from '~/scenes/ui'
import WorkerProxyStore from '~/state/WorkerProxyStore'
import { disableActionHistoryPopupManager } from '~/systems/ActionHistoryPopupManager'
import { disableCardPopupManager } from '~/systems/CardPopupManager'
import { animationDelay } from '~/utils/asyncUtils'
import { nukeSkipButtons } from '~/utils/ui'

import { uiJump } from './uiJumpHelper'

async function prepareMatchEndOverlay(
  ui: UI,
  matchEndType: 'matchEndVictory' | 'matchEndDefeat' | 'matchEndTie'
) {
  disableCardPopupManager()
  disableActionHistoryPopupManager()

  const matchEndContainer = ui.getContainer(matchEndType)

  await matchEndContainer.ready
  await matchEndContainer.fadeIn().then(async function () {
    // Disable all render layers below 'MiddlegroundUI'
    await animationDelay(1500)
    if (ui.hasContainer('game')) {
      const gameContainer = ui.getContainer('game')
      gameContainer.hide()
    }
  })
}

export async function showMatchEnd(
  ui: UI,
  matchEndType: 'matchEndVictory' | 'matchEndDefeat' | 'matchEndTie',
  matchResolution: Promise<WorkerProxyStore | undefined>,
  rewards: () => Reward[],
  account: Account
) {
  prepareMatchEndOverlay(ui, matchEndType)
  if (uiJump('endReview')) {
    const matchEndReviewContainer = ui.getContainer('matchEndReview')
    const timeoutId = setTimeout(() => {
      console.error(`Timed out waiting for Rewards.`)
      window.location.reload()
    }, 10000)
    await matchResolution
    clearTimeout(timeoutId)
    await matchEndReviewContainer.fadeOut()
  }
  const matchEnd = ui.getContainer(matchEndType)
  await matchEnd.ready
  await matchEnd.present(account, rewards())
  nukeSkipButtons()
  await delayPromise(1000)
  const matchEndContinueContainer = ui.getContainer('matchEndContinue')
  await matchEndContinueContainer.ready
  matchEndContinueContainer.fadeIn()
}
