import {
  Card,
  CardEffect,
  CardEvent,
  CardInstance,
  DamageKind,
  EffectType,
  Element,
  GameAction,
  InstanceID,
  Player,
  ResolvedPhaseMoveToZone,
  SkyWeaver,
  Trait
} from '@skyweaver/state-metadata'

import { getCardCache } from '~/cardCache'
import { getId } from '~/utils/card'

import WorkerProxyStore from './WorkerProxyStore'

export class ActionHistory {
  readonly events: ActionHistoryEvent[] = []

  private readonly subscribers: Set<ActionHistorySubscriber> = new Set()
  private readonly context: Context
  private parser?: PlayerActionParser

  constructor(store: WorkerProxyStore) {
    this.context = new Context(store)

    store.subscribeToCardEvents(event => this.handleEvent(event))
  }

  subscribe(subscriber: ActionHistorySubscriber): ActionHistoryUnsubscriber {
    if (this.subscribers.has(subscriber)) {
      throw new Error('subscriber already subscribed')
    }

    this.subscribers.add(subscriber)

    return () => this.subscribers.delete(subscriber)
  }

  private handleEvent(event: CardEvent<SkyWeaver>) {
    if (this.parser) {
      const events = this.parser.handleEvent(event)

      if (events) {
        delete this.parser

        for (const event of events) {
          this.events.push(event)

          for (const subscriber of this.subscribers) {
            subscriber(event)
          }
        }
      }
    } else {
      switch (event.type) {
        case 'ModifyCard': {
          const instance = event.payload.instance
          if (instance) {
            this.context.setCard(instance.id, instance)
          }
          break
        }

        case 'MoveCard': {
          const { from, to } = event.payload
          const instance = event.payload.instance?.[0]
          if (instance) {
            this.context.setCard(instance.id, instance)
            if (this.events.length > 0) {
              const log = this.events[this.events.length - 1].items
              switch (to.location?.[0].name) {
                case 'Dust':
                  if (from.location?.[0].name !== 'Dust') {
                    log.push({ type: 'Dust', card: instance })
                  }
                  break
                case 'Attachment':
                  log.push({ type: 'Attach', child: instance })
                  break
              }
              if (to.player !== from.player) {
                log.push({ type: 'SetOwner', card: instance, owner: to.player })
              }
            }
          }
          break
        }

        case 'GameEvent': {
          const action = event.payload.event
          switch (action.type) {
            case 'EnterPlayerAction':
              this.parser = new PlayerActionParser(this.context, action)
              break
          }
          break
        }
      }
    }
  }
}

export type ActionHistoryEvent =
  | {
      type: 'StartTurn'
      player: Player
      items: ActionHistoryItem[]
    }
  | {
      type: 'EndTurn'
      player: Player
      items: ActionHistoryItem[]
    }
  | {
      type: 'PlayCard'
      player: Player
      card: CardInstance<SkyWeaver>
      attachment?: CardInstance<SkyWeaver>
      target?: CardInstance<SkyWeaver>
      items: ActionHistoryItem[]
    }
  | {
      type: 'Attack'
      player: Player
      attacker: CardInstance<SkyWeaver>
      attackerAttachment?: CardInstance<SkyWeaver>
      defender: CardInstance<SkyWeaver>
      defenderAttachment?: CardInstance<SkyWeaver>
      attackerDied: boolean
      defenderDied: boolean
      items: ActionHistoryItem[]
    }

export type ActionHistoryItem =
  | {
      type: 'Damage'
      kind: DamageKind
      source: CardInstance<SkyWeaver>
      sourceAttachment?: CardInstance<SkyWeaver>
      target: CardInstance<SkyWeaver>
      targetAttachment?: CardInstance<SkyWeaver>
      damage: number
      isWither: boolean
      isLifesteal: boolean
    }
  | {
      type: 'Kill'
      card: CardInstance<SkyWeaver>
      attachment?: CardInstance<SkyWeaver>
    }
  | {
      type: 'Dust'
      card: CardInstance<SkyWeaver>
      attachment?: CardInstance<SkyWeaver>
    }
  | { type: 'Attach'; child: CardInstance<SkyWeaver> }
  | {
      type: 'SetOwner'
      card: CardInstance<SkyWeaver>
      attachment?: CardInstance<SkyWeaver>
      owner: Player
    }
  | {
      type: 'SetCost'
      card?: CardInstance<SkyWeaver>
      attachment?: CardInstance<SkyWeaver>
      cost: number
    }
  | {
      type: 'SetHealth'
      card?: CardInstance<SkyWeaver>
      attachment?: CardInstance<SkyWeaver>
      health: number
    }
  | {
      type: 'SetPower'
      card?: CardInstance<SkyWeaver>
      attachment?: CardInstance<SkyWeaver>
      power: number
    }
  | {
      type: 'ChangeCost'
      card?: CardInstance<SkyWeaver>
      attachment?: CardInstance<SkyWeaver>
      cost: number
    }
  | {
      type: 'ChangeHealth'
      card?: CardInstance<SkyWeaver>
      attachment?: CardInstance<SkyWeaver>
      health: number
    }
  | {
      type: 'ChangePower'
      card?: CardInstance<SkyWeaver>
      attachment?: CardInstance<SkyWeaver>
      power: number
    }
  | {
      type: 'SetElement'
      card?: CardInstance<SkyWeaver>
      attachment?: CardInstance<SkyWeaver>
      element: Element
    }
  | {
      type: 'SetTraits'
      card?: CardInstance<SkyWeaver>
      attachment?: CardInstance<SkyWeaver>
      traits: Trait[]
    }
  | {
      type: 'ClearTraits'
      card?: CardInstance<SkyWeaver>
      attachment?: CardInstance<SkyWeaver>
    }
  | {
      type: 'AddTrait'
      card?: CardInstance<SkyWeaver>
      attachment?: CardInstance<SkyWeaver>
      trait: Trait
    }
  | {
      type: 'RemoveTrait'
      card?: CardInstance<SkyWeaver>
      attachment?: CardInstance<SkyWeaver>
      trait: Trait
    }
  | {
      type: 'Silence'
      card?: CardInstance<SkyWeaver>
      attachment?: CardInstance<SkyWeaver>
    }
  | { type: 'ChangeMana'; player: Player; mana: number }
  | { type: 'ChangeMaxMana'; player: Player; mana: number }
  | {
      type: 'Draw'
      player: Player
      card?: CardInstance<SkyWeaver>
      attachment?: CardInstance<SkyWeaver>
      success: boolean
    }
  | {
      type: 'Trigger'
      card: CardInstance<SkyWeaver>
      attachment?: CardInstance<SkyWeaver>
      effect: CardEffect
      effectType: EffectType
    }
  | { type: 'Fatigue'; card: InstanceID }
  | {
      type: 'Mulligan'
      player: Player
      mulligan: Array<CardInstance<SkyWeaver> | undefined>
      draw: Array<CardInstance<SkyWeaver> | undefined>
    }

export type ActionHistorySubscriber = (event: ActionHistoryEvent) => void
export type ActionHistoryUnsubscriber = () => void

class PlayerActionParser {
  private readonly items: ActionHistoryItem[] = []
  private readonly events: ActionHistoryEvent[] = []
  private parser?: ParallelPhasesParser | PhaseParser
  private readonly card?: CardInstance<SkyWeaver> | InstanceID
  private readonly target?: CardInstance<SkyWeaver>
  private readonly attacker?: CardInstance<SkyWeaver>
  private readonly defender?: CardInstance<SkyWeaver>

  constructor(
    private readonly context: Context,
    private readonly playerAction: Extract<
      GameAction,
      { type: 'EnterPlayerAction' }
    >
  ) {
    switch (playerAction.payload[1].type) {
      case 'PlayCard': {
        const { cardID, targetID } = playerAction.payload[1]
        this.card = context.getCard(cardID) || cardID
        this.target = context.getCard(targetID)
        break
      }

      case 'Attack': {
        const { attackerID, defenderID } = playerAction.payload[1]
        this.attacker = context.getCard(attackerID)
        this.defender = context.getCard(defenderID)
        break
      }
    }
  }

  handleEvent(event: CardEvent<SkyWeaver>): void | ActionHistoryEvent[] {
    const log =
      this.events.length > 0
        ? this.events[this.events.length - 1].items
        : this.items

    if (this.parser) {
      const events = this.parser.handleEvent(event)

      if (events) {
        delete this.parser

        log.push(...events[0])
        this.events.push(...events[1])
      }
    } else {
      switch (event.type) {
        case 'ModifyCard': {
          const instance = event.payload.instance
          if (instance) {
            this.context.setCard(instance.id, instance)
          }
          break
        }

        case 'MoveCard': {
          const { from, to } = event.payload
          const instance = event.payload.instance
          if (instance) {
            this.context.setCard(instance[0].id, instance[0])
            if (instance[1]) {
              this.context.setCard(instance[1].id, instance[1])
            }
            switch (to.location?.[0].name) {
              case 'Dust':
                if (from.location?.[0].name !== 'Dust') {
                  log.push({ type: 'Dust', card: instance[0] })
                }
                break
              case 'Attachment':
                log.push({ type: 'Attach', child: instance[0] })
                break
            }
            if (to.player !== from.player) {
              log.push({
                type: 'SetOwner',
                card: instance[0],
                owner: to.player
              })
            }
          }
          break
        }

        case 'GameEvent': {
          const action = event.payload.event
          switch (action.type) {
            case 'ExitPlayerAction': {
              const player =
                this.playerAction.payload[0] !== undefined
                  ? this.playerAction.payload[0]
                  : this.context.store.state?.state.currentPlayer

              switch (this.playerAction.payload[1].type) {
                case 'EndTurn':
                  this.events.unshift({
                    type: 'EndTurn',
                    player: player!,
                    items: this.items
                  })
                  break

                case 'PlayCard': {
                  const card = this.context.getCard(this.card)
                  if (card) {
                    const attachment =
                      card.attachment === undefined
                        ? undefined
                        : this.context.getCard(card.attachment)
                    this.events.unshift({
                      type: 'PlayCard',
                      player: player!,
                      card,
                      attachment,
                      target: this.context.getCard(this.target),
                      items: this.items
                    })
                  } else {
                    console.warn(
                      `Action history got PlayCard, but that card didn't exist in the card cache!`
                    )
                  }
                  break
                }

                case 'Attack': {
                  const { attackerID, defenderID } =
                    this.playerAction.payload[1]
                  let attackerDied = false
                  let defenderDied = false
                  for (const item of this.items) {
                    switch (item.type) {
                      case 'Kill':
                        switch (getId(item.card)) {
                          case attackerID:
                            attackerDied = true
                            break
                          case defenderID:
                            defenderDied = true
                            break
                        }
                        break
                    }
                    if (attackerDied && defenderDied) {
                      break
                    }
                  }
                  const attacker = this.context.getCard(this.attacker)
                  const defender = this.context.getCard(this.defender)
                  if (attacker && defender) {
                    const attackerAttachment =
                      attacker.attachment === undefined
                        ? undefined
                        : this.context.getCard(attacker.attachment)
                    const defenderAttachment =
                      defender.attachment === undefined
                        ? undefined
                        : this.context.getCard(defender.attachment)
                    this.events.unshift({
                      type: 'Attack',
                      player: player!,
                      attacker,
                      attackerAttachment,
                      defender,
                      defenderAttachment,
                      attackerDied,
                      defenderDied,
                      items: this.items
                    })
                  } else {
                    console.warn(
                      `Action history got Attack, but ${
                        attacker ? 'defender' : 'attacker'
                      } isn't in card cache!`
                    )
                  }
                  break
                }
              }

              return this.events
            }

            case 'EnterParallelPhases':
              this.parser = new ParallelPhasesParser(this.context)
              break

            case 'EnterPhase':
              this.parser = new PhaseParser(this.context, action)
              break
          }
          break
        }
      }
    }
  }
}

class ParallelPhasesParser {
  private readonly items: ActionHistoryItem[] = []
  private readonly events: ActionHistoryEvent[] = []
  private parser?: ParallelPhasesParser | PhaseParser

  constructor(private readonly context: Context) {}

  handleEvent(
    event: CardEvent<SkyWeaver>
  ): void | [ActionHistoryItem[], ActionHistoryEvent[]] {
    if (this.parser) {
      const events = this.parser.handleEvent(event)

      if (events) {
        delete this.parser

        this.items.push(...events[0])
        this.events.push(...events[1])
      }
    } else {
      switch (event.type) {
        case 'ModifyCard': {
          const instance = event.payload.instance
          if (instance) {
            this.context.setCard(instance.id, instance)
          }
          break
        }

        case 'MoveCard': {
          const { from, to } = event.payload
          const instance = event.payload.instance?.[0]
          if (instance) {
            const log = this.items
            this.context.setCard(instance.id, instance)
            switch (to.location?.[0].name) {
              case 'Dust':
                if (from.location?.[0].name !== 'Dust') {
                  log.push({ type: 'Dust', card: instance })
                }
                break
              case 'Attachment':
                log.push({ type: 'Attach', child: instance })
                break
            }
            if (to.player !== from.player) {
              log.push({ type: 'SetOwner', card: instance, owner: to.player })
            }
          }
          break
        }

        case 'GameEvent': {
          const action = event.payload.event
          switch (action.type) {
            case 'ExitParallelPhases':
              return [this.items, this.events]

            case 'EnterParallelPhases':
              this.parser = new ParallelPhasesParser(this.context)
              break

            case 'EnterPhase':
              this.parser = new PhaseParser(this.context, action)
              break
          }
          break
        }
      }
    }
  }
}

class PhaseParser {
  private readonly items: ActionHistoryItem[] = []
  private readonly events: ActionHistoryEvent[] = []
  private parser?: ParallelPhasesParser | PhaseParser
  private source: CardInstance<SkyWeaver> | InstanceID
  private target: CardInstance<SkyWeaver> | InstanceID
  private card?: CardInstance<SkyWeaver> | InstanceID
  private mulligan: Array<CardInstance<SkyWeaver> | Card>

  constructor(
    private readonly context: Context,
    private readonly phase: Extract<GameAction, { type: 'EnterPhase' }>
  ) {
    switch (phase.payload.type) {
      case 'Damage': {
        const { source, target } = phase.payload.payload
        this.source = context.getCard(source) ?? source
        this.target = context.getCard(target) ?? target
        break
      }

      case 'MoveToZone':
        // We only care for Death, which always has a public ID
        if (phase.payload.payload.card && 'id' in phase.payload.payload.card) {
          this.card =
            context.getCard(phase.payload.payload.card.id) ??
            phase.payload.payload.card.id
        }
        break

      case 'ModifyCard': {
        let id: InstanceID | undefined
        const card = phase.payload.payload.card
        if ('id' in card) {
          id = card.id
        } else if (card.pointer.player === context.store.secret?.player) {
          id = context.store.secret.pointers[card.pointer.index]
        }
        this.card = context.getCard(id) ?? id
        break
      }

      case 'ResolveTrigger':
        this.card =
          context.getCard(phase.payload.payload.id) ?? phase.payload.payload.id
        break

      case 'Mulligan':
        this.mulligan = phase.payload.payload.toMulligan.map(
          card => context.getCard(card) ?? card
        )
        break
    }
  }

  handleEvent(
    event: CardEvent<SkyWeaver>
  ): void | [ActionHistoryItem[], ActionHistoryEvent[]] {
    const log =
      this.events.length > 0
        ? this.events[this.events.length - 1].items
        : this.items

    if (this.parser) {
      const events = this.parser.handleEvent(event)

      if (events) {
        delete this.parser

        log.push(...events[0])
        this.events.push(...events[1])
      }
    } else {
      switch (event.type) {
        case 'ModifyCard': {
          const instance = event.payload.instance
          if (instance) {
            this.context.setCard(instance.id, instance)
          }
          break
        }

        case 'MoveCard': {
          const { from, to } = event.payload
          const card = event.payload.instance
          if (card) {
            const [instance, attachment] = card
            this.context.setCard(instance.id, instance)
            if (attachment) {
              this.context.setCard(attachment.id, attachment)
            }
            switch (to.location?.[0].name) {
              case 'Dust':
                if (from.location?.[0].name !== 'Dust') {
                  log.push({ type: 'Dust', card: instance })
                }
                break
              case 'Attachment':
                log.push({ type: 'Attach', child: instance })
                break
            }
            if (to.player !== from.player) {
              log.push({ type: 'SetOwner', card: instance, owner: to.player })
            }
          }
          break
        }

        case 'GameEvent': {
          const action = event.payload.event
          switch (action.type) {
            case 'ExitPhase':
              switch (action.payload.type) {
                case 'FailedToResolve':
                  switch (this.phase.payload.type) {
                    case 'Draw':
                      this.items.unshift({
                        type: 'Draw',
                        player: this.phase.payload.payload.to[0],
                        success: false
                      })
                      break
                  }
                  break

                default:
                  switch (this.phase.payload.type) {
                    case 'StartTurn':
                      this.events.unshift({
                        type: 'StartTurn',
                        player: this.phase.payload.payload,
                        items: this.items
                      })
                      this.items.length = 0
                      break

                    case 'Damage': {
                      const {
                        kind,
                        amount: damage,
                        isWither,
                        lifestealFrom
                      } = this.phase.payload.payload
                      const source = this.context.getCard(this.source)
                      const target = this.context.getCard(this.target)
                      if (source && target) {
                        this.items.unshift({
                          type: 'Damage',
                          kind,
                          source,
                          sourceAttachment:
                            source.attachment === undefined
                              ? undefined
                              : this.context.getCard(source.attachment),
                          target,
                          targetAttachment:
                            target.attachment === undefined
                              ? undefined
                              : this.context.getCard(target.attachment),
                          damage,
                          isWither,
                          isLifesteal: lifestealFrom !== undefined
                        })
                      } else {
                        console.warn(
                          `Action history got Damage, but ${
                            source ? 'target' : 'source'
                          } didn't exist in the card cache!`
                        )
                      }
                      break
                    }

                    case 'MoveToZone':
                      {
                        const { card, from, to } = action.payload
                          .payload as ResolvedPhaseMoveToZone
                        // Death event is just a move from field to graveyard.
                        if (
                          card &&
                          'id' in card &&
                          from.location?.[0].name === 'Field' &&
                          to[1].name === 'Graveyard'
                        ) {
                          const card = this.context.getCard(this.card)
                          if (card) {
                            this.items.unshift({
                              type: 'Kill',
                              card,
                              attachment:
                                card.attachment === undefined
                                  ? undefined
                                  : this.context.getCard(card.attachment)
                            })
                          } else {
                            console.warn(
                              `Action history got Kill, but that card didn't exist in the card cache!`
                            )
                          }
                        }
                      }
                      break

                    case 'ModifyCard':
                      {
                        const modifier = this.phase.payload.payload.modifier
                        const card = this.context.getCard(this.card)
                        const attachment =
                          card === undefined || card.attachment === undefined
                            ? undefined
                            : this.context.getCard(card.attachment)
                        switch (typeof modifier) {
                          case 'object':
                            if ('SetCost' in modifier) {
                              this.items.unshift({
                                type: 'SetCost',
                                card,
                                attachment,
                                cost: modifier.SetCost
                              })
                            } else if ('SetHealth' in modifier) {
                              this.items.unshift({
                                type: 'SetHealth',
                                card,
                                attachment,
                                health: modifier.SetHealth
                              })
                            } else if ('SetPower' in modifier) {
                              this.items.unshift({
                                type: 'SetPower',
                                card,
                                attachment,
                                power: modifier.SetPower
                              })
                            } else if ('ModifyCost' in modifier) {
                              this.items.unshift({
                                type: 'ChangeCost',
                                card,
                                attachment,
                                cost: modifier.ModifyCost
                              })
                            } else if ('ModifyHealth' in modifier) {
                              if (
                                card &&
                                modifier.ModifyHealth[1] === 'Fatigue'
                              ) {
                                this.items.unshift({
                                  type: 'Fatigue',
                                  card: card.id
                                })
                              } else {
                                this.items.unshift({
                                  type: 'ChangeHealth',
                                  card,
                                  attachment,
                                  health: modifier.ModifyHealth[0]
                                })
                              }
                            } else if ('ModifyPower' in modifier) {
                              this.items.unshift({
                                type: 'ChangePower',
                                card,
                                attachment,
                                power: modifier.ModifyPower[0]
                              })
                            } else if ('SetElement' in modifier) {
                              this.items.unshift({
                                type: 'SetElement',
                                card,
                                attachment,
                                element: modifier.SetElement
                              })
                            } else if ('SetTraits' in modifier) {
                              this.items.unshift({
                                type: 'SetTraits',
                                card,
                                attachment,
                                traits: modifier.SetTraits
                              })
                            } else if ('GrantTrait' in modifier) {
                              this.items.unshift({
                                type: 'AddTrait',
                                card,
                                attachment,
                                trait: modifier.GrantTrait
                              })
                            } else if ('RemoveTrait' in modifier) {
                              this.items.unshift({
                                type: 'RemoveTrait',
                                card,
                                attachment,
                                trait: modifier.RemoveTrait
                              })
                            }
                            break
                          case 'string':
                            switch (modifier) {
                              case 'NoTraits':
                                this.items.unshift({
                                  type: 'ClearTraits',
                                  card,
                                  attachment
                                })
                                break

                              //TODO fix this
                              // case 'Silenced':
                              //   this.items.unshift({
                              //     type: 'Silence',
                              //     card,
                              //     attachment
                              //   })
                              //   break
                            }
                            break
                        }
                      }
                      break

                    case 'ChangeMana':
                      {
                        const { player, delta: mana } =
                          this.phase.payload.payload
                        this.items.unshift({
                          type: 'ChangeMana',
                          player,
                          mana
                        })
                      }
                      break

                    case 'ChangeMaxMana':
                      {
                        const { player, delta: mana } =
                          this.phase.payload.payload
                        this.items.unshift({
                          type: 'ChangeMaxMana',
                          player,
                          mana
                        })
                      }
                      break

                    case 'Draw':
                      if (action.payload.type !== this.phase.payload.type) {
                        console.error(
                          `expected ${this.phase.payload.type} ExitPhase, got ${action.payload.type} ExitPhase instead`
                        )
                      } else {
                        const card = this.context.getCard(
                          action.payload.payload.drawnCard
                        )
                        const attachment =
                          card === undefined || card.attachment === undefined
                            ? undefined
                            : this.context.getCard(card.attachment)
                        this.items.unshift({
                          type: 'Draw',
                          player: this.phase.payload.payload.to[0],
                          card,
                          attachment,
                          success: true
                        })
                      }
                      break
                    case 'Mulligan':
                      if (action.payload.type !== this.phase.payload.type) {
                        console.error(
                          `expected ${this.phase.payload.type} ExitPhase, got ${action.payload.type} ExitPhase instead`
                        )
                      } else {
                        this.items.unshift({
                          type: 'Mulligan',
                          player: this.phase.payload.payload.player,
                          mulligan: this.mulligan.map(card =>
                            this.context.getCard(card)
                          ),
                          draw: action.payload.payload.drawn.map(card =>
                            this.context.getCard(card)
                          )
                        })
                      }
                      break

                    case 'ResolveTrigger': {
                      const { effect, effectType } = this.phase.payload.payload
                      const card = this.context.getCard(this.card)
                      const attachment =
                        card === undefined || card.attachment === undefined
                          ? undefined
                          : this.context.getCard(card.attachment)
                      if (card) {
                        this.items.unshift({
                          type: 'Trigger',
                          card,
                          attachment,
                          effect,
                          effectType
                        })
                      } else {
                        console.warn(
                          `Action history got Trigger, but that card didn't exist in the card cache!`
                        )
                      }
                      break
                    }
                  }
                  break
              }

              return [this.items, this.events]

            case 'EnterParallelPhases':
              this.parser = new ParallelPhasesParser(this.context)
              break

            case 'EnterPhase':
              this.parser = new PhaseParser(this.context, action)
              break
          }
          break
        }
      }
    }
  }
}

class Context {
  private readonly cards: Map<InstanceID, CardInstance<SkyWeaver>> = new Map()

  constructor(readonly store: WorkerProxyStore) {}

  getCard(
    card?: InstanceID | Card | CardInstance<SkyWeaver>
  ): CardInstance<SkyWeaver> | undefined {
    if (card === undefined) {
      return
    }

    let id: InstanceID
    switch (typeof card) {
      case 'number':
        id = card
        break
      case 'object':
        if ('id' in card) {
          id = card.id
        } else {
          return getCardCache().getInstance(card)
        }
        break
      default:
        throw new Error(`card has type ${typeof card}`)
    }

    const instance = this.cards.get(id)
    if (instance) {
      return instance
    } else if (typeof card === 'object' && 'state' in card) {
      return card
    } else {
      return getCardCache().getInstance(card)
    }
  }

  setCard(id: InstanceID, card: CardInstance<SkyWeaver>) {
    this.cards.set(id, card)
  }
}
