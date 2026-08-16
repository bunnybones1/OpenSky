import { WasmMatchBotOpponent } from '@opensky/bot'
import { GameMode } from '@opensky/proto'
import { PlayerQuestManager, PlayerQuestRuntimeState } from '@opensky/quests'
import {
  DECKCLASS_HEROES,
  DUAL_PRISM_DECK_SIZE,
  SINGLE_PRISM_DECK_SIZE
} from '@opensky/shared/constants'
import { prismsToDeckClass } from '@opensky/shared/helpers'
import { MatchStartPlayerInfo } from '@opensky/shared/matchmaker-message-types'
import * as StateBindings from '@skyweaver/state-browser-sys'
import stateWasmModule from '@skyweaver/state-browser-sys/bindings_bg.wasm'
import {
  BaseCard,
  CardEvent,
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
import {
  createOwnerSigner,
  ethereumAddressForPrivateKey
} from './signing'

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
  cards: seed.cards.filter(card => CardLibrary.has(card)),
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
  participants?: [MatchStartPlayerInfo, MatchStartPlayerInfo]
  questRuntimeState?: MatchQuestRuntimeState
}

export interface MatchQuestRuntimeState {
  players: [
    PlayerQuestRuntimeState | undefined,
    PlayerQuestRuntimeState | undefined
  ]
}

export interface RuntimeStateInfo {
  hasState: boolean
  pendingPlayer?: number
  turnCount?: number
  moveCount?: number
  currentPlayer?: Player
  statusType?: string
  winner?: Player
  lastActionPlayer?: Player
  lastActionType?: string
  playersDoneCardSelection?: [boolean, boolean]
}

interface RuntimeCapture {
  diffs: string[]
  playerMoveDeltas: [number, number]
  lastActionPlayer?: Player
  lastActionType?: string
}

// server/src/worker/match/Match.ts counts only these two player actions in the
// source MatchEndRequest player1Moves/player2Moves fields.
export const isCountedPlayerMove = (actionType: string): boolean =>
  actionType === 'Attack' || actionType === 'PlayCard'

const emptyRuntimeCapture = (): RuntimeCapture => ({
  diffs: [],
  playerMoveDeltas: [0, 0]
})

export interface BotPolicyState {
  actionCount: number
  playedManaVial: boolean
}

export interface BotActionResult {
  diffs: string[]
  policy: BotPolicyState
}

export interface ReplayInitialization {
  rootProof: string
  secrets: [
    [PlayerSecret<SkyWeaver>, number[]],
    [PlayerSecret<SkyWeaver>, number[]]
  ]
}

export class AuthoritativeMatchRuntime {
  private readonly ownerSign: (message: string) => number[]

  private constructor(
    private readonly store: StateBindings.WasmMatch,
    ownerPrivateKey: string,
    private readonly emitted: RuntimeCapture,
    private readonly questManagers: PlayerQuestManager[],
    private readonly replayInitialization?: ReplayInitialization
  ) {
    this.ownerSign = createOwnerSigner(ownerPrivateKey)
  }

  private static questManagers(
    participants?: [MatchStartPlayerInfo, MatchStartPlayerInfo]
  ) {
    if (!participants) return []
    const gameMode =
      participants[0].gameMode === participants[1].gameMode
        ? participants[0].gameMode
        : GameMode.UNKNOWN
    return participants.map(
      (participant, player) =>
        new PlayerQuestManager({
          deck: participant.privateSeed.cards,
          gameMode,
          hero: DECKCLASS_HEROES[
            prismsToDeckClass(participant.privateSeed.prisms)
          ],
          player: player as Player,
          quests: participant.quests
        })
    )
  }

  private static stateCallback(questManagers: PlayerQuestManager[]) {
    return (
      matchState: GameState<SkyWeaver>,
      ...secrets: [PlayerSecret<SkyWeaver>, PlayerSecret<SkyWeaver>]
    ) => {
      for (const manager of questManagers) {
        manager.onStateUpdated(
          matchState,
          secrets[manager.player],
          secrets[(1 - manager.player) as Player]
        )
      }
    }
  }

  private static eventCallback(
    questManagers: PlayerQuestManager[],
    emitted: RuntimeCapture
  ) {
    return (_target: Player | undefined, event: CardEvent<SkyWeaver>) => {
      if (
        event.type === 'GameEvent' &&
        event.payload.event.type === 'EnterPlayerAction'
      ) {
        const [player, action] = event.payload.event.payload
        emitted.lastActionPlayer = player
        emitted.lastActionType = action.type
        if (player !== undefined && isCountedPlayerMove(action.type)) {
          emitted.playerMoveDeltas[player] += 1
        }
      }
      for (const manager of questManagers) manager.onProcessEvent(event)
    }
  }

  static create(init: AuthoritativeMatchInit) {
    initializeStateWasm()
    const ownerSign = createOwnerSigner(init.ownerPrivateKey)
    const player1Seed = normalizePrivateSeed(init.player1Seed)
    const player2Seed = normalizePrivateSeed(init.player2Seed)
    const questManagers = this.questManagers(init.participants)
    const root = bindings.create_skyweaver_root_proof(
      ownerSign,
      [...numberToInt64Bytes(init.matchId)],
      createGameParams(init.season, init.heroRarities),
      player1Seed,
      player2Seed
    )
    const emitted = emptyRuntimeCapture()
    const storeSecrets = [
      createSecret(player1Seed, 0),
      createSecret(player2Seed, 1)
    ] as ReplayInitialization['secrets']
    const replaySecrets = [
      createSecret(player1Seed, 0),
      createSecret(player2Seed, 1)
    ] as ReplayInitialization['secrets']
    const store = new bindings.WasmMatch(
      undefined,
      root,
      storeSecrets,
      false,
      this.stateCallback(questManagers),
      ownerSign,
      (diff: Uint8Array) => emitted.diffs.push(bytesToHex(diff)),
      this.eventCallback(questManagers, emitted),
      secureRandom
    )
    for (const [player, manager] of questManagers.entries()) {
      manager.restoreRuntimeState(init.questRuntimeState?.players[player])
    }
    const runtime = new AuthoritativeMatchRuntime(
      store,
      init.ownerPrivateKey,
      emitted,
      questManagers,
      { rootProof: bytesToHex(root), secrets: replaySecrets }
    )
    store.flush()
    return runtime
  }

  static restore(
    snapshot: Uint8Array,
    ownerPrivateKey: string,
    participants?: [MatchStartPlayerInfo, MatchStartPlayerInfo],
    questRuntimeState?: MatchQuestRuntimeState
  ) {
    initializeStateWasm()
    const ownerSign = createOwnerSigner(ownerPrivateKey)
    const emitted = emptyRuntimeCapture()
    const questManagers = this.questManagers(participants)
    const store = bindings.WasmMatch.deserialize(
      snapshot,
      false,
      this.stateCallback(questManagers),
      ownerSign,
      (diff: Uint8Array) => emitted.diffs.push(bytesToHex(diff)),
      this.eventCallback(questManagers, emitted),
      secureRandom
    )
    for (const [player, manager] of questManagers.entries()) {
      manager.restoreRuntimeState(questRuntimeState?.players[player])
    }
    if (store.hasState()) {
      const state = store.state as GameState<SkyWeaver>
      for (const manager of questManagers) {
        manager.onStateUpdated(
          state,
          store.secret(manager.player) as PlayerSecret<SkyWeaver>,
          store.secret(
            (1 - manager.player) as Player
          ) as PlayerSecret<SkyWeaver>
        )
      }
    }
    return new AuthoritativeMatchRuntime(
      store,
      ownerPrivateKey,
      emitted,
      questManagers
    )
  }

  serialize(secretKnowledge: 0 | 1 | 2 | 3) {
    return this.store.serialize(secretKnowledge)
  }

  initialReplayState() {
    if (!this.replayInitialization) {
      throw new Error('replay initialization is unavailable after restore')
    }
    return this.replayInitialization
  }

  snapshot() {
    return this.serialize(3)
  }

  questRuntimeState(): MatchQuestRuntimeState {
    return {
      players: [
        this.questManagers[0]?.snapshotRuntimeState(),
        this.questManagers[1]?.snapshotRuntimeState()
      ]
    }
  }

  questProgress(): [Record<number, number>, Record<number, number>] {
    return [
      this.questManagers[0]?.getProgressThisMatch() ?? {},
      this.questManagers[1]?.getProgressThisMatch() ?? {}
    ]
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
      winner: status?.type === 'GameOver' ? status.winner : undefined,
      lastActionPlayer: this.emitted.lastActionPlayer,
      lastActionType: this.emitted.lastActionType,
      playersDoneCardSelection: game
        ? [game.players[0].doneCardSelection, game.players[1].doneCardSelection]
        : undefined
    }
  }

  async createBotAction(
    player: Player,
    botPrivateKey: string,
    botSubkey: string,
    difficulty: number,
    policy: BotPolicyState
  ): Promise<BotActionResult> {
    const snapshot = this.serialize((player + 1) as 1 | 2)
    const sign = createOwnerSigner(botPrivateKey)
    const diffs: string[] = []
    const botStore = bindings.WasmMatch.deserialize(
      snapshot,
      false,
      () => undefined,
      sign,
      (diff: Uint8Array) => diffs.push(bytesToHex(diff)),
      () => undefined,
      secureRandom
    )
    try {
      if (ethereumAddressForPrivateKey(botPrivateKey) !== botSubkey.toLowerCase()) {
        throw new Error('bot private key does not match its approved subkey')
      }
      if (botStore.getAddressPlayer(botSubkey) !== player) {
        throw new Error('bot subkey is not approved for its player')
      }
      if (!botStore.hasState()) return { diffs, policy }
      const bot = new WasmMatchBotOpponent<void>(
        player,
        () => [
          botStore,
          bindings.getValidActions,
          bindings.validatePlayerAction,
          CardLibrary,
          () => undefined
        ],
        {
          difficulty: Math.max(0, Math.min(1, difficulty)),
          dispatchEvenIfSuperceded: false,
          waitBetweenMoves: false,
          logger: () => undefined
        }
      )
      bot.thisTurn = {
        actionCount: Math.max(0, Math.floor(policy.actionCount)),
        playedManaVial: policy.playedManaVial === true
      }
      await bot.handleStateChange(
        botStore.state as GameState<SkyWeaver>,
        botStore.secret(player) as PlayerSecret<SkyWeaver>
      )
      return {
        diffs,
        policy: {
          actionCount: bot.thisTurn.actionCount,
          playedManaVial: bot.thisTurn.playedManaVial
        }
      }
    } finally {
      botStore.free()
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
        bytesToHex(
          this.ownerSign(bindings.WasmMatch.getApproval(player, subkey))
        )
      )
    })
  }

  applyClientDiffs(diffs: string[]) {
    const emitted = this.captureDiffs(() => {
      for (const diff of diffs) this.store.apply(hexToBytes(diff))
    })
    return {
      opponentDiffs: [...diffs, ...emitted],
      senderDiffs: emitted,
      playerMoveDeltas: [...this.emitted.playerMoveDeltas] as [number, number]
    }
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
    this.emitted.playerMoveDeltas = [0, 0]
    this.emitted.lastActionPlayer = undefined
    this.emitted.lastActionType = undefined
    action()
    return [...this.emitted.diffs]
  }
}
