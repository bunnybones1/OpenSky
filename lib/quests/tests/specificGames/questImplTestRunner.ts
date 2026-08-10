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
import { WasmState } from '@skyweaver/state-node-sys'
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

  const state: GameState<SkyWeaver> = {
    instances: [],
    playerCards: [
      {
        deck: 0,
        hand: [],
        field: [],
        graveyard: [],
        dust: [],
        limbo: [],
        casting: [],
        cardSelection: 0,
        pointers: 0,
        heroAbility: []
      },
      {
        deck: 0,
        hand: [],
        field: [],
        graveyard: [],
        dust: [],
        limbo: [],
        casting: [],
        cardSelection: 0,
        pointers: 0,
        heroAbility: []
      }
    ],
    shuffleDeckOnInsert: false,
    state: {
      gameParams,
      players: [
        {
          id: 0 as Player,
          prisms: Array.isArray(players[0].prisms)
            ? players[0].prisms
            : [players[0].prisms],
          mana: 1,
          maxMana: 1,
          doneCardSelection: false,
          bannerSize: 1,
          inspireRepeat: 1,
          gloryRepeat: 1,
          extraManaNextTurn: 0,
          thisTurnStats: {
            alliesDied: [],
            heroHpLost: 0,
            heroHpGained: 0,
            heroAttacked: false,
            heroWasDamaged: false,
            numSpellsCast: 0,
            numHeroAttacks: 0,
            baseCardsPlayed: [],
            unitsSummoned: [],
            heroHpAtTurnStart: 0
          },
          heroAbilityCastsOrTriggersSinceLastTurnStart: 0,
          gameStats: {
            totalHeroHealthLost: 0,
            totalHordeDamage: 0,
            fatigueAmount: 0
          },
          globalCardModifiers: [],
          baseCardSwaps: new Map(),
          heroAbilityBase: undefined
        },
        {
          id: 1 as Player,
          prisms: Array.isArray(players[1].prisms)
            ? players[1].prisms
            : [players[1].prisms],
          mana: 1,
          maxMana: 1,
          doneCardSelection: false,
          bannerSize: 1,
          inspireRepeat: 1,
          gloryRepeat: 1,
          extraManaNextTurn: 0,
          thisTurnStats: {
            alliesDied: [],
            heroHpLost: 0,
            heroHpGained: 0,
            heroAttacked: false,
            heroWasDamaged: false,
            numSpellsCast: 0,
            numHeroAttacks: 0,
            baseCardsPlayed: [],
            unitsSummoned: [],
            heroHpAtTurnStart: 0
          },
          heroAbilityCastsOrTriggersSinceLastTurnStart: 0,

          gameStats: {
            totalHeroHealthLost: 0,
            totalHordeDamage: 0,
            fatigueAmount: 0
          },
          globalCardModifiers: [],
          baseCardSwaps: new Map(),
          heroAbilityBase: undefined
        }
      ],
      isCurrentPlayerSelectingCards: false,
      turnCount: 0,
      moveCount: 0,
      status: { type: 'WaitingForGameToStart' },
      currentPlayer: 0 as Player,
      auraUpdateEnabled: true,
      deathCleanupEnabled: true,
      effectResolutionEnabled: true
    }
  }

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
      deck: [],
      field: [],
      graveyard: [],
      heroModifiers: [],
      heroSpell: undefined,
      cardsAddedToHandAfterMulligan: [],
      mulliganPoolSize: 8,
      mulliganChoiceSize: 4,
      skipFirstDraw: false,
      startingMana: 0
    },
    {
      deck: [],
      field: [],
      graveyard: [],
      heroModifiers: [],
      heroSpell: undefined,
      cardsAddedToHandAfterMulligan: [],
      mulliganPoolSize: 7,
      mulliganChoiceSize: 4,
      skipFirstDraw: false,
      startingMana: 0
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
