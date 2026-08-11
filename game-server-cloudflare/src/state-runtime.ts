import {
  DUAL_PRISM_DECK_SIZE,
  SINGLE_PRISM_DECK_SIZE
} from '@opensky/shared/constants'
import * as StateBindings from '@skyweaver/state-browser-sys'
import stateWasmModule from '@skyweaver/state-browser-sys/bindings_bg.wasm'
import {
  BaseCard,
  CardLibrary,
  GameParams,
  GameState,
  getDiscoveryOdds,
  Modifier,
  Player,
  PlayerSecret,
  PrivateSeed,
  Rarity,
  SkyWeaver
} from '@skyweaver/state-metadata'

import { bytesToHex, hexToBytes, numberToInt64Bytes } from './encoding'
import { createOwnerSigner } from './signing'

type WorkersStateBindings = typeof StateBindings & {
  __wbg_set_wasm(exports: WebAssembly.Exports): void
}

const bindings = StateBindings as WorkersStateBindings
let stateWasmInstance: WebAssembly.Instance | undefined

export const initializeStateWasm = () => {
  if (stateWasmInstance) return
  stateWasmInstance = new WebAssembly.Instance(stateWasmModule, {
    './bindings_bg.js': bindings
  })
  bindings.__wbg_set_wasm(stateWasmInstance.exports)
}

const secureRandom = (length: number) => {
  if (!Number.isInteger(length) || length < 0 || length > 65_536) {
    throw new Error('invalid random byte request')
  }
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return [...bytes]
}

const normalizeCardRarities = (value: unknown): Map<BaseCard, Rarity> => {
  if (value instanceof Map) return value as Map<BaseCard, Rarity>
  if (Array.isArray(value)) return new Map(value as Array<[BaseCard, Rarity]>)
  if (typeof value === 'object' && value !== null) {
    return new Map(Object.entries(value) as Array<[BaseCard, Rarity]>)
  }
  return new Map()
}

export const normalizePrivateSeed = (seed: PrivateSeed): PrivateSeed => ({
  ...seed,
  cards: seed.cards.filter((card) => CardLibrary.has(card)),
  cardRarities: new Map(
    [...normalizeCardRarities(seed.cardRarities).entries()].filter(([card]) =>
      CardLibrary.has(card)
    )
  )
})

const createSecret = (
  seed: PrivateSeed,
  player: Player
): [PlayerSecret<SkyWeaver>, number[]] => [
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

const createGameParams = (
  season: number,
  heroRarities: [Rarity, Rarity]
): GameParams => {
  const firstPlayerBonus: Array<[BaseCard, Array<Modifier>]> = [['20017', []]]
  return {
    season,
    skipFirstTurnStart: false,
    fillDecksToPrismSize: true,
    maxBoardUnits: 7,
    maxHandSize: 9,
    maxTurnCount: 60,
    maxManaCrystals: 255,
    cheatsAllowed: false,
    skipMulligan: false,
    cardWhitelist: undefined,
    singlePrismDeckSize: SINGLE_PRISM_DECK_SIZE,
    dualPrismDeckSize: DUAL_PRISM_DECK_SIZE,
    rigDeckOrder: false,
    allowBeyondDeckDrawOutsidePrisms: false,
    krampusMode: false,
    tavernMode: undefined,
    randomDeckOdds: getDiscoveryOdds(),
    playerParams: [
      {
        deck: [],
        field: [],
        graveyard: [],
        heroModifiers: [{ SetRarity: heroRarities[0] }],
        heroSpell: undefined,
        cardsAddedToHandAfterMulligan: firstPlayerBonus,
        mulliganPoolSize: 7,
        mulliganChoiceSize: 4,
        startingMana: 1,
        skipFirstDraw: false
      },
      {
        deck: [],
        field: [],
        graveyard: [],
        heroModifiers: [{ SetRarity: heroRarities[1] }],
        heroSpell: undefined,
        cardsAddedToHandAfterMulligan: [],
        mulliganPoolSize: 7,
        mulliganChoiceSize: 4,
        startingMana: 1,
        skipFirstDraw: false
      }
    ]
  }
}

export interface AuthoritativeMatchInit {
  matchId: number
  season: number
  player1Seed: PrivateSeed
  player2Seed: PrivateSeed
  heroRarities: [Rarity, Rarity]
  ownerPrivateKey: string
}

export interface RuntimeStateInfo {
  hasState: boolean
  pendingPlayer?: number
  turnCount?: number
  moveCount?: number
  currentPlayer?: Player
  statusType?: string
  winner?: Player
}

export class AuthoritativeMatchRuntime {
  private readonly ownerSign: (message: string) => number[]

  private constructor(
    private readonly store: StateBindings.WasmMatch,
    ownerPrivateKey: string,
    private readonly emitted: { diffs: string[] }
  ) {
    this.ownerSign = createOwnerSigner(ownerPrivateKey)
  }

  static create(init: AuthoritativeMatchInit) {
    initializeStateWasm()
    const ownerSign = createOwnerSigner(init.ownerPrivateKey)
    const player1Seed = normalizePrivateSeed(init.player1Seed)
    const player2Seed = normalizePrivateSeed(init.player2Seed)
    const root = bindings.create_skyweaver_root_proof(
      ownerSign,
      [...numberToInt64Bytes(init.matchId)],
      createGameParams(init.season, init.heroRarities),
      player1Seed,
      player2Seed
    )
    const emitted = { diffs: [] as string[] }
    const store = new bindings.WasmMatch(
      undefined,
      root,
      [createSecret(player1Seed, 0), createSecret(player2Seed, 1)],
      false,
      () => undefined,
      ownerSign,
      (diff: Uint8Array) => emitted.diffs.push(bytesToHex(diff)),
      () => undefined,
      secureRandom
    )
    const runtime = new AuthoritativeMatchRuntime(
      store,
      init.ownerPrivateKey,
      emitted
    )
    store.flush()
    return runtime
  }

  static restore(snapshot: Uint8Array, ownerPrivateKey: string) {
    initializeStateWasm()
    const ownerSign = createOwnerSigner(ownerPrivateKey)
    const emitted = { diffs: [] as string[] }
    const store = bindings.WasmMatch.deserialize(
      snapshot,
      false,
      () => undefined,
      ownerSign,
      (diff: Uint8Array) => emitted.diffs.push(bytesToHex(diff)),
      () => undefined,
      secureRandom
    )
    return new AuthoritativeMatchRuntime(store, ownerPrivateKey, emitted)
  }

  serialize(secretKnowledge: 0 | 1 | 2 | 3) {
    return this.store.serialize(secretKnowledge)
  }

  snapshot() {
    return this.serialize(3)
  }

  stateInfo(): RuntimeStateInfo {
    let state: GameState<SkyWeaver> | undefined
    const hasState = this.store.hasState()
    if (hasState) {
      state = this.store.state as GameState<SkyWeaver> | undefined
    }
    const game = state?.state
    const status = game?.status
    return {
      hasState,
      // `pendingPlayer` intentionally errors once a public state exists.
      pendingPlayer: hasState ? undefined : this.store.pendingPlayer,
      turnCount: game?.turnCount,
      moveCount: game?.moveCount,
      currentPlayer: game?.currentPlayer,
      statusType: status?.type,
      winner: status?.type === 'GameOver' ? status.winner : undefined
    }
  }

  addressPlayer(address: string) {
    return this.store.getAddressPlayer(address)
  }

  approveSubkey(player: string, subkey: string) {
    if (this.store.getAddressPlayer(subkey) !== undefined) return []
    return this.captureDiffs(() => {
      this.store.dispatchApprove(
        player,
        subkey,
        bytesToHex(this.ownerSign(bindings.WasmMatch.getApproval(player, subkey)))
      )
    })
  }

  applyClientDiffs(diffs: string[]) {
    const emitted = this.captureDiffs(() => {
      for (const diff of diffs) this.store.apply(hexToBytes(diff))
    })
    return { opponentDiffs: [...diffs, ...emitted], senderDiffs: emitted }
  }

  dispatchTimeout() {
    return this.captureDiffs(() => {
      this.store.dispatchTimeout()
    })
  }

  dispatchTurnTimeout() {
    return this.captureDiffs(() => {
      this.store.dispatch({ type: 'Timeout' })
    })
  }

  dispatchAbandon(player: Player) {
    return this.captureDiffs(() => {
      this.store.dispatch({ type: 'Abandon', player })
    })
  }

  free() {
    this.store.free()
  }

  private captureDiffs(action: () => void) {
    this.emitted.diffs = []
    action()
    return [...this.emitted.diffs]
  }
}
