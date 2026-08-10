import type {
  BaseCard,
  GameParams,
  GameState,
  InstanceID,
  ModifiedBaseCard,
  Player,
  PlayerAction,
  PlayerGameParams,
  PlayerSecret,
  Prism,
  SkyWeaver
} from '@skyweaver/state-metadata'
import { TFuncKey } from '@opensky/language-manager'

export type GameStateCondition = (
  state: GameState<SkyWeaver>,
  player: number,
  secret: PlayerSecret<SkyWeaver>
) => boolean

export interface TutorialConfig {
  title: string | { translate: TFuncKey }
  description: string | { translate: TFuncKey }
  allowTryAgainBeforeRewards: boolean
  // Either a game config, or a serialized game.
  setup: Partial<GameConfig> | string
  botName?: string
  botArt?: BaseCard
  introduction?: MessageStep[] // Allows for scriptable momements before game start
  cardSelection?: MessageStep[] // Messages to play during card selection
  victory?: MessageStep[] // Messages to play when the player wins
  defeat?: MessageStep[] // Messages to play when the player loses
  turns?: Turn[]
  conditions?: Array<PlayerActionStep & { conditionKey?: string }> // React when an action is played
  gameEndConditions?: {
    description: string
    winCondition?: GameStateCondition
    loseCondition?: GameStateCondition
  }
  nextLevel?: string

  stateVersion?: string
}

export type PlayerCreatedLethalPuzzleConfig = Pick<
  TutorialConfig,
  'title' | 'description' | 'setup' | 'botName'
> & {
  stateVersion: string
}

function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
  return value !== null && value !== undefined
}

export type PlayerConfig = Omit<PlayerGameParams, 'deck'> & {
  prisms: Prism[]
  deck: Array<BaseCard | ModifiedBaseCard>
  heroAbility?: BaseCard
}

export type GameConfig = Omit<GameParams, 'playerParams'> & {
  player?: Partial<PlayerConfig>
  enemy?: Partial<PlayerConfig>
}

export interface Turn {
  player: Step[]
  enemy: Step[]
}

export type Step = ActionStep | MessageStep

export interface ActionStep {
  type: 'action'
  actions: PlayerActionStep[] | PlayerActionStep // Required actions
  successMessage?: MessageStep[] | MessageStep // Displayed When user completes all action steps
  errorMessage?: MessageStep[] | MessageStep // Displayed When user takes too long
  optional?: true
}

export interface MessageStep {
  type: 'message'
  key?: string // Used to reference audio and in future used as localization key
  text: string // Temporary before we introduce localization
  source?: BaseTarget // Who is speaking? Default is HelperCube, Target.EnemyHero supported as well for now
  duration?: number // How long to pause text for
  beforeDelay?: number // Delay before starting
  afterDelay?: number // Delay after playing message
  position?: BaseTarget // Will move the helper cube into position near the target and highlight automatically
  highlight?: BaseTarget[] | BaseTarget // Used to highlight additional things the cube is not highlighting
  showPopup?:
    | HandTarget
    | AttachedCardTarget
    | UnitTarget
    | {
        target: HandTarget | AttachedCardTarget | UnitTarget
        direction: 'left' | 'right'
      } // if we should show a card popup on the highlight target
  noSkip?: boolean // If a message can be skipped
  sentiment?: 'happy' | 'sad'
}

export type PlayerActionCreator = (...args: any[]) => PlayerActionStep

export interface PlayerActionStep {
  filter: PlayerActionFilter
  options?: PlayerActionOptions
  multi?: boolean
}

export type PlayerActionFilter = (
  state: GameState<SkyWeaver>,
  player: number,
  secret: PlayerSecret<SkyWeaver>,
  validActions: PlayerAction[]
) => PlayerAction[]

export interface PlayerActionOptions {
  successMessage?: MessageStep[] | MessageStep
  errorMessage?: MessageStep[] | MessageStep
  highlight?: BaseTarget[] | BaseTarget
}

let _targetIdx = 0

export class BaseTarget {
  static _idx = 0

  id: number
  name: string

  constructor(name: string) {
    this.id = _targetIdx++
    this.name = name
  }

  valueOf() {
    return this.id
  }
}

abstract class CardTarget extends BaseTarget {
  constructor(
    public base: BaseCard | '*',
    public player: 'either' | Player,
    public zone: 'field' | 'hand' | 'grave' | 'attached' | '*'
  ) {
    super(`${player}-${base}-${zone}`)
  }
  abstract getInstanceIDs(
    state: GameState<SkyWeaver>,
    secret: PlayerSecret<SkyWeaver>
  ): InstanceID[]
  getInstanceID(
    state: GameState<SkyWeaver>,
    secret: PlayerSecret<SkyWeaver>
  ): InstanceID | undefined {
    return this.getInstanceIDs(state, secret)[0]
  }
}

export class FieldTarget extends CardTarget {
  constructor(player: Player | 'either', card: BaseCard | '*') {
    super(card, player, 'field')
  }

  getInstanceIDs(
    state: GameState<SkyWeaver>,
    _secret: PlayerSecret<SkyWeaver>
  ): InstanceID[] {
    return state.playerCards
      .filter((_, i) => this.player === 'either' || this.player === i)
      .reduce((match, cards) => {
        return [
          ...match,
          ...cards.field.filter(id => {
            const card = state.instances[id]
            if ('player' in card) {
              throw new Error("Card is on field, but isn't in public state.")
            }
            return this.base === '*' || card.instance.base === this.base
          })
        ]
      }, [])
  }
}

export class ReadyFieldTarget extends FieldTarget {
  getInstanceIDs(
    state: GameState<SkyWeaver>,
    _secret: PlayerSecret<SkyWeaver>
  ): number[] {
    return super.getInstanceIDs(state, _secret).filter(id => {
      const card = state.instances[id]

      if ('player' in card) {
        throw new Error("Card is on field, but isn't in public state.")
      }
      return card.instance.state.view.attackState === 'Ready'
    })
  }
}

export class HeroTarget extends FieldTarget {
  constructor(public player: Player | 'either') {
    super(player, 'Hero')
  }
}

export class UnitTarget extends CardTarget {
  constructor(player: Player | 'either', card: BaseCard | '*') {
    super(card, player, 'field')
  }

  getInstanceIDs(
    state: GameState<SkyWeaver>,
    _secret: PlayerSecret<SkyWeaver>
  ): InstanceID[] {
    return state.playerCards
      .filter((_, i) => this.player === 'either' || this.player === i)
      .reduce((match, cards) => {
        return [
          ...match,
          ...cards.field.filter(id => {
            const card = state.instances[id]
            if ('player' in card) {
              throw new Error("Card is on field, but isn't in public state.")
            }
            return (
              (this.base === '*' && card.instance.base !== 'Hero') ||
              card.instance.base === this.base
            )
          })
        ]
      }, [])
  }
}

export class HandTarget extends CardTarget {
  constructor(public player: Player | 'either', public base: BaseCard | '*') {
    super(base, player, 'hand')
  }

  getInstanceIDs(
    state: GameState<SkyWeaver>,
    secret: PlayerSecret<SkyWeaver>
  ): InstanceID[] {
    const secretMatches: InstanceID[] = []
    // check secret hand first
    if (this.player === 'either' || secret.player === this.player) {
      for (const secretHandID of secret.hand) {
        if (!secretHandID) {
          continue
        }
        const instance = secret.instances.get(secretHandID)
        if (!instance) {
          throw new Error("Card is in secret hand, but isn't in secret..")
        }
        if (this.base === '*' || instance.base === this.base) {
          secretMatches.push(secretHandID)
        }
      }
    }

    // now check public
    return state.playerCards
      .filter((_, i) => this.player === 'either' || this.player === i)
      .reduce<number[]>(
        (match, cards) => [
          ...match,
          ...cards.hand.filter(notEmpty).filter(id => {
            const card = state.instances[id]
            if ('player' in card) {
              throw new Error(
                "Card is in public hand, but isn't in public state."
              )
            }
            return this.base === '*' || card.instance.base === this.base
          })
        ],
        secretMatches
      )
  }
}

export class GraveTarget extends CardTarget {
  constructor(player: Player | 'either', card: BaseCard | '*') {
    super(card, player, 'grave')
  }

  getInstanceIDs(
    state: GameState<SkyWeaver>,
    _secret: PlayerSecret<SkyWeaver>
  ): InstanceID[] {
    return state.playerCards
      .filter((_, i) => this.player === 'either' || this.player === i)
      .reduce(
        (match, cards) => [
          ...match,
          ...cards.graveyard.filter(id => {
            const card = state.instances[id]
            if ('player' in card) {
              throw new Error("Card is in grave, but isn't in public state.")
            }
            return this.base === '*' || card.instance.base === this.base
          })
        ],
        []
      )
  }
}

export class AttachedCardTarget extends CardTarget {
  constructor(player: Player | 'either', card: BaseCard | '*') {
    super(card, player, 'attached')
  }
  getInstanceIDs(
    state: GameState<SkyWeaver>,
    secret: PlayerSecret<SkyWeaver>
  ): InstanceID[] {
    const secretAttachments: InstanceID[] = []
    // check secret attachments first
    if (this.player === 'either' || secret.player === this.player) {
      for (const secretHandID of secret.hand) {
        if (!secretHandID) {
          continue
        }
        const instance = secret.instances.get(secretHandID)
        if (!instance) {
          throw new Error("Card is in secret hand, but isn't in secret..")
        }
        const attachID = instance.attachment
        if (attachID === undefined) {
          continue
        }
        const attachInstance = secret.instances.get(attachID)
        if (!attachInstance) {
          throw new Error("Card is in secret attach, but isn't in secret..")
        }
        if (this.base === '*' || attachInstance.base === this.base) {
          secretAttachments.push(attachID)
        }
      }
    }

    // now check public
    return state.playerCards
      .filter((_, i) => this.player === 'either' || this.player === i)
      .reduce(
        (match, cards) => [
          ...match,
          ...[
            ...cards.hand.filter(notEmpty),
            ...cards.field,
            ...cards.graveyard
          ].reduce<InstanceID[]>((attachIDs, id) => {
            const card = state.instances[id]
            if ('player' in card) {
              throw new Error(
                "Card is in public state zone, but instance isn't in public state."
              )
            }
            const attachID = card.instance.attachment
            if (attachID === undefined) {
              return attachIDs
            }
            const attachInstance = state.instances[attachID]
            if ('player' in attachInstance) {
              throw new Error("Attach isn't public, but its parent is.")
            }
            if (
              this.base === '*' ||
              attachInstance.instance.base === this.base
            ) {
              attachIDs.push(attachID)
            }
            return attachIDs
          }, [])
        ],
        secretAttachments
      )
  }
}

// Enum-like Target structure for position of helper cube or highlighting when relaying scriptable moment
export class Target {
  static _playerHandCards: Map<BaseCard, HandTarget> = new Map()
  static _enemyHandCards: Map<BaseCard, HandTarget> = new Map()
  static _playerGraveCards: Map<BaseCard, GraveTarget> = new Map()
  static _enemyGraveCards: Map<BaseCard, GraveTarget> = new Map()
  static _playerUnits: Map<BaseCard, UnitTarget> = new Map()
  static _enemyUnits: Map<BaseCard, UnitTarget> = new Map()
  static _playerAttachedCards: Map<BaseCard, AttachedCardTarget> = new Map()
  static _enemyAttachedCards: Map<BaseCard, AttachedCardTarget> = new Map()

  static Home = new BaseTarget('Home')
  static PlayerDeck = new BaseTarget('PlayerDeck')
  static EnemyDeck = new BaseTarget('EnemyDeck')
  static PlayerGraveyard = new BaseTarget('PlayerGraveyard')
  static EnemyGraveyard = new BaseTarget('EnemyGraveyard')
  static PlayerHand = new BaseTarget('PlayerHand')
  static EnemyHand = new BaseTarget('EnemyHand')
  static PlayerManaVial = new BaseTarget('PlayerManaVial')
  static EnemyManaVial = new BaseTarget('EnemyManaVial')
  static PlayerHeroAbility = new BaseTarget('PlayerHeroAbility')
  static EndTurn = new BaseTarget('EndTurn')
  static PlayerHero = new HeroTarget(0)
  static EnemyHero = new HeroTarget(1)
  static Offscreen = new BaseTarget('Offscreen')

  static AnyUnit = new UnitTarget('either', '*')
  static AnyPlayerUnit = new UnitTarget(0, '*')
  static AnyEnemyUnit = new UnitTarget(1, '*')

  static AnyHandCard = new HandTarget('either', '*')
  static AnyPlayerHandCard = new HandTarget(0, '*')
  static AnyEnemyHandCard = new HandTarget(1, '*')

  static AnyGraveCard = new GraveTarget('either', '*')
  static AnyPlayerGraveCard = new GraveTarget(0, '*')
  static AnyEnemyGraveCard = new GraveTarget(1, '*')

  static PlayerHandCard(card: BaseCard) {
    const baseCards = this._playerHandCards

    if (baseCards.has(card)) {
      return baseCards.get(card)!
    } else {
      const target = new HandTarget(0, card)
      baseCards.set(card, target)
      return target
    }
  }

  static EnemyHandCard(card: BaseCard) {
    const baseCards = this._enemyHandCards

    if (baseCards.has(card)) {
      return baseCards.get(card)!
    } else {
      const target = new HandTarget(1, card)
      baseCards.set(card, target)
      return target
    }
  }

  static PlayerUnit(card: BaseCard) {
    const baseCards = this._playerUnits

    if (baseCards.has(card)) {
      return baseCards.get(card)!
    } else {
      const target = new UnitTarget(0, card)
      baseCards.set(card, target)
      return target
    }
  }

  static EnemyUnit(card: BaseCard) {
    const baseCards = this._enemyUnits

    if (baseCards.has(card)) {
      return baseCards.get(card)!
    } else {
      const target = new UnitTarget(1, card)
      baseCards.set(card, target)
      return target
    }
  }

  static PlayerAttachedCard(card: BaseCard) {
    const baseCards = this._playerAttachedCards

    if (baseCards.has(card)) {
      return baseCards.get(card)!
    } else {
      const target = new AttachedCardTarget(0, card)
      baseCards.set(card, target)
      return target
    }
  }

  static EnemyAttachedCard(card: BaseCard) {
    const baseCards = this._enemyAttachedCards

    if (baseCards.has(card)) {
      return baseCards.get(card)!
    } else {
      const target = new AttachedCardTarget(1, card)
      baseCards.set(card, target)
      return target
    }
  }

  static PlayerGraveCard(card: BaseCard) {
    const baseCards = this._playerGraveCards

    if (baseCards.has(card)) {
      return baseCards.get(card)!
    } else {
      const target = new GraveTarget(0, card)
      baseCards.set(card, target)
      return target
    }
  }

  static EnemyGraveCard(card: BaseCard) {
    const baseCards = this._enemyGraveCards

    if (baseCards.has(card)) {
      return baseCards.get(card)!
    } else {
      const target = new GraveTarget(1, card)
      baseCards.set(card, target)
      return target
    }
  }
}
