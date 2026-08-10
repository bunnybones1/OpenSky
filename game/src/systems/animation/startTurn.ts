import {
  PhaseStartTurn,
  ResolvedPhaseStartTurn
} from '@skyweaver/state-metadata'

import { CardCacheWithEntities } from '~/cardCache'
import {
  getTimeInDays,
  onNextTimeOfDay
} from '~/controllers/skyTimerController'
import env from '~/env'
import { playSound } from '~/helpers/soundHelpers'
import queryParams from '~/queryParams'
import { store } from '~/state'
import { matchInfoStore } from '~/state/stores/MatchInfoStore'
import { TabbedLogger } from '~/utils/fancyLogs'
import { globalAccess } from '~/utils/globalAccess'

import { ActionStack } from '../AnimationOrchestrator'

export function onStartStartTurn(
  cardCache: CardCacheWithEntities,
  __: ActionStack,
  logger: TabbedLogger | undefined,
  player: PhaseStartTurn
) {
  const isMyTurn = player === cardCache.owner

  if (logger) {
    logger.logStory(`turn starting for ${isMyTurn ? 'player' : 'opponent'}`)
  }
}

export async function onEndStartTurn(
  cardCache: CardCacheWithEntities,
  __: ActionStack,
  logger: TabbedLogger | undefined,
  phase: ResolvedPhaseStartTurn
) {
  const isMyTurn = phase.player === cardCache.owner

  const info = matchInfoStore[isMyTurn ? 'playerInfo' : 'opponentInfo']
  info.heroHitThisTurn = false

  matchInfoStore.isPlayerTurn = isMyTurn
  matchInfoStore.pauseSky = false
  matchInfoStore.timer.hasGoneRedThisTurn = false
  matchInfoStore.timer.elapsedTurnTime = 0
  if (!env.TURN_TIMER_ENABLED) {
    matchInfoStore.timer.turnEndTime = Date.now() + env.TURN_TIMER_MAX * 3
  }

  const p = onNextTimeOfDay(
    `start of turn ${phase.turnCount} (${
      phase.player ? 'player' : 'opponent'
    })`,
    getTimeInDays(phase.turnCount, 0.015)
  )
  await p

  playSound('audioFxCommon', isMyTurn ? 'PlayerTurn' : 'EnemyTurn')
  const turnCount = phase.turnCount

  // for the last 10 turns, we want to start warning them, until turn 60
  const turnsLeftBeforeDraw =
    store.state!.state.gameParams.maxTurnCount - turnCount

  matchInfoStore.isPlayerTurn = isMyTurn
  matchInfoStore.gameStarted = true

  if (globalAccess.ui) {
    if (!queryParams.skipTurnChangeOverlays) {
      const uiContainer = globalAccess.ui.getContainer('whoseTurn')
      await uiContainer.ready
      await uiContainer.announce(isMyTurn, turnsLeftBeforeDraw)
    }
  }

  if (logger) {
    logger.logStory(`turn started for ${isMyTurn ? 'player' : 'opponent'}`)
  }
}
