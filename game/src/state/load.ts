import { delayPromise } from '@opensky/shared/utils/async'
import { Player } from '@skyweaver/state-metadata'

import { MessageToWorker } from './StateSharedTypes'
import { onStartBotMatch } from './worker/botWorkerState'
import {
  connectECSToState,
  log,
  sendMessage,
  signalError
} from './worker/common'
import { onFindMatch } from './worker/multiplayerWorkerState'
import {
  onJumpToReplayFrame,
  onLoadReplayState
} from './worker/replayWorkerState'
import { onStartTutorialMatch } from './worker/tutorial'
import { InitMessage } from './worker/types'
import { WorkerState } from './worker/workerState'
import { WorkerOrFakeWorker } from './workerAbstraction'

export default function (worker: WorkerOrFakeWorker) {
  // replace console.error so errors are sent to the main thread.
  // this helps catch errors in rust state.
  if ('console' in worker) {
    const realError = (worker as any).console.error
    ;(worker as any).console.error = (...args: any[]) => {
      if (
        (typeof args[0] === 'string' && args[0].includes('webpack')) ||
        (typeof args[0] === 'object' &&
          'bypassErrorDialog' in args[0] &&
          args[0].bypassErrorDialog)
      ) {
        realError(...args.slice(0))
      } else {
        console.warn('[Worker Error]', ...args)
        signalError(
          worker,
          args.map(arg => JSON.stringify(arg)).join(' '),
          'state'
        )
      }
    }
  }
  worker.addEventListener('message', onInitMessage)

  async function init(worker: WorkerOrFakeWorker, initMessage: InitMessage) {
    log(
      'Initializing',
      initMessage.account,
      initMessage.subkeyPrivateKey,
      initMessage.subkeySignature
    )
    let workerState: WorkerState = { type: 'init' }
    // keep trying to load wasm every 3s for 2 minutes
    const WASM_TIME_MS = 2000 * 60
    const failTimeout = delayPromise(WASM_TIME_MS).then(() => undefined)
    let maybeWasm
    while (!maybeWasm) {
      try {
        maybeWasm = await Promise.race([
          failTimeout,
          import('@skyweaver/state-browser-sys')
        ])
      } catch (err) {
        await delayPromise(3000)
      }
    }
    if (!maybeWasm) {
      sendMessage(worker, {
        type: 'Error',
        level: 'client',
        error:
          'Failed to load game state code. Please check your internet connection and reload.'
      })
      return
    }
    const sw = maybeWasm
    const topLevelAwaitWorkerHack = (maybeWasm as any).__tla
    if (topLevelAwaitWorkerHack) {
      await topLevelAwaitWorkerHack
    }
    sw.install_panic_logger()

    worker.addEventListener(
      'message',
      async ({ data }: { data: MessageToWorker }) => {
        if (data.type !== 'UpdateProgress') {
          log('got message from main thread: ', data)
        }
        try {
          switch (data.type) {
            case 'JoinMatch':
            case 'SpectateMatch':
            case 'StartBotMatch':
            case 'StartTutorialMatch':
            case 'LoadReplay': {
              if (workerState.type !== 'init') {
                log(
                  `Got ${data.type}, ending in-progress game ${workerState.type}`
                )
                // wipe existing state, send wipe to client
                workerState.teardown()
                workerState = { type: 'init' }
                connectECSToState(worker, workerState, sw, 0, undefined, true)
              }
              switch (data.type) {
                case 'JoinMatch':
                case 'SpectateMatch':
                  workerState = onFindMatch(worker, sw, initMessage, data)
                  break
                case 'LoadReplay': {
                  workerState = onLoadReplayState(worker, sw, initMessage, data)
                  break
                }
                case 'StartBotMatch': {
                  workerState = onStartBotMatch(worker, sw, initMessage, data)
                  break
                }
                case 'StartTutorialMatch': {
                  workerState = await onStartTutorialMatch(
                    worker,
                    sw,
                    initMessage,
                    data
                  )
                  break
                }
                default:
                  {
                    const message: never = data
                    console.warn(
                      `[Worker] Got unexpected message from main thread:\n${JSON.stringify(
                        message
                      )}`
                    )
                  }
                  break
              }
              sendMessage(worker, {
                type: 'Ok',
                key: data.key
              })
              break
            }
            case 'Dispatch':
              {
                switch (workerState.type) {
                  case 'init':
                    throw new Error(
                      'Action dispatched, but no game is running.'
                    )
                  case 'bot': {
                    const state = workerState.bot.state
                    if (!state) {
                      throw new Error(
                        'Action dispatched, but state is undefined.'
                      )
                    }
                    console.log('Dispatching action', data.action)

                    const player = (1 - workerState.bot.playerId) as Player
                    const validatePlayerAction =
                      workerState.customValidators?.validatePlayerAction ??
                      sw.validatePlayerAction

                    const validateResult = validatePlayerAction(
                      state.state,
                      player,
                      data.action,
                      workerState.bot.secret(player)
                    )

                    workerState.bot.apply(player, data.action)
                    workerState?.customValidators?.afterActionApplied?.(
                      state.state,
                      player,
                      data.action,
                      workerState.bot.secret(player),
                      validateResult
                    )
                    sendMessage(worker, {
                      type: 'Ok',
                      key: data.key
                    })
                    break
                  }
                  // @ts-ignore -- fallthrough
                  case 'multiplayer':
                    if (data.action.type === 'Concede') {
                      workerState.didConcede = true
                    } else if (data.action.type === 'CommitCardSelection') {
                      workerState.queuedCardSelection = data.action
                    }
                  // eslint-disable-next-line no-fallthrough
                  case 'replay': {
                    const store = workerState.store
                    if (!store) {
                      throw new Error(
                        'Action dispatched, but store is undefined.'
                      )
                    }
                    console.log('Dispatching action', data.action)

                    const player = store.player!
                    const validatePlayerAction = sw.validatePlayerAction

                    validatePlayerAction(
                      store.state,
                      player,
                      data.action,
                      store.secret(player)
                    )

                    store.dispatch(data.action)
                    sendMessage(worker, {
                      type: 'Ok',
                      key: data.key
                    })
                    break
                  }
                }
              }
              break

            case 'JumpToReplayFrame':
              {
                if (workerState.type !== 'replay') {
                  throw new Error(
                    `Can't set replay frame in mode ${workerState.type}`
                  )
                }
                onJumpToReplayFrame(
                  worker,
                  workerState,
                  sw,
                  data.frame,
                  data.jumpOrPlay
                )
                sendMessage(worker, {
                  type: 'Ok',
                  key: data.key
                })
              }
              break

            case 'Simulate': {
              switch (workerState.type) {
                case 'init':
                  throw new Error('Simulate called, but no game is running.')
                case 'bot': {
                  const state = workerState.bot.state
                  if (!state) {
                    throw new Error('Simulate called, but state is undefined.')
                  } else if (data.moveCount !== state.state.state.moveCount) {
                    throw new Error('Simulate called, but state has changed')
                  }
                  const player = (1 - workerState.bot.playerId) as Player
                  // Simulations in bot games should only use the player's secret,
                  // to match pvp games.
                  const secretsToUseInSimulate = [
                    data.player === 0,
                    data.player === 1
                  ] as const
                  sendMessage(worker, {
                    key: data.key,
                    type: 'Simulation',
                    baseState: state.state,
                    baseSecret: workerState.bot.secret(player),
                    log: workerState.bot.simulate(
                      data.player,
                      data.action,
                      secretsToUseInSimulate
                    )
                  })
                  break
                }
                case 'multiplayer': {
                  const store = workerState.store
                  if (!store) {
                    throw new Error('Simulate called, but store is undefined.')
                  }
                  const player = store.player!

                  sendMessage(worker, {
                    key: data.key,
                    type: 'Simulation',
                    baseState: store.state,
                    baseSecret: store.secret(player),
                    log: store.simulate(data.player, data.action, [true, true])
                  })
                  break
                }
                case 'replay':
                  throw new Error(
                    "Simulate called, but we're running a replay."
                  )
              }
              break
            }
            case 'SerializeBotGame': {
              switch (workerState.type) {
                case 'init':
                case 'multiplayer':
                  throw new Error(
                    `Can only serialize games in bot or replay mode, but mode is ${workerState.type}`
                  )
                case 'bot': {
                  const { state } = workerState.bot
                  sendMessage(worker, {
                    type: 'SaveSerializedGame',
                    key: data.key,
                    game: {
                      secrets: [
                        workerState.bot.secret(0),
                        workerState.bot.secret(1)
                      ],
                      state: state.state,
                      difficulty: workerState.bot.options.difficulty
                    },
                    version: sw.getVersion(),
                    quest: workerState.quest?.record
                  })
                  break
                }
                case 'replay': {
                  const { store } = workerState
                  sendMessage(worker, {
                    type: 'SaveSerializedGame',
                    key: data.key,
                    game: {
                      secrets: [store.secret(0), store.secret(1)],
                      state: store.state
                    },
                    version: sw.getVersion()
                  })
                  break
                }
              }
              break
            }

            case 'ConnectECSToState': {
              switch (workerState.type) {
                case 'init':
                  throw new Error(
                    'ConnectECSToState called, but no game is running.'
                  )
                case 'bot': {
                  const state = workerState.bot.state
                  if (!state) {
                    throw new Error(
                      `ConnectECSToState called in game type ${workerState.type} but state is not initialized`
                    )
                  }
                  connectECSToState(
                    worker,
                    workerState,
                    sw,
                    workerState.player,
                    workerState.bot.rawState
                  )
                  sendMessage(worker, {
                    type: 'Ok',
                    key: data.key
                  })
                  break
                }
                case 'multiplayer': {
                  const store = workerState.store
                  if (!store) {
                    throw new Error(
                      `ConnectECSToState called in game type ${workerState.type} but store is not initialized`
                    )
                  }
                  connectECSToState(
                    worker,
                    workerState,
                    sw,
                    workerState.player,
                    store
                  )
                  sendMessage(worker, {
                    type: 'Ok',
                    key: data.key
                  })
                  break
                }
                case 'replay': {
                  const store = workerState.store
                  if (!store) {
                    throw new Error(
                      `ConnectECSToState called in game type ${workerState.type} but store is not initialized`
                    )
                  }
                  connectECSToState(
                    worker,
                    workerState,
                    sw,
                    workerState.localPlayer,
                    store
                  )
                  sendMessage(worker, {
                    type: 'Ok',
                    key: data.key
                  })
                  break
                }
              }
              break
            }
            case 'ForceReconnect': {
              if (workerState.type !== 'multiplayer') {
                throw new Error(
                  `ForceReconnect called in game type ${workerState.type}, but it's only valid in multiplayer.`
                )
              }
              const ws = workerState.ws
              ws.close(ws.conn)
              sendMessage(worker, {
                type: 'Ok',
                key: data.key
              })
              break
            }

            case 'Init':
              throw new Error('Got two init messages!')

            case 'UpdateProgress':
              if (workerState.type === 'multiplayer') {
                workerState.ws.initLoadingProgress = Math.max(
                  workerState.ws.initLoadingProgress,
                  data.progress
                )
                workerState.ws.send({
                  type: 'player_loading_progress',
                  progress: data.progress
                })
              }
              sendMessage(worker, {
                type: 'Ok',
                key: data.key
              })
              break

            case 'SyncTutorial':
              if (workerState.type === 'bot' && workerState.tutorial) {
                const { tutorial } = workerState

                // Sync tutorial and trigger state change if tutorial is out of sync
                if (
                  data.turnCount !== tutorial.turnCount ||
                  data.stepIdx !== tutorial.stepIdx
                ) {
                  tutorial.sync(data)
                }
                workerState.bot.onStateChange(workerState.bot.state.state, [
                  workerState.bot.secret(0),
                  workerState.bot.secret(1)
                ])
              }
              sendMessage(worker, {
                type: 'Ok',
                key: data.key
              })
              break

            case 'Emote':
              switch (workerState.type) {
                case 'init':
                case 'replay':
                  console.error('Got emote in mode', workerState.type)
                  break
                case 'multiplayer':
                  if ('emote' in data) {
                    workerState.ws.send({
                      type: 'emote',
                      emote: data.emote
                    })
                  } else if ('chat' in data) {
                    workerState.ws.send({
                      type: 'emote',
                      chat: data.chat
                    })
                  } else if ('sticker' in data) {
                    workerState.ws.send({
                      type: 'emote',
                      sticker: data.sticker
                    })
                  }
                  sendMessage(worker, {
                    type: 'Ok',
                    key: data.key
                  })
                  break
                case 'bot': {
                  // Bot should say GG back :)
                  const fromPlayer = workerState.bot.playerId
                  try {
                    if (
                      workerState.bot.state.state.state.status.type ===
                        'GameOver' &&
                      'emote' in data &&
                      data.emote === 'gg'
                    ) {
                      setTimeout(() => {
                        sendMessage(worker, {
                          type: 'Emote',
                          emote: 'gg',
                          fromPlayer
                        })
                      }, 800)
                    } else if ('sticker' in data) {
                      setTimeout(() => {
                        sendMessage(worker, {
                          type: 'Emote',
                          sticker: data.sticker,
                          fromPlayer
                        })
                      }, 800)
                    }
                  } catch {
                    // fine to have an err in responding to stickers
                  }
                  sendMessage(worker, {
                    type: 'Ok',
                    key: data.key
                  })
                  break
                }
                default: {
                  const state: never = workerState
                  console.warn('Unknown worker state type', state)
                  break
                }
              }
              break

            case 'SetEnemyMuted': {
              switch (workerState.type) {
                case 'init':
                case 'replay':
                  console.error('Got Enemy Mute in mode', workerState.type)
                  break
                case 'multiplayer':
                  workerState.ws.send({
                    type: 'mute_opponent',
                    muted: data.muted
                  })
                  break
                case 'bot':
                  break
                default: {
                  const state: never = workerState
                  console.warn('Unknown worker state type', state)
                  break
                }
              }
              break
            }
            default: {
              const message: never = data
              console.warn(
                `[Worker] Got unexpected message from main thread:\n${JSON.stringify(
                  message
                )}`
              )
            }
          }
        } catch (err) {
          signalError(
            worker,
            {
              message: data,
              error: err
            },
            'user',
            data.key
          )
        }
      }
    )
  }
  ///////////////////////////////////////////////////////

  function onInitMessage(ev: { data: MessageToWorker }) {
    log('got message from main thread: ', ev.data)
    if (ev.data.type === 'Init') {
      const msg = ev.data
      init(worker, msg).then(() => {
        // Respond to init request, so promises resolve
        log('Ready for root message.')
        sendMessage(worker, {
          type: 'Ok',
          key: msg.key
        })
      })
    }
    worker.removeEventListener('message', onInitMessage)
  }
}
