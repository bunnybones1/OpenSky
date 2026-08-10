import { BaseCard, Rarity } from '@skyweaver/state-metadata'

import { TrackableCollection } from '~/utils/TrackableCollection'

import { DealerStepName } from './dealerStepTypes'
import { EventStateBoonChoiceDealer } from './EventStateBoonChoice'
import { EventStateLifeAuctionDealer } from './EventStateLifeAuction'
import { EventStateRandomizerDealer } from './EventStateRandomizer'

const TC = TrackableCollection
type TCt<T> = TrackableCollection<T>

export class DraftStateCard {
  constructor(
    public base: BaseCard,
    public rarity: Rarity,
    public type: 'card' | 'event' = 'card'
  ) {
    //
  }
}

export class DraftStateEvent extends DraftStateCard {
  constructor(
    public eventType: 'lifeAuction' | 'randomizer' | 'boonChoice',
    public name: string,
    public description: string
  ) {
    super('25000', 'base', 'event')
  }
}

export class DraftStateCardSlot {
  constructor(public card: DraftStateCard | undefined) {
    //
  }
}

export class DraftStateBoon extends DraftStateCard {
  constructor(
    public name: string,
    public description: string
  ) {
    super('25006', 'base', 'event')
  }
}

export class DraftStateDebt extends DraftStateCard {
  constructor(
    public name: string,
    public description: string
  ) {
    super('25005', 'base', 'event')
  }
}

export type DraftStateCardPack = TCt<DraftStateCard>
export type DraftStateDeck = TCt<DraftStateCard>

export type CardSortTypes =
  | 'cost'
  | 'element'
  | 'rarity'
  | 'unitOrSpell'
  | 'alphabetical'
export class DraftStatePlayer {
  avatar: DraftStateCard | undefined
  deck: DraftStateDeck
  boons: DraftStateDeck
  currentCardPack: DraftStateCardPack | undefined
  currentCardChoice: DraftStateCard | undefined
  choiceCommited = false
  packQueue: TCt<DraftStateCardPack>
  lookingAt: 'deck' | 'boons' | 'none' = 'none'
  lookingAtDeckSortBy: CardSortTypes = 'cost'
  lookingAtDeckSortBySecondary: CardSortTypes = 'alphabetical'
  lookingAtDeckReverse = false
  constructor(public name: string) {
    TC.unlock()
    this.deck = new TC(`${name}'s deck cards`)
    this.boons = new TC(`${name}'s boons`)
    this.packQueue = new TC(`${name}'s queued packs`)
    TC.lock()
  }
}

export default class DraftState {
  cardCube: TCt<DraftStateCard>
  trashCards: TCt<DraftStateCard>
  trashCardPacks: TCt<DraftStateCardPack>
  eventCube: TCt<DraftStateCard>
  eventPacks: TCt<DraftStateCardPack>
  avatarCube: TCt<DraftStateCard>
  avatarPacks: TCt<DraftStateCardPack>
  cardPacks: TCt<DraftStateCardPack>
  players: TCt<DraftStatePlayer>
  currentEvent: DraftStateCard | undefined
  eventsQueue: TCt<DraftStateCard>
  dealerEventState:
    | EventStateLifeAuctionDealer
    | EventStateBoonChoiceDealer
    | EventStateRandomizerDealer
    | undefined
  dealerCurrentStep: DealerStepName = 'start'
  dealerCardPack: DraftStateCardPack | undefined
  dealerAvatarPack: DraftStateCardPack | undefined
  dealerEventPack: DraftStateCardPack | undefined
  dealerShowBrain = false
  uiHorizonMode: 'normal' | 'sidebar' | 'deckReader' = 'normal'
  uiPlayerActivityBarExpanded = false
  constructor() {
    TC.unlock()
    this.cardCube = new TC('card cube')
    this.eventCube = new TC('event cube')
    this.trashCards = new TC('trash cards')
    this.trashCardPacks = new TC('trash card packs')
    this.avatarCube = new TC('avatar cube')
    this.cardPacks = new TC('card packs')
    this.eventPacks = new TC('event packs')
    this.eventsQueue = new TC('event queue')
    this.avatarPacks = new TC('avatar packs')
    this.players = new TC('players')
    TC.lock()
  }
}
