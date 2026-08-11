import * as StateBindings from '@skyweaver/state-browser-sys'
import stateWasmModule from '@skyweaver/state-browser-sys/bindings_bg.wasm'

type WorkersStateBindings = typeof StateBindings & {
  __wbg_set_wasm(exports: WebAssembly.Exports): void
}

const workersStateBindings = StateBindings as WorkersStateBindings
let stateWasmInstance: WebAssembly.Instance | undefined

const initializeStateWasm = () => {
  if (stateWasmInstance) return
  stateWasmInstance = new WebAssembly.Instance(stateWasmModule, {
    './bindings_bg.js': workersStateBindings
  })
  workersStateBindings.__wbg_set_wasm(stateWasmInstance.exports)
}

const GAME_PARAMS = {
  season: 126,
  skipFirstTurnStart: false,
  fillDecksToPrismSize: true,
  maxBoardUnits: 7,
  maxHandSize: 9,
  maxTurnCount: 60,
  maxManaCrystals: 255,
  cheatsAllowed: true,
  skipMulligan: true,
  cardWhitelist: undefined,
  singlePrismDeckSize: 30,
  dualPrismDeckSize: 25,
  rigDeckOrder: false,
  allowBeyondDeckDrawOutsidePrisms: false,
  krampusMode: false,
  tavernMode: undefined,
  randomDeckOdds: undefined,
  playerParams: [
    {
      field: [],
      graveyard: [],
      mulliganChoiceSize: 4,
      mulliganPoolSize: 7,
      heroModifiers: [],
      heroSpell: undefined,
      cardsAddedToHandAfterMulligan: [],
      startingMana: 1,
      skipFirstDraw: true,
      deck: []
    },
    {
      field: [],
      graveyard: [],
      mulliganChoiceSize: 4,
      mulliganPoolSize: 7,
      heroModifiers: [],
      heroSpell: undefined,
      cardsAddedToHandAfterMulligan: [['20017', []]],
      startingMana: 0,
      skipFirstDraw: false,
      deck: []
    }
  ]
} as const

const randomSeed = (value: number) => Array.from({ length: 16 }, () => value)

const createSecret = (player: 0 | 1, seed: number) => [
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
      originalDeck: [],
      filledDeckInstances: [],
      singletonCardsPosessed: [],
      cardsAboutToBeDrawn: [],
      cardRarities: new Map(),
      secretEarlyTriggers: [],
      cardSelectionState: undefined
    },
    deferredLogs: [],
    deferredLocations: []
  },
  randomSeed(seed)
]

const deterministicRandom = (length: number) =>
  Array.from({ length }, (_, index) => (index * 17 + 23) & 0xff)

export interface StateRuntimeProbe {
  version: string
  serialized: Uint8Array
  restored: Uint8Array
}

/**
 * Executes the same generated WASM bindings used by the browser game inside
 * the Workers runtime. This is intentionally small enough to run in CI and
 * strict enough to catch incompatible bindings or nondeterministic snapshots.
 */
export const runStateRuntimeProbe = (): StateRuntimeProbe => {
  initializeStateWasm()
  const initialState = workersStateBindings.create_new_skyweaver_game(
    GAME_PARAMS as never,
    { prisms: ['str'], heroAbility: undefined },
    { prisms: ['hrt'], heroAbility: undefined }
  )
  const state = new workersStateBindings.WasmState(
    initialState,
    [createSecret(0, 1), createSecret(1, 2)],
    () => undefined,
    deterministicRandom
  )

  try {
    state.apply(undefined, { type: 'Setup' })
    const serialized = state.serialize()
    const restoredState = workersStateBindings.WasmState.deserialize(
      serialized,
      () => undefined,
      deterministicRandom
    )
    try {
      return {
        version: workersStateBindings.getVersion(),
        serialized,
        restored: restoredState.serialize()
      }
    } finally {
      restoredState.free()
    }
  } finally {
    state.free()
  }
}
