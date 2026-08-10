import {
  DUAL_PRISM_DECK_SIZE,
  SINGLE_PRISM_DECK_SIZE
} from '@opensky/shared/constants'
import {
  BaseCard,
  CardEvent,
  Cheat,
  GameParams,
  GameState,
  Player,
  PlayerAction,
  PlayerSecret,
  Rarity,
  SkyWeaver
} from '@skyweaver/state-metadata'
import { create_new_skyweaver_game, WasmState } from '@skyweaver/state-node-sys'
import { PlayerQuestManager } from 'src/playerQuestManager'
import { QuestImplTestPlayer } from 'src/types'

export interface TestGame {
  takeAction: (player: Player | undefined, action: PlayerAction) => void
  state: undefined | GameState<SkyWeaver>
  playerSecret: undefined | PlayerSecret<SkyWeaver>
  enemySecret: undefined | PlayerSecret<SkyWeaver>
  cheat: (cheat: Cheat) => void
}

export function createTestGame(
  qm: PlayerQuestManager,
  players: [QuestImplTestPlayer, QuestImplTestPlayer]
): TestGame {
  const secrets: [
    [PlayerSecret<SkyWeaver>, number[]],
    [PlayerSecret<SkyWeaver>, number[]]
  ] = [
    createSecret(0, {
      cards: players[0].cards,
      randomSeed: generateRandomSeed(),
      cardRarities: new Map()
    }),
    createSecret(1, {
      cards: players[1].cards,
      randomSeed: generateRandomSeed(),
      cardRarities: new Map()
    })
  ]

  const state = create_new_skyweaver_game(
    gameParams,
    {
      prisms: Array.isArray(players[0].prisms)
        ? players[0].prisms
        : [players[0].prisms],
      heroAbility: undefined
    },
    {
      prisms: Array.isArray(players[1].prisms)
        ? players[1].prisms
        : [players[1].prisms],
      heroAbility: undefined
    }
  )

  const s = new WasmState(
    state,
    secrets,
    (target: Player | undefined, event: CardEvent<SkyWeaver>) => {
      qm.onProcessEvent(event)
    },
    (randomByteCount: number) =>
      Array.from({ length: randomByteCount }, () => 0x02)
  )
  // eslint-disable-next-line prefer-spread
  s.apply(undefined, {
    type: 'Setup'
  } satisfies PlayerAction)

  const takeAction = (player: Player | undefined, action: PlayerAction) => {
    console.log('[action]', player, action)
    s.apply(player, action)
    console.log('applied')
    if (s.hasState()) {
      qm.onStateUpdated(
        s.state as GameState<SkyWeaver>,
        s.secret(qm.player) as PlayerSecret<SkyWeaver>,
        s.secret(1 - qm.player) as PlayerSecret<SkyWeaver>
      )
    }
  }
  return {
    takeAction,
    get state() {
      return s.hasState() ? (s.state as GameState<SkyWeaver>) : undefined
    },
    get playerSecret() {
      return s.hasState()
        ? (s.secret(qm.player) as PlayerSecret<SkyWeaver>)
        : undefined
    },
    get enemySecret() {
      return s.hasState()
        ? (s.secret(1 - qm.player) as PlayerSecret<SkyWeaver>)
        : undefined
    },
    cheat(cheat) {
      takeAction((s.state as GameState<SkyWeaver>).state.currentPlayer, {
        type: 'Cheat',
        cheats: [cheat]
      })
    }
  }
}
const gameParams: GameParams = {
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
  singlePrismDeckSize: SINGLE_PRISM_DECK_SIZE,
  dualPrismDeckSize: DUAL_PRISM_DECK_SIZE,
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
}

function createSecret(
  player: Player,
  seed: {
    cards: Array<BaseCard>
    randomSeed: Array<number>
    cardRarities: Map<BaseCard, Rarity>
  }
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

/// not actually random >:)
function generateRandomSeed(): number[] {
  return Array.from({ length: 16 }, () => 1)
}
