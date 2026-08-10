import { EventDispatcher } from '~/helpers/EventDispatcher'

export interface PlayerInfo {
  heroHitThisTurn: boolean
  mana: number
  manaCrystals: number
  manaPreview: [number, number]
  manaChangeDispatcher: EventDispatcher<number>
  cardsInDeck: number
  cardsInGraveyard: number
}

class MatchInfoStore {
  settingConcedeButtonEnabled = false
  playerInfo: PlayerInfo = {
    heroHitThisTurn: false,
    mana: 1,
    manaCrystals: 1,
    manaPreview: [0, 0],
    manaChangeDispatcher: new EventDispatcher(),
    cardsInDeck: 0,
    cardsInGraveyard: 0
  }
  opponentInfo: PlayerInfo = {
    heroHitThisTurn: false,
    mana: 1,
    manaCrystals: 1,
    manaPreview: [0, 0],
    manaChangeDispatcher: new EventDispatcher(),
    cardsInDeck: 0,
    cardsInGraveyard: 0
  }
  isPlayerTurn = false
  gameStarted = false
  pauseSky = true //initially paused, will resume on turn changes
  turnCount = 0
  timer = {
    elapsedTurnTime: 0,
    turnEndTime: Date.now(),
    paused: false,
    hasGoneRedThisTurn: false,
    finished: false
  }
  cardSelectionsDone = false
}

export const matchInfoStore = new MatchInfoStore()
