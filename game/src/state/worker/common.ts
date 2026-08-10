import { SubkeyCertification } from '@opensky/shared/game-server-message-types'
import {
  BaseCard,
  Player,
  PlayerSecret,
  Prism,
  PrivateSeed,
  Rarity,
  SkyWeaver
} from '@skyweaver/state-metadata'
import { ethers } from 'ethers'

import { MessageFromWorker } from '../StateSharedTypes'
import { WorkerOrFakeWorker } from '../workerAbstraction'
import { SwWasm, WasmMatch, WasmState, WorkerError } from './types'
import { WorkerState } from './workerState'

export function signMessageSync(
  signer: ethers.utils.SigningKey,
  message: ethers.BytesLike | string
): number[] {
  return Array.from(
    ethers.utils.arrayify(
      ethers.utils.joinSignature(
        signer.signDigest(ethers.utils.hashMessage(message))
      )
    )
  )
}
export function getRandomBytes(randomByteCount: number): number[] {
  return Array.from(crypto.getRandomValues(new Uint8Array(randomByteCount)))
}

export function getNonRandomBytes(randomByteCount: number): number[] {
  return Array.from({ length: randomByteCount }, () => 0x02)
}

// TODO clean up locations we use this function,
// and walk any objects passed in to convert Error types to something serializeable.
// Firefox can't serialize Error objects, and this code only supports 2 specific cases of Errors as keys in passed objects.
export function signalError(
  worker: WorkerOrFakeWorker,
  error: WorkerError,
  level: 'user' | 'server' | 'state',
  key?: string
) {
  const stack = new Error().stack
  sendMessage(worker, {
    type: 'Error',
    error:
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack
          }
        : typeof error === 'string'
        ? {
            name: 'State error',
            message: error,
            stack
          }
        : typeof error === 'object' &&
          'error' in error &&
          'message' in error &&
          error.error instanceof Error
        ? {
            ...error,
            error: {
              name: error.error.name,
              message: error.error.message,
              stack: error.error.stack
            }
          }
        : error,
    level,
    key
  })
}

export function log(...args: any[]) {
  console.log('%c[Worker]', 'color: purple', ...args)
}

function hexToByteArray(hex: string | number[]) {
  return Array.from(ethers.utils.arrayify(hex))
}

function generateRandomSeed(): number[] {
  return Array.from({ length: 16 }, () => Math.floor(Math.random() * 256))
}

export function createPrivateSeed(
  cards: BaseCard[],
  heroAbility: BaseCard | undefined,
  prisms: Prism[],
  subkeyCertification: SubkeyCertification,
  cardRarities?: Map<BaseCard, Rarity>
): PrivateSeed {
  return {
    cards,
    prisms,
    heroAbility,
    randomSeed: generateRandomSeed(),
    cardRarities: cardRarities ?? new Map(),
    ...subkeyCertification
  }
}

export function createCertification(
  address: string,
  subkey: string,
  subkeySignature: string | number[]
): SubkeyCertification {
  return {
    player: hexToByteArray(address),
    subkey: hexToByteArray(subkey),
    signature: hexToByteArray(subkeySignature)
  }
}
export function createSecret(
  player: Player,
  seed: PrivateSeed
): [PlayerSecret<SkyWeaver>, number[]] {
  return [
    {
      player,
      instances: new Map(),
      nextInstance: undefined,
      pointers: [],
      deck: [],
      hand: [],
      dust: [],
      limbo: [],
      cardSelection: [],
      secret: {
        filledDeck: [],
        originalDeck: seed.cards,
        filledDeckInstances: [],
        singletonCardsPosessed: [],
        cardsAboutToBeDrawn: [],
        cardRarities: seed.cardRarities,
        secretEarlyTriggers: [],
        cardSelectionState: undefined
      },
      deferredLogs: [],
      deferredLocations: []
    },
    seed.randomSeed
  ]
}

const DEBUG_SHOULD_DELAY_MESSAGES = false
const DEBUG_MESSAGE_DELAY_MS: number = 100
let debugDelayInterval: NodeJS.Timeout | null = null

const queuedMessages: MessageFromWorker[] = []
export function sendMessage(
  worker: WorkerOrFakeWorker,
  message: MessageFromWorker
) {
  if (DEBUG_SHOULD_DELAY_MESSAGES) {
    // delay debugging tool, each message should have some delay between it
    queuedMessages.push(message)
    if (debugDelayInterval === null) {
      debugDelayInterval = setInterval(() => {
        const nextMessage = queuedMessages.shift()
        if (nextMessage) {
          worker.postMessage(nextMessage)
        }
      }, DEBUG_MESSAGE_DELAY_MS)
    }
    return
  }
  worker.postMessage(message)
}

export function connectECSToState(
  worker: WorkerOrFakeWorker,
  workerState: WorkerState,
  sw: SwWasm,
  player: Player,
  wasm: WasmMatch | WasmState | undefined,
  isGameStart: boolean = false
) {
  try {
    console.log('Trying to reconnect ECS to state for player', player)
    const state = wasm!.state
    let secret
    try {
      secret = wasm!.secret(player)
    } catch {
      // no secret, we're in spectate probably.
    }
    const getValidActions =
      workerState.type === 'replay'
        ? () => []
        : workerState.type === 'bot' && workerState.customValidators
        ? workerState.customValidators?.getValidActions
        : sw.getValidActions
    sendMessage(worker, {
      type: 'Reconnected',
      state: { state, secret },
      validActions: secret ? getValidActions(state, player, secret) : [],
      undraggableIDs: secret
        ? sw.getUndraggableIDs(state, player, secret)
        : new Map(),
      isGameStart
    })
  } catch (err) {
    sendMessage(worker, {
      type: 'Reconnected',
      state: null,
      validActions: [],
      undraggableIDs: new Map(),
      isGameStart
    })
    console.warn(err)
    console.log(
      `ECS Reconnect done, but we're in a pending state, so sending main thread a null state and waiting for more messages.`
    )
  }
}
