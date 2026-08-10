import { parentPort, threadId, workerData } from 'worker_threads'

import { ApiClient } from '../ApiClient'
import { WorkerData } from '../services/ThreadService'
import { configureLogger, logger } from '../utils/logger'
import { MatchCollection } from './match/MatchCollection'
import {
  MatchCreationMessage,
  ThreadTransportMessage
} from './match/TransportModels'
import { post } from './match/utils'

/* match worker thread setup */
export const { config, autoScale } = workerData.data as WorkerData
const inactiveTimeout = config.settings.worker.threadInactiveTimeoutMs

configureLogger(config)

export const apiClient = new ApiClient(config.services.openskyAPI)
const matches = new MatchCollection(config)

/* 
  if the current worker thread is idle, terminate when all conditions are met
  1. last task received more than inactive timeout configuration
  2. no active matches 
  3. the current thread is an auto scaled thread OR threadRestartInterval is reached
  
  (threadRestartInterval is used to prevent OOM errors after a thread processes
    many matches, restart thread to ensure a thread health)
*/
setInterval(() => {
  if (
    Date.now() - matches.lastTask > inactiveTimeout &&
    matches.size === 0 &&
    (autoScale || matches.shouldRestartThread)
  ) {
    post({
      type: 'thread_inactive'
    })
  }
}, inactiveTimeout)

if (!parentPort) {
  throw new Error('Worker started without a parent!! Aborting.')
}

logger.debug('WORKER READY', { threadId })

parentPort.on('message', (m: ThreadTransportMessage | MatchCreationMessage) => {
  matches.lastTask = Date.now()

  if (m.type === 'match_create') {
    matches.createMatch(m.matchData)
  }

  if (m.type === 'relay') {
    const match = matches.getMatch(m.matchID)

    if (!match) {
      logger.error('MATCH NOT FOUND ON THREAD', m)
      return
    }

    match.messageLog(m)

    if (match.isDead) {
      match.getPlayerContextByID(m.playerID).send({
        type: 'match_ended'
      })
      return
    }

    try {
      // handle messages from the main thread

      switch (m.message.type) {
        case 'join_server':
          match.handleJoin(m.message)
          break
        case 'spectate_server':
          match.handleSpectatorJoin(m.message)
          break
        case 'player_finished_loading_assets':
          match.handlePlayerFinishLoadingAssets(m.playerID)
          break
        case 'gameplay':
          match.handleGameplayMessage(m.playerID, m.message)
          break
        case 'emote':
          match.handleEmoteMessage(m.playerID, m.message)
          break
        case 'mute_opponent':
          match.handleEnemyMutedMessage(m.playerID, m.message)
          break
        case 'check_disconnected_mid_commit_reveal':
          match.handleCheckDisconnectMidCommitRevealMessage(m.playerID)
          break
        case 'player_disconnected':
          match.handlePlayerDisconnected(m.playerID)
          break
        case 'abandon_match':
          match.handleAbandonMessage(m.playerID)
          break
        default:
          logger.error('Unknown msg type received in thread worker', {
            matchID: match.matchID,
            message: m
          })
      }

      match.logger.commitAllPotential()
    } catch (error) {
      match.logger.revertAllPotential()
      logger.error('ERROR HANDLING MESSAGE IN THREAD', error, {
        matchID: match.matchID,
        message: m.message
      })
      if (
        typeof error === 'string' &&
        error.includes('unsafe aliasing in rust')
      ) {
        // this is a fatal error, kill the game.
        match.onMatchGameEnd()

        match.crashed().then(() => match.onMatchRecordEnd())
      }

      if (error instanceof Error) {
        match.logger.append({
          type: 'error',
          timestamp: new Date(),
          error: {
            message: error.message,
            stack: error.stack
          }
        })
      }
    }

    match.updateMatchStatus()
  }
})

process.on('uncaughtException', error => {
  logger.error(
    'worker thread uncaughtException',
    {
      error:
        error instanceof Error
          ? { message: error.message, stack: error.stack }
          : error
    },
    { threadId }
  )
})
