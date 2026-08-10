import { GameState, PlayerSecret, SkyWeaver } from '@skyweaver/state-metadata'

export const mockGameEndState: GameState<SkyWeaver> = {
  instances: [],
  playerCards: [],
  shuffleDeckOnInsert: false,
  state: {
    currentPlayer: 0,
    gameParams: {
      allowBeyondDeckDrawOutsidePrisms: false,
      cardWhitelist: [],
      cheatsAllowed: false,
      dualPrismDeckSize: 0,
      fillDecksToPrismSize: false,
      krampusMode: false,
      maxBoardUnits: 0,
      maxHandSize: 0,
      maxManaCrystals: 0,
      maxTurnCount: 0,
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
      ],
      randomDeckOdds: undefined,
      rigDeckOrder: false,
      season: 0,
      singlePrismDeckSize: 0,
      skipFirstTurnStart: true,
      skipMulligan: false,
      tavernMode: undefined
    },
    isCurrentPlayerSelectingCards: false,
    players: [
      {
        bannerSize: 1,
        baseCardSwaps: new Map(),
        doneCardSelection: true,
        extraManaNextTurn: 0,
        gameStats: {
          fatigueAmount: 0,
          totalHeroHealthLost: 0,
          totalHordeDamage: 0
        },
        globalCardModifiers: [],
        gloryRepeat: 1,
        id: 0,
        inspireRepeat: 1,
        mana: 1,
        maxMana: 1,
        prisms: ['hrt'],
        heroAbilityBase: undefined,
        thisTurnStats: {
          alliesDied: [],
          heroAttacked: false,
          heroHpLost: 0,
          heroHpGained: 0,
          heroWasDamaged: false,
          numHeroAttacks: 0,
          numSpellsCast: 0,
          baseCardsPlayed: [],
          unitsSummoned: [],
          heroHpAtTurnStart: 0
        },
        heroAbilityCastsOrTriggersSinceLastTurnStart: 0
      },
      {
        bannerSize: 1,
        baseCardSwaps: new Map(),
        doneCardSelection: true,
        extraManaNextTurn: 0,
        gameStats: {
          fatigueAmount: 0,
          totalHeroHealthLost: 0,
          totalHordeDamage: 0
        },
        globalCardModifiers: [],
        gloryRepeat: 1,
        id: 1,
        inspireRepeat: 1,
        mana: 1,
        maxMana: 1,
        prisms: ['hrt'],
        heroAbilityBase: undefined,
        thisTurnStats: {
          alliesDied: [],
          heroAttacked: false,
          heroHpLost: 0,
          heroHpGained: 0,
          heroWasDamaged: false,
          numHeroAttacks: 0,
          numSpellsCast: 0,
          baseCardsPlayed: [],
          unitsSummoned: [],
          heroHpAtTurnStart: 0
        },
        heroAbilityCastsOrTriggersSinceLastTurnStart: 0
      }
    ],
    moveCount: 0,
    status: {
      type: 'GameOver',
      winner: 0
    },
    turnCount: 0,
    auraUpdateEnabled: true,
    deathCleanupEnabled: true,
    effectResolutionEnabled: true
  }
}

export const mockGameEndSecret: PlayerSecret<SkyWeaver> = {
  cardSelection: [],
  deck: [],
  deferredLocations: [],
  deferredLogs: [],
  dust: [],
  hand: [],
  instances: new Map(),
  limbo: [],
  nextInstance: undefined,
  player: 0,
  pointers: [],
  secret: {
    cardRarities: new Map(),
    cardsAboutToBeDrawn: [],
    filledDeck: [],
    filledDeckInstances: [],
    originalDeck: [],
    secretEarlyTriggers: [],
    singletonCardsPosessed: [],
    cardSelectionState: undefined
  }
}
