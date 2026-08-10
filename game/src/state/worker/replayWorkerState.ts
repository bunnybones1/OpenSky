import { EmoteMessage } from '@opensky/shared/game-server-message-types'
import {
  CardEvent,
  GameState,
  Player,
  PlayerSecret,
  SkyWeaver
} from '@skyweaver/state-metadata'
import { ethers } from 'ethers'

import { MessageEmote, MessageLoadReplay } from '../StateSharedTypes'
import { WorkerOrFakeWorker } from '../workerAbstraction'
import { connectECSToState, log, sendMessage } from './common'
import { InitMessage, SwWasm, WasmMatch } from './types'
export interface ReplayWorkerState {
  isFastForwarding: boolean
  type: 'replay'
  store: WasmMatch
  matchID: number
  localPlayer: Player
  diffs: Array<Array<string> | EmoteMessage>
  setupData: {
    ready: (
      state: GameState<SkyWeaver>,
      p1secret: PlayerSecret<SkyWeaver>,
      p2secret: PlayerSecret<SkyWeaver>
    ) => void
    sign: (messageToSign: ethers.BytesLike) => void
    send: (messageToSend: Uint8Array) => void
    message: (target: Player | undefined, event: CardEvent<SkyWeaver>) => void
    random: (randomByteCount: number) => void
  }
  /// map of diff indicies -> serialized states for quick loading
  replayCache: Map<number, Uint8Array | null>

  lastAppliedDiffIndex: number

  teardown: () => void
}

export function onLoadReplayState(
  worker: WorkerOrFakeWorker,
  sw: SwWasm,
  initMessage: InitMessage,
  data: MessageLoadReplay
): ReplayWorkerState {
  log('Loading replay', data)

  sendMessage(worker, {
    type: 'SetClientAccountID',
    player: data.localPlayer
  })

  const accounts = data.players.map(p => p.account) as [
    (typeof data.players)[number]['account'],
    (typeof data.players)[number]['account']
  ]

  sendMessage(worker, {
    type: 'AccountInfo',
    accounts
  })

  const ready = (
    state: GameState<SkyWeaver>,
    p1secret: PlayerSecret<SkyWeaver>,
    p2secret: PlayerSecret<SkyWeaver>
  ) => {
    if (!workerState.isFastForwarding) {
      setTimeout(() => {
        sendMessage(worker, {
          type: 'StateChange',
          state: {
            state,
            secret: data.localPlayer === 0 ? p1secret : p2secret
          },
          validActions: [],
          undraggableIDs: new Map()
        })
      }, 1)
    }
  }
  const sign = (messageToSign: ethers.BytesLike) => {
    console.warn('sign called in replay mode', messageToSign)
    return
  }
  const send = (messageToSend: Uint8Array) => {
    console.warn('send called in replay mode', messageToSend)
  }
  const message = (target: Player | undefined, event: CardEvent<SkyWeaver>) => {
    if (workerState.type === 'replay' && !workerState.isFastForwarding) {
      sendMessage(worker, { type: 'CardEvent', event })
    }
  }
  const random = (randomByteCount: number) => {
    console.warn('random called in replay mode', randomByteCount)
  }

  const store = new sw.WasmMatch(
    undefined,
    ethers.utils.arrayify(data.rootMessage),
    data.players.map(player => player.secret),
    true,
    () => {
      // never called unless we flush
    },
    sign,
    send,
    message,
    random
  )
  const replayCache = new Map()

  replayCache.set(-1, store.serialize(3))

  const workerState: ReplayWorkerState = {
    type: 'replay',
    store,
    teardown: () => {
      console.log('Tearing down replay!')
      store.free()
    },
    matchID: data.matchID || Math.random(),
    replayCache,
    localPlayer: data.localPlayer,
    lastAppliedDiffIndex: -1,
    isFastForwarding: false,
    diffs: data.diffs,
    setupData: {
      ready,
      sign,
      send,
      message,
      random
    }
  }
  return workerState
}

export function onJumpToReplayFrame(
  worker: WorkerOrFakeWorker,
  workerState: ReplayWorkerState,
  sw: SwWasm,
  frame: number,
  playOrJump: 'play' | 'jump'
) {
  function applySingleReplayFrame() {
    if (workerState.type !== 'replay') {
      throw new Error(`Can't set replay frame in mode ${workerState.type}`)
    }
    const nextDiffIndex = workerState.lastAppliedDiffIndex + 1
    const nextDiff = workerState.diffs[nextDiffIndex]
    if ('type' in nextDiff) {
      if (!workerState.isFastForwarding) {
        const emote: MessageEmote = {
          ...nextDiff,
          type: 'Emote',
          fromPlayer: nextDiff.fromPlayer ?? 0
        }
        sendMessage(worker, emote)
      }
    } else {
      for (const diff of nextDiff) {
        workerState.store.raw_apply(ethers.utils.arrayify(diff))
        try {
          // never called unless we flush, so we call it manually.
          workerState.setupData.ready(
            workerState.store.state,
            workerState.store.secret(0),
            workerState.store.secret(1)
          )
        } catch {
          // no state, np.
        }
        if (!workerState.replayCache.has(nextDiffIndex)) {
          try {
            workerState.replayCache.set(
              nextDiffIndex,
              workerState.store.serialize(3)
            )
          } catch {
            // failed beause unserializable, np.
            workerState.replayCache.set(nextDiffIndex, null)
          }
        }
      }
    }
    workerState.lastAppliedDiffIndex = nextDiffIndex
  }
  if (frame === workerState.lastAppliedDiffIndex) {
    return // :)
  }

  console.log('[replay]', playOrJump, 'ing to frame', frame)

  const isBackInTime = frame < workerState.lastAppliedDiffIndex
  if (isBackInTime && playOrJump === 'play') {
    throw new Error("Can't play replay back in time..")
  }
  const isJumping = playOrJump === 'jump'

  // If we're playing forward...
  if (!isJumping) {
    while (workerState.lastAppliedDiffIndex < frame) {
      applySingleReplayFrame()
    }
    return
  }

  // At this point, we're jumping.
  const highestKeyBeforeFrame = Math.max(
    ...[...workerState.replayCache.entries()]
      .filter(([key, value]) => value && key < frame)
      .map(([k]) => k)
  )
  const startingState = workerState.replayCache.get(highestKeyBeforeFrame)!
  workerState.teardown()
  const store = sw.WasmMatch.deserialize(
    startingState,
    true,
    () => {
      // never called unless we flush
    },
    workerState.setupData.sign,
    workerState.setupData.send,
    workerState.setupData.message,
    workerState.setupData.random
  )
  workerState.lastAppliedDiffIndex = highestKeyBeforeFrame
  workerState.store = store
  workerState.teardown = () => {
    store.free()
  }

  // Skip animations until we're done
  workerState.isFastForwarding = true

  while (workerState.lastAppliedDiffIndex < frame) {
    applySingleReplayFrame()
  }

  try {
    // Reset state client-side
    console.log('RESETTING STATE CLIENTSIDE')
    connectECSToState(
      worker,
      workerState,
      sw,
      workerState.localPlayer,
      workerState.store,
      false
    )
  } catch (err) {
    // failed to send to client, no prob.
  }
  // Stop skipping animations
  workerState.isFastForwarding = false
}
