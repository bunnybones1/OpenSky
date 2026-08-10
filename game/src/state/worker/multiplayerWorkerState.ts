import { GameMode } from '@opensky/proto'
import { MATCHMAKER_MATCH_INFO_ENDPOINT } from '@opensky/shared/constants'
import { PlayerMatchInfo } from '@opensky/shared/matchmaker-message-types'
import {
  CardEvent,
  FindByTag,
  GameState,
  Player,
  PlayerAction,
  PlayerSecret,
  SkyWeaver
} from '@skyweaver/state-metadata'
import { ethers } from 'ethers'

import {
  ConnectionStatus,
  Message,
  WebSocketClient
} from '../net/WebSocketClient'
import {
  MessageEmote,
  MessageJoinMatch,
  MessageSpectateMatch
} from '../StateSharedTypes'
import { WorkerOrFakeWorker } from '../workerAbstraction'
import {
  connectECSToState,
  createCertification,
  getRandomBytes,
  log,
  sendMessage,
  signalError,
  signMessageSync
} from './common'
import { InitMessage, SwWasm, WasmMatch } from './types'

export interface MultiplayerWorkerState {
  player: Player
  type: 'multiplayer'
  store?: WasmMatch
  didConcede: boolean
  queuedCardSelection?: FindByTag<PlayerAction, { type: 'CommitCardSelection' }>
  ws: WebSocketClient
  teardown: () => void
}

export function onFindMatch(
  worker: WorkerOrFakeWorker,
  sw: SwWasm,
  initMessage: InitMessage,
  data: MessageJoinMatch | MessageSpectateMatch
): MultiplayerWorkerState {
  const spectateCode = 'spectateCode' in data ? data.spectateCode : undefined
  const search = new URL(initMessage.env.MATCHMAKER_URL)
  const matchInfoURL = new URL(
    `${MATCHMAKER_MATCH_INFO_ENDPOINT}/${
      'spectateCode' in data
        ? data.spectateCode.split('.')[0]
        : initMessage.account.address
    }${search.search}`,
    initMessage.env.MATCHMAKER_URL
  ).href

  if (spectateCode) {
    sendMessage(worker, {
      type: 'WaitingForMatch'
    })
  }

  const requestExtra: { [key: string]: any } = {
    mode: 'cors',
    credentials: 'include',
    headers: {
      Authorization: `BEARER ${data.authToken}`
    }
  }

  const connectMatch = () =>
    fetch(matchInfoURL, requestExtra)
      .then(res => res.json())
      .then((info: PlayerMatchInfo) => {
        switch (info.type) {
          case 'in_progress_match_info':
            if (!info.matchInfo.initialized) {
              // if match is still initializing on server, retry
              setTimeout(() => {
                connectMatch()
              }, 3000)
              break
            }
            ws.connectGameServer(
              `${info.serverInfo.ws}?release=${info.serverInfo.releaseVersion}`,
              data.authToken,
              spectateCode
            )
            break
          case 'recent_match_info': {
            if (spectateCode) {
              sendMessage(worker, {
                type: 'WaitingForMatch',
                oldMatch: {
                  id: info.matchID,
                  player: info.accounts.findIndex(
                    p => p.address.toLowerCase() === info.playerID.toLowerCase()
                  ),
                  mode:
                    info.gameMode === GameMode.RANKED_CONSTRUCTED
                      ? GameMode.RANKED_CONSTRUCTED
                      : GameMode.RANKED_DISCOVERY,
                  replayID: info.replayID
                }
              })
              setTimeout(() => {
                connectMatch()
              }, 3000)

              break
            }
            ws.shouldReconnect = false
            onWebSocketMessage({
              type: 'reconnect',
              accounts: info.accounts,
              isGameStart: false,
              store: info.store,
              turnExpiryTime: Infinity,
              conquestInfo: info.conquestInfo,
              replayID: info.replayID,
              opponentMuted: false,
              gitCommit: process.env.GITCOMMIT || 'dev'
            })
            if (info.rewards) {
              sendMessage(worker, {
                type: 'Rewards',
                rewards: info.rewards
              })
            }
            break
          }
          case 'no_match_found':
            // TODO: not actually an error, how can we avoid confusion in this state?
            // TODO: show a different screen / redirect back to main menu?
            if (spectateCode) {
              sendMessage(worker, {
                type: 'WaitingForMatch'
              })
              setTimeout(() => {
                connectMatch()
              }, 3000)

              break
            }
            signalError(worker, new Error('No match in progress'), 'server')
            break
          case 'error':
            signalError(worker, new Error(info.message), info.level)
            break
          default:
            throw new Error(
              `unknown response type from ${MATCHMAKER_MATCH_INFO_ENDPOINT} endpoint`
            )
        }
      })
      .catch(e => {
        console.error(
          {
            bypassErrorDialog: true
          },
          'Failed to connect to matchmaker:',
          e
        )
        setTimeout(() => {
          connectMatch()
        }, 3000)
      })

  connectMatch()

  let lastSpectateDiff: string = ''

  const subkey = new ethers.utils.SigningKey(initMessage.subkeyPrivateKey)

  function onStateChange(
    player: Player,
    state: GameState<SkyWeaver>,
    secret?: PlayerSecret<SkyWeaver>
  ) {
    setTimeout(() => {
      sendMessage(worker, {
        type: 'StateChange',
        state: {
          state,
          secret
        },
        validActions: secret ? sw.getValidActions(state, player, secret) : [],
        undraggableIDs: secret
          ? sw.getUndraggableIDs(state, player, secret)
          : new Map()
      })
    }, 1)
  }

  const onWebSocketMessage = (msg: Message) => {
    if (workerState.type !== 'multiplayer') {
      signalError(
        worker,
        `Got websocket message while not in multiplayer mode.`,
        'user'
      )
      return
    }
    const currentStore = 'store' in workerState && workerState.store
    switch (msg.type) {
      case 'error':
        if (
          msg.message.includes('diff.proof != self.hash') ||
          msg.message.includes('Failed to apply diff')
        ) {
          console.warn(
            'Player dispatched an invalid action, resetting local state from server'
          )
          ws.close(ws.conn)
        } else if (msg.message.includes('invalid spectate code')) {
          sendMessage(worker, {
            type: 'WaitingForMatch',
            error: 'invalid_code'
          })
          ws.manualDisconnect()
          break
        } else {
          signalError(worker, new Error(msg.message), msg.level)
          if (msg.level === 'state' || msg.level === 'server') {
            ws.manualDisconnect()
          }
        }
        break
      // eslint-disable-next-line no-fallthrough
      case 'gameplay':
        if (!currentStore) {
          signalError(
            worker,
            `Got a gameplay message when we had no store.`,
            'user'
          )
          return
        }
        if (spectateCode) {
          if (lastSpectateDiff === msg.data[msg.data.length - 1]) {
            break
          } else {
            lastSpectateDiff = msg.data[msg.data.length - 1]
          }
        }
        log(`Got gameplay message. Our hash is `, currentStore.hash)

        try {
          for (const diff of msg.data) {
            const d = ethers.utils.arrayify(diff)
            if (spectateCode) {
              currentStore.raw_apply(d)
            } else {
              currentStore.apply(d)
            }
          }
          if (spectateCode) {
            try {
              onStateChange(
                currentStore.player as Player,
                currentStore.state,
                currentStore.player
                  ? currentStore.secret(currentStore.player)
                  : undefined
              )
            } catch {
              // if failed to emit statechange, no problem.
            }
          }
        } catch (err) {
          const message = err.message ? err.message : String(err)
          if (message.includes('diff.proof != self.hash')) {
            console.warn(err)
            console.warn(
              "Our state has diverged from the server's state, reconnecting..."
            )
            ws.shouldReconnect = true
            ws.close(ws.conn) // start a reconnect
          } else if (message.includes('self.seed.is_none()')) {
            console.warn(err)
            console.warn(
              "Can't reveal, because self.seed.is_none(). Waiting for server intervention..."
            )
          } else {
            console.error(
              { bypassErrorDialog: true },
              'Uncaught state exception',
              err
            )
            ws.shouldReconnect = true
            ws.close(ws.conn)
          }
        }
        break
      case 'reconnect': {
        let player: Player
        if (spectateCode) {
          sendMessage(worker, {
            type: 'CheckStateVersion',
            version: msg.gitCommit
          })
          sendMessage(worker, {
            type: 'CheckIslandType',
            isConquest: msg.conquestInfo ? true : false
          })
        }
        const store = sw.WasmMatch.deserialize(
          ethers.utils.arrayify(msg.store),
          false,
          (state: GameState<SkyWeaver>, secret?: PlayerSecret<SkyWeaver>) => {
            onStateChange(player, state, secret)
            if (!spectateCode && workerState.type === 'multiplayer') {
              if (
                workerState.didConcede &&
                state.state.status.type !== 'GameOver'
              ) {
                const concedeAction: PlayerAction = {
                  type: 'Concede'
                }
                setTimeout(() => store.dispatch(concedeAction), 1)
              } else if (
                workerState.queuedCardSelection &&
                !state.state.players[player].doneCardSelection
              ) {
                const cardSelAction = workerState.queuedCardSelection
                setTimeout(() => store.dispatch(cardSelAction), 1)
              }
            }
          },
          (messageToSign: ethers.BytesLike) =>
            signMessageSync(subkey, messageToSign),
          onSend,
          onLog,
          getRandomBytes
        )

        workerState.store = store
        player = (store.player ??
          msg.accounts.findIndex(
            acc =>
              acc.address.toLowerCase() ===
              spectateCode?.split('.')?.[0]?.toLowerCase()
          )) as Player
        if (typeof player !== 'number') {
          throw new Error('Failed to get player index')
        }

        // send client account ID message
        sendMessage(worker, {
          type: 'SetClientAccountID',
          player
        })
        workerState.player = player

        sendMessage(worker, {
          type: 'SetMatchID',
          matchID: parseInt(ethers.utils.hexlify(store.id), 16),
          replayID: msg.replayID
        })
        sendMessage(worker, {
          type: 'GetEnemyMuted',
          muted: msg.opponentMuted
        })

        if (!spectateCode) {
          try {
            store.flush()
          } catch (err) {
            const message = err.message ? err.message : String(err)
            if (message.includes('self.seed.is_none()')) {
              console.warn(err)
              console.warn(
                "Can't reveal, because self.seed.is_none(). Waiting for server intervention..."
              )
            } else if (message.includes('player.is_none()')) {
              console.warn(err)
              console.warn(
                "Can't reveal, because player.is_none(). Waiting for server intervention..."
              )
            } else {
              signalError(
                worker,
                err instanceof Error ? err : new Error(err),
                'state'
              )
              ws.manualDisconnect()
              return
            }
          }
        }

        connectECSToState(
          worker,
          workerState,
          sw,
          player,
          store,
          msg.isGameStart
        )

        sendMessage(worker, {
          type: 'AccountInfo',
          accounts: msg.accounts
        })

        try {
          sendMessage(worker, {
            type: 'TurnTimer',
            endTime: msg.turnExpiryTime - ws.timeOffsetMillis,
            player: store.state.currentPlayer
          })
        } catch {
          // state is pending
        }
        break
      }
      case 'rewards':
        sendMessage(worker, {
          type: 'Rewards',
          rewards: msg.data
        })
        break
      case 'match_ended':
        ws.shouldReconnect = false
        // this is in a try because accessing arbitrary properties on store.state might throw different errors due to WASM bindings weirdness
        // especially if the game state has already been `.free()`d
        try {
          if (
            (workerState.store?.state as GameState<SkyWeaver> | undefined)
              ?.state?.status?.type !== 'GameOver'
          ) {
            // This gets caught right away
            throw new Error('missing game state or not marked as done')
          }
        } catch {
          // if we have no state, or our game isn't marked as done, reconnect to matchmaker to get prev match record
          onFindMatch(worker, sw, initMessage, data)
        }
        break
      case 'find_match':
        signalError(
          worker,
          'Got a find_match from the server... wtf?',
          'server'
        )
        break
      case 'spectate_server':
        signalError(
          worker,
          'Got a spectate_server from the server... wtf?',
          'server'
        )
        break
      case 'turntimer':
        sendMessage(worker, {
          type: 'TurnTimer',
          endTime: msg.turnExpiryTime - ws.timeOffsetMillis,
          player: msg.player
        })
        break
      case 'opponent_loading_progress':
        if (workerState.type === 'multiplayer') {
          sendMessage(worker, {
            type: 'UpdateOpponentProgress',
            progress: msg.progress,
            matchAbandonTime: msg.matchAbandonTime
          })
        }
        break
      case 'emote': {
        if ('sticker' in msg && msg.fromSpectator) {
          const emote: MessageEmote = {
            type: 'Emote',
            fromSpectator: msg.fromSpectator,
            sticker: msg.sticker
          }
          sendMessage(worker, emote)
          break
        }
        const emote: MessageEmote = {
          ...msg,
          type: 'Emote',
          fromPlayer: msg.fromPlayer ?? 0
        }
        sendMessage(worker, emote)
        break
      }
      case 'spectators_list':
        sendMessage(worker, {
          type: 'SpectatorList',
          spectators: msg.spectators
        })
        break
      case 'quest_progress':
        sendMessage(worker, {
          type: 'QuestProgress',
          currProgress: msg.currProgress,
          prevProgress: msg.prevProgress,
          quest: msg.quest,
          endProgress: msg.endProgress
        })
        break
      case 'timesync': // handled in websocket client
      case 'join_server':
      case 'player_loading_progress':
      case 'opponent_connected':
      case 'opponent_disconnected':
      case 'mute_opponent':
        break
      default: {
        // compile-time check for switch exhaustion
        const error: never = msg
        console.error(
          'Worker: Received an unknown event from the websocket server ',
          error
        )
      }
    }
  }

  const subkeyCertification = createCertification(
    initMessage.account.address,
    ethers.utils.computeAddress(subkey.publicKey),
    initMessage.subkeySignature
  )

  const ws = new WebSocketClient(
    onWebSocketMessage,
    newStatus => {
      sendMessage(worker, {
        type: 'NetworkStatus',
        connected: newStatus === ConnectionStatus.OPEN,
        reconnectAttempts: ws.numReconnectAttempts
      })
    },
    subkeyCertification
  )

  const onSend = (messageToSend: Uint8Array) => {
    setTimeout(() => {
      if (spectateCode) {
        return
      }
      const data = ethers.utils.hexlify(messageToSend)
      ws.send({
        type: 'gameplay',
        data: [data]
      })
    }, 1)
  }

  const onLog = (_target: Player | undefined, event: CardEvent<SkyWeaver>) => {
    sendMessage(worker, {
      type: 'CardEvent',
      event
    })
  }

  const sendPingTimer = setInterval(() => {
    sendMessage(worker, {
      type: 'Ping',
      ping: ws.ping
    })
  }, 2000)

  const workerState: MultiplayerWorkerState = {
    type: 'multiplayer',
    ws,
    player: 0,
    didConcede: false,
    teardown: () => {
      if ('store' in workerState && workerState.store) {
        workerState.store.free()
        ws.manualDisconnect()
        clearInterval(sendPingTimer)
      }
    }
  }
  return workerState
}
