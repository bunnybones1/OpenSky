import {
  CardAttributes,
  CardLibrary,
} from '@skyweaver/state-metadata'
import type {
  WasmState,
  WasmMatch,
  BaseCard,
  CardInstance,
  FindByTag,
  GameState,
  InstanceID,
  Trait,
  Player,
  PlayerAction,
  PlayerSecret,
  PlayerState,
  SkyWeaver,
  Zone,
  CardEvent
} from '@skyweaver/state-browser-sys'

interface State {
  readonly state: GameState<SkyWeaver>
  dispatch(action: PlayerAction): void
}

interface Trade {
  attacker: CardInstance<SkyWeaver>
  target: CardInstance<SkyWeaver>
  value: number
}

// Actions
const Actions = {
  EndTurn: (): PlayerAction => ({ type: 'EndTurn' }),
  PlayCard: (cardID: number, targetID: number | undefined): PlayerAction => ({
    type: 'PlayCard',
    cardID,
    targetID
  }),
  Attack: (attackerID: number, defenderID: number): PlayerAction => ({
    type: 'Attack',
    attackerID,
    defenderID
  })
}

interface EnchantBehavior {
  effect: 'negative' | 'positive'
  playable: boolean
  damage?: number
}

const enchantBehaviors: Partial<{ [key in BaseCard]: EnchantBehavior }> = {
  '20010': { effect: 'negative', playable: true }, // Roots
  '20019': { effect: 'positive', playable: false }, // Spellshield
  '20023': { effect: 'negative', playable: true, damage: 2 }, // Flames
  '20027': { effect: 'negative', playable: false }, // Chains
  '20028': { effect: 'negative', playable: true, damage: 6 }, // Cursed
  '20032': { effect: 'negative', playable: false }, // Dazed
  '20039': { effect: 'positive', playable: true }, // Ent Mask
  '20042': { effect: 'positive', playable: false } // Shroud
}

// type CardStrategy = (state: State, player: PlayerState) => boolean

// const knownCardStrategies: Partial<{ [key in BaseCard]: CardStrategy }> = {
//   C384: (state, player) => false,
//   C837: (state, player) => false
// }

interface BotOpponentOptions {
  /**
   *  0-1, floating point. 1 is hardest difficulty, 0 is "end turn no matter what."
   *  */
  difficulty: number
  dispatchEvenIfSuperceded: boolean
  waitBetweenMoves: boolean
  logger: typeof console.log
}

type LocalCardInstance = CardInstance<SkyWeaver> & {
  owner: Player
  zone: Zone
}

export type GetValidActions = (
  state: GameState<SkyWeaver>,
  player: number,
  secret: PlayerSecret<SkyWeaver>
) => PlayerAction[]

export type ValidatePlayerAction<T> = (
  state: GameState<SkyWeaver>,
  player: number,
  action: PlayerAction,
  secret: PlayerSecret<SkyWeaver>
) => T

export type AfterActionApplied<T> = (
  state: GameState<SkyWeaver>,
  player: number,
  action: PlayerAction,
  secret: PlayerSecret<SkyWeaver>,
  data: T
) => void

abstract class BotOpponent<T, U> {
  state: State
  rawState: T
  cardLibrary: typeof CardLibrary
  getValidActions: GetValidActions
  validatePlayerAction: ValidatePlayerAction<U>
  afterActionApplied: AfterActionApplied<U>
  playerId: Player
  player!: PlayerState
  opponent!: PlayerState
  playerHero!: LocalCardInstance
  opponentHero!: LocalCardInstance
  playerCards: LocalCardInstance[] = []
  opponentCards: LocalCardInstance[] = []
  actions: PlayerAction[] = []
  thisTurn = { actionCount: 0, playedManaVial: false }

  options: BotOpponentOptions = {
    waitBetweenMoves: true,
    difficulty: 1,
    logger: () => {},
    dispatchEvenIfSuperceded: false
  }
  private nextMoveUUID = ''
  private _delay: Promise<void> = Promise.resolve()

  constructor(
    playerId: Player,
    createState: (
      self: BotOpponent<T, U>
    ) => [
      T,
      GetValidActions,
      ValidatePlayerAction<U>,
      typeof CardLibrary,
      AfterActionApplied<U>
    ],
    options: Partial<BotOpponentOptions> = {}
  ) {
    const [
      state,
      getValidActions,
      validatePlayerAction,
      cardLibrary,
      afterActionApplied
    ] = createState(this)
    this.rawState = state
    this.cardLibrary = cardLibrary
    this.getValidActions = getValidActions
    this.validatePlayerAction = validatePlayerAction
    this.afterActionApplied = afterActionApplied
    this.playerId = playerId
    Object.assign(this.options, options)
    this.state = this.buildStateFromRawState(this.rawState)
  }

  abstract buildStateFromRawState(rawState: T): State

  log(...args: any[]) {
    this.options.logger(`[BotOpponent: ${this.playerId}]`, ...args)
  }

  isCurrentPlayer(state: GameState<SkyWeaver>) {
    return (
      !state.state.players[this.playerId].doneCardSelection ||
      state.state.currentPlayer === this.playerId
    )
  }

  handleStateChange = async (
    state: GameState<SkyWeaver>,
    secret: PlayerSecret<SkyWeaver>
  ) => {
    if (!state) {
      console.error('BotOpponent: State was undefined in handleStateChange')
      return
    }

    if (state.state.status.type === 'GameOver') {
      return
    }

    const playerId = this.playerId

    try {
      // Is it my turn?
      if (this.isCurrentPlayer(state)) {
        try {
          this.player = getPlayer(state, playerId)
          this.opponent = getOpponent(state, playerId)
          this.playerHero = getHero(state, playerId as Player)
          this.opponentHero = getHero(state, (1 - playerId) as Player)

          if (this.opponentHero.state.view.health <= 0) {
            return
          }

          try {
            this.actions = (
              this.getValidActions(state, playerId, secret) as PlayerAction[]
            ).filter(c => c.type !== 'Concede')
          } catch (err) {
            console.error('getValidActions error:', err)
          }

          if (this.actions.length === 0) {
            // Nothing to do
            this.log('Paused, waiting for actions...')
            return
          }
          this.playerCards = getCardsForPlayer(
            state,
            playerId as Player,
            secret
          )
          this.opponentCards = getCardsForPlayer(
            state,
            (1 - playerId) as Player
          )

          let action: PlayerAction

          if (!this.player.doneCardSelection) {
            action = this.handleCardSelection(state, secret)
          } else {
            if (this.options.difficulty === -1) {
              // do nothing and don't end
              return
            } else if (this.actions.length === 1) {
              // Only 1 action to take, so take it without any further processing
              // Most likely EndTurn, but could be a filtered action from tutorial
              action = this.actions[0]
            } else if (this.options.difficulty === 0) {
              action =
                this.actions.find(a => a.type === 'EndTurn') ?? this.actions[0]
            } else {
              action = this.handleStrategy(state, this.actions)
            }

            if (!validateAction(this.actions, action)) {
              this.log('Invalid action', action, this.actions)
              throw new Error('Bot attempted to fire an invalid action.')
            }
          }

          if (!action) {
            this.log('Failed actions', this.actions)
            throw new Error('Bot failed to choose an action.')
          }

          this.thisTurn.actionCount += 1
          if (action.type === 'EndTurn') {
            this.thisTurn = {
              actionCount: 0,
              playedManaVial: false
            }
          } else if (action.type === 'PlayCard') {
            const castID = action.cardID
            const castCard = this.playerCards.find(c => c.id === castID)
            if (
              castCard &&
              (castCard.base === '20038' || castCard.base === '20017')
            ) {
              this.thisTurn.playedManaVial = true
            }
          }
          const nextMoveUUID = `${Math.random()}`
          this.nextMoveUUID = nextMoveUUID

          const delayKind =
            DELAY_SECONDS[
              this.thisTurn.actionCount === 1
                ? 'startTurn'
                : action.type === 'Attack'
                ? 'attack'
                : action.type === 'EndTurn'
                ? 'endTurn'
                : 'normal'
            ]

          const delaySeconds = this.options.waitBetweenMoves
            ? Math.random() * (delayKind.max - delayKind.min) + delayKind.min
            : 0
          const delayMs = delaySeconds * 1000

          const thisDelay = this._delay.then(() => delay(delayMs))
          this._delay = thisDelay
          this.log(
            `Bot chosen action but waiting for ${delaySeconds} seconds`,
            action
          )
          if (this.options.waitBetweenMoves) {
            await thisDelay
          }
          if (this._delay !== thisDelay) {
            // we have another pending action - so we better get this one in quick, if we want to do it!
            if (!this.options.dispatchEvenIfSuperceded) {
              this.log('Bot action', action, 'superceded by new move.')
              return
            }
          }

          try {
            if (
              this.state.state.state.status.type !== 'GameOver' &&
              this.nextMoveUUID === nextMoveUUID
            ) {
              this.log('Bot playing action', action)
              const validateResult = this.validatePlayerAction(
                this.state.state,
                playerId,
                action,
                secret
              )

              this.state.dispatch(action)
              this.afterActionApplied(
                this.state.state,
                playerId,
                action,
                secret,
                validateResult
              )
            }
          } catch (err) {
            if (`${err}`.includes('null pointer')) {
              // no problem
            } else {
              throw err
            }
          }
        } catch (err) {
          if (`${err}`.includes('Game is over!')) {
            // no prob
          } else {
            console.error('BotOpponent::handleStateChange internal error:', err)
            try {
              this.tryFallbackAction(state, secret)
            } catch (fallbackErr) {
              console.error(
                'BotOpponent::handleStateChange fallback error:',
                fallbackErr
              )
            }
          }
        }
      }
    } catch (err) {
      console.error('BotOpponent::handleStateChange error:', err)
    }
  }

  private tryFallbackAction(
    state: GameState<SkyWeaver>,
    secret: PlayerSecret<SkyWeaver>
  ) {
    const fallbackActions = (
      this.getValidActions(state, this.playerId, secret) as PlayerAction[]
    ).filter(c => c.type !== 'Concede')

    const fallbackAction =
      fallbackActions.find(action => action.type === 'EndTurn') ??
      fallbackActions[0]

    if (!fallbackAction) {
      this.log('No fallback action available after bot error.')
      return
    }

    this.log('Bot applying fallback action after bot error.', fallbackAction)
    const validateResult = this.validatePlayerAction(
      this.state.state,
      this.playerId,
      fallbackAction,
      secret
    )

    this.state.dispatch(fallbackAction)
    this.afterActionApplied(
      this.state.state,
      this.playerId,
      fallbackAction,
      secret,
      validateResult
    )
  }

  handleCardSelection(
    state: GameState<SkyWeaver>,
    secret: PlayerSecret<SkyWeaver>
  ): PlayerAction {
    //TODO: re-integrate old bot card selection logic
    return this.actions[0]
  }

  handleStrategy(
    state: GameState<SkyWeaver>,
    actions: PlayerAction[]
  ): PlayerAction {
    const actionPriorities: PlayerAction[] = []
    const playSummonUnitAction = this.handleSummonUnit()
    const playCastSpellAction = this.handleCastSpell(state)
    const playCastAttachedSpellAction = this.handleCastAttachedSpell(state)
    const playCastOffEnchantAction = this.handleCastOffEnchant()
    const playHeroAbilityAction = this.handleCastHeroAbility()
    const chooseCardSelection = this.handlePickChooseOption()

    if (
      // don't end early if our hero is Ready
      this.playerHero.state.view.attackState !== 'Ready' &&
      // don't end early if we have floating mana from a mana vial, that's silly
      !this.thisTurn.playedManaVial &&
      // don't end early if we're losing badly, as defined by:
      !(
        // if the opponent hero has X more life than you
        (
          this.opponentHero.state.view.health -
            this.playerHero.state.view.health >
            20 ||
          // if the opponent has x more things in play than you
          this.opponentCards.filter(l => l.zone.name === 'Field').length -
            this.playerCards.filter(l => l.zone.name === 'Field').length >
            2
        )
      ) &&
      // otherwise, Sometimes, the bot should end early, to be easier :)
      Math.random() > this.options.difficulty / 2 + 0.5
    ) {
      let action = this.actions.find(a => a.type === 'EndTurn') ?? this.actions[0]
      console.warn('RNG ENDING TURN EARLY :)')
      actionPriorities.push(action)
    }

    // Negative Enchant on Hero
    if (playCastOffEnchantAction) {
      const enchantCard = getCard(
        state,
        undefined,
        playCastOffEnchantAction.cardID
      )
      const enchantBehavior = enchantBehaviors[enchantCard.base]
      const heroAttachedCard = getAttachedCard(
        state,
        undefined,
        this.playerHero
      )

      if (
        heroAttachedCard &&
        heroAttachedCard.id === enchantCard.id &&
        enchantBehavior &&
        enchantBehavior.playable &&
        enchantBehavior.effect === 'negative'
        // enchantBehavior.damage &&
        // enchantBehavior.damage >= this.playerHero.view.health
      ) {
        actionPriorities.push(playCastOffEnchantAction)
      }
    }

    // Then summon any units sorted by highest cost
    if (playSummonUnitAction) {
      actionPriorities.push(playSummonUnitAction)
    }

    if (playCastOffEnchantAction) {
      actionPriorities.push(playCastOffEnchantAction)
    }

    // Then play attached spells sorted by highest cost
    if (playCastAttachedSpellAction) {
      actionPriorities.push(playCastAttachedSpellAction)
    }

    // Then play hand spells sorted by highest cost
    if (playCastSpellAction) {
      actionPriorities.push(playCastSpellAction)
    }
    // Then play hero ability
    if (playHeroAbilityAction) {
      actionPriorities.push(playHeroAbilityAction)
    }
    if (chooseCardSelection) {
      actionPriorities.push(chooseCardSelection)
    }

    // Only run attacks after all mana costing actions are expended
    if (!actionPriorities.length) {
      const attack = this.handleAttack(state, actions)
      if (attack) {
        return attack
      }
    }

    return actionPriorities[0] || Actions.EndTurn()
  }

  handleSummonUnit(): FindByTag<PlayerAction, { type: 'PlayCard' }> | void {
    const handUnitCards = getUnits(getZone(this.playerCards, 'Hand'))
    const playableCards = getPlayableCards(handUnitCards, this.actions).sort(
      (a, b) => b.state.view.cost - a.state.view.cost
    )

    if (!playableCards.length) {
      return
    }

    const card = playableCards[0]
    const cardActions = getValidCardActions(card, this.actions) as Array<
      FindByTag<PlayerAction, { type: 'PlayCard' }>
    >

    return getRandomItem(cardActions)
  }

  handleCastSpell(state: GameState<SkyWeaver>): PlayerAction | void {
    const handSpellCards = getSpells(getZone(this.playerCards, 'Hand'))
    const playableCards = this.filterCardsForManaVial(
      getPlayableCards(handSpellCards, this.actions).sort(
        (a, b) => b.state.view.cost - a.state.view.cost
      )
    )

    const card = playableCards.pop()
    if (!card) {
      return
    }
    const cardActions = this.getOptimalCastSpellActions(state, card)

    return getRandomItem(cardActions)
  }

  // Mana Vial should never be cast unless we have a card in-hand with cost current mana + 1
  private filterCardsForManaVial(playableCards: LocalCardInstance[]) {
    return playableCards.filter(c => {
      if (c.base !== '20017') {
        return true
      }
      const manaAfterCasting =
        this.state.state.state.players[this.playerId].mana + 1

      const allHandCards = getZone(this.playerCards, 'Hand')

      return allHandCards.some(
        c => c.state.view.isXCost || c.state.view.cost === manaAfterCasting
      )
    })
  }

  handleCastAttachedSpell(
    state: GameState<SkyWeaver>
  ): FindByTag<PlayerAction, { type: 'PlayCard' }> | void {
    const attachedSpellCards = getSpells(
      getZone(this.playerCards, 'Attachment')
    )
    const playableCards = this.filterCardsForManaVial(
      getPlayableCards(attachedSpellCards, this.actions)
    ).sort(
      (a, b) =>
        // Prioritize casting 0-cost cards, but not x-cost 0costs since those are usually bad to do.
        Number(!b.state.view.isXCost && b.state.view.cost === 0) -
          Number(!a.state.view.isXCost && a.state.view.cost === 0) ||
        b.state.view.cost - a.state.view.cost
    )

    const card = playableCards.pop()

    if (!card) {
      return
    }

    const cardActions = this.getOptimalCastSpellActions(state, card)

    return getRandomItem(cardActions)
  }

  handleCastOffEnchant(): FindByTag<PlayerAction, { type: 'PlayCard' }> | void {
    const cards = getEnchants(getZone(this.playerCards, 'Attachment'))
    const playableCards = getPlayableCards(cards, this.actions)
      .sort((a, b) => b.state.view.cost - a.state.view.cost)
      .sort((a, b) => Number(isHero(b)) - Number(isHero(a)))

    if (!playableCards.length) {
      return
    }

    const card = playableCards[0]
    const cardActions = getValidCardActions(card, this.actions) as Array<
      FindByTag<PlayerAction, { type: 'PlayCard' }>
    >
    return getRandomItem(cardActions)
  }
  handleCastHeroAbility(): FindByTag<
    PlayerAction,
    { type: 'PlayCard' }
  > | void {
    const cards = getZone(this.playerCards, 'HeroAbility')
    const playableCards = getPlayableCards(cards, this.actions)

    if (!playableCards.length) {
      return
    }

    const card = playableCards[0]
    const cardActions = getValidCardActions(card, this.actions) as Array<
      FindByTag<PlayerAction, { type: 'PlayCard' }>
    >

    return getRandomItem(cardActions)
  }
  handlePickChooseOption(): FindByTag<
    PlayerAction,
    { type: 'CommitCardSelection' }
  > | void {
    const options = this.actions.filter(a => a.type === 'CommitCardSelection') as Array<
    FindByTag<PlayerAction, { type: 'CommitCardSelection' }>
  >

    if (!options.length) {
      return
    }

    return getRandomItem(options)
  }

  handleAttack(
    state: GameState<SkyWeaver>,
    validActions: PlayerAction[]
  ): PlayerAction | undefined {
    const cards = getZone(this.playerCards, 'Field')
    const playableCards = getPlayableCards(cards, this.actions).filter(
      card => card.state.view.power > 0
    )

    if (!playableCards.length) {
      return Actions.EndTurn()
    }

    const opponentFieldCards = getZone(this.opponentCards, 'Field')
    const attackers = playableCards.sort(
      (a, b) => b.state.view.power - a.state.view.power
    )
    const attackerUnits = attackers.filter(x => !isHero(x))
    const mostPowerfulEnemyHeroAttacker: LocalCardInstance | undefined =
      attackers.filter(a =>
        validActions.some(
          act =>
            act.type === 'Attack' &&
            act.attackerID === a.id &&
            opponentFieldCards.find(f => f.id === act.defenderID && isHero(f))
        )
      )[0]
    const mostPowerfulAttacker = attackers[0]
    const mostPowerfulAttackerUnit = attackerUnits[0]
    const myTotalAttackPower = attackers.reduce(
      (acc, card) => (acc += card.state.view.power),
      0
    )
    const targets = this.actions
      .reduce<number[]>((acc, action) => {
        if (action.type === 'Attack' && !acc.includes(action.defenderID)) {
          acc.push(action.defenderID)
        }
        return acc
      }, [])
      .map(x => getCard(state, undefined, x))
      .sort((a, b) => (b.state.view.power = a.state.view.power))
    const targetUnits = targets.filter(x => !isHero(x))
    const mostPowerfulTargetUnit = targetUnits[0]
    //const mostPowerfulTarget = targets[0]
    const opponentTotalAttackPower = opponentFieldCards.reduce(
      (acc, card) => (acc += card.state.view.power),
      0
    )
    const playerGuards = getTrait(cards, 'guard')
    const opponentGuards = getTrait(opponentFieldCards, 'guard')
    const playerHeroIsGuarded = !!playerGuards.length
    const opponentHeroIsGuarded = !!opponentGuards.length
    const trades = this.getTrades(state, attackers)

    this.log('Calculating trade data', trades)

    // Can we end the game immediately?
    if (
      this.opponentHero.state.view.health <= myTotalAttackPower &&
      !opponentHeroIsGuarded &&
      mostPowerfulEnemyHeroAttacker
    ) {
      this.log(
        'I choose to attack your hero because victory is within my grasp!'
      )
      this.log(
        '- attacker:',
        mostPowerfulAttacker.state.view.power,
        mostPowerfulAttacker.state.view.health
      )
      return Actions.Attack(attackers[0].id, this.opponentHero.id)
    } else {
      if (targetUnits.length) {
        const bestTrade = trades[0]
        if (state.state.gameParams.tavernMode === 'horde') {
          //Horde Mode bot, should always attack with all valid units
          return Actions.Attack(bestTrade.attacker.id, bestTrade.target.id)
        }
        if (opponentTotalAttackPower >= this.playerHero.state.view.health) {
          if (!attackerUnits.length && !playerGuards.length) {
            // i have 0 attackers or guards and you have enough power to kill me
            // concede or suicide or sometimes just end!
            const r = Math.random()
            if (r < 1 / 3) {
              return {
                type: 'Concede'
              }
            } else {
              return Actions.EndTurn()
            }
          }
          if (attackerUnits.length) {
            // Target most powerful target first
            if (
              mostPowerfulTargetUnit.state.view.power >=
                this.playerHero.state.view.health &&
              this.actions.some(
                ac =>
                  ac.type === 'Attack' &&
                  ac.attackerID === mostPowerfulAttackerUnit.id &&
                  ac.defenderID === mostPowerfulTargetUnit.id
              )
            ) {
              this.log(
                'I am near death! I must fight off a powerful unit to survive!'
              )
              this.log(
                '- attacker:',
                mostPowerfulAttackerUnit.state.view.power,
                mostPowerfulAttackerUnit.state.view.health
              )
              this.log(
                '- target:',
                mostPowerfulTargetUnit.state.view.power,
                mostPowerfulTargetUnit.state.view.health
              )
              return Actions.Attack(
                mostPowerfulAttackerUnit.id,
                mostPowerfulTargetUnit.id
              )
            } else if (bestTrade.value !== -Infinity) {
              this.log(
                'I am near death! I must fight off your units to survive!'
              )
              this.log(
                '- attacker:',
                bestTrade.attacker.state.view.power,
                bestTrade.attacker.state.view.health
              )
              this.log(
                '- target:',
                bestTrade.target.state.view.power,
                bestTrade.target.state.view.health
              )
              return Actions.Attack(bestTrade.attacker.id, bestTrade.target.id)
            } else {
              this.log(
                'I dont see any advantageous moves at this time, ending turn early.'
              )
              return Actions.EndTurn()
            }
          } else {
            this.log(
              'I dont see any advantageous moves at this time, ending turn early.'
            )
            return Actions.EndTurn()
          }
        } else if (opponentHeroIsGuarded) {
          if (bestTrade.value > 0) {
            this.log('Your hero is guarded! I must attack a unit!')
            this.log(
              '- attacker:',
              bestTrade.attacker.state.view.power,
              bestTrade.attacker.state.view.health
            )
            this.log(
              '- target:',
              bestTrade.target.state.view.power,
              bestTrade.target.state.view.health
            )
            return Actions.Attack(bestTrade.attacker.id, bestTrade.target.id)
          } else {
            this.log(
              'I dont see any advantageous moves at this time, ending turn early.'
            )
            return Actions.EndTurn()
          }
        } else {
          if (
            mostPowerfulEnemyHeroAttacker &&
            mostPowerfulEnemyHeroAttacker.state.view.power > bestTrade.value &&
            (myTotalAttackPower >= opponentTotalAttackPower ||
              playerHeroIsGuarded)
          ) {
            this.log('My best option is to attack your hero!')
            this.log(
              '- attacker:',
              mostPowerfulEnemyHeroAttacker.state.view.power,
              mostPowerfulEnemyHeroAttacker.state.view.health
            )
            return Actions.Attack(
              mostPowerfulEnemyHeroAttacker.id,
              this.opponentHero.id
            )
          } else {
            if (bestTrade.value > 0) {
              this.log('My best option is to attack your unit!')
              this.log(
                '- attacker:',
                bestTrade.attacker.state.view.power,
                bestTrade.attacker.state.view.health
              )
              this.log(
                '- target:',
                bestTrade.target.state.view.power,
                bestTrade.target.state.view.health
              )
              return Actions.Attack(bestTrade.attacker.id, bestTrade.target.id)
            } else {
              this.log(
                'I dont see any advantageous moves at this time, ending turn early.'
              )
              return Actions.EndTurn()
            }
          }
        }
      } else if (mostPowerfulEnemyHeroAttacker) {
        // No target units - attack hero
        return Actions.Attack(mostPowerfulAttacker.id, this.opponentHero.id)
      } else {
        return undefined
      }
    }
  }

  getTrades(state: GameState<SkyWeaver>, cards: LocalCardInstance[]): Trade[] {
    return cards
      .reduce((acc, attacker) => {
        this.getValidTargets(state, attacker).forEach(target => {
          if (target) {
            acc.push({
              attacker,
              target,
              value: getTradeValue(attacker, target)
            })
          }
        })
        return acc
      }, [] as Trade[])
      .sort((a: Trade, b: Trade) => b.value - a.value)
  }

  getValidTargets(
    state: GameState<SkyWeaver>,
    card: LocalCardInstance
  ): Array<LocalCardInstance | null> {
    return getValidCardActions(card, this.actions).map(action => {
      let targetId: number | undefined

      if (action.type === 'PlayCard') {
        targetId = action.targetID
      } else if (action.type === 'Attack') {
        targetId = action.defenderID
      }

      return typeof targetId === 'number'
        ? getCard(state, undefined, targetId)
        : null
    })
  }

  getOptimalCastSpellActions(
    state: GameState<SkyWeaver>,
    card: LocalCardInstance
  ): Array<FindByTag<PlayerAction, { type: 'PlayCard' }>> {
    if (card.state.view.type !== 'spell') {
      throw new Error('Cannot get spell targets from a non spell card')
    }

    const cardActions = getValidCardActions(card, this.actions) as Array<
      FindByTag<PlayerAction, { type: 'PlayCard' }>
    >
    const meta = this.cardLibrary.get(card.base)

    if (cardActions.length && meta) {
      const { spellBehaviour } = meta

      switch (spellBehaviour) {
        case 'positive':
          return cardActions
        case 'negative':
          return cardActions
        case 'offensive':
          return cardActions.filter(
            action =>
              action.type === 'PlayCard' &&
              (action.targetID === undefined ||
                isEnemy(
                  this.player,
                  getCard(state, undefined, action.targetID)
                ))
          )

        case 'defensive':
          return cardActions.filter(
            action =>
              action.type === 'PlayCard' &&
              (action.targetID === undefined ||
                isAlly(this.player, getCard(state, undefined, action.targetID)))
          )
      }
    }

    return cardActions
  }
}

export class WasmStateBotOpponent<T> extends BotOpponent<WasmState, T> {
  onStateChange: (
    state: GameState<SkyWeaver>,
    secrets: PlayerSecret<SkyWeaver>[]
  ) => void = () => {}
  constructor(
    playerId: Player,
    createState: (
      self: BotOpponent<WasmState, T>
    ) => [
      WasmState,
      GetValidActions,
      ValidatePlayerAction<T>,
      typeof CardLibrary,
      AfterActionApplied<T>
    ],
    options: Partial<
      BotOpponentOptions & {
        onStateChange: (
          state: GameState<SkyWeaver>,
          secrets: PlayerSecret<SkyWeaver>[]
        ) => void
      }
    > = {}
  ) {
    super(playerId, createState, options)
    if (options.onStateChange) {
      this.onStateChange = options.onStateChange
    }
  }
  buildStateFromRawState(rawState: WasmState): State {
    return {
      dispatch: action => this.apply(this.playerId, action),
      get state() {
        return rawState.hasState() ? rawState.state : undefined
      }
    }
  }
  apply(player: Player | undefined, action: PlayerAction) {
    this.rawState.apply(player, action)
    this.onStateChange(this.state.state, [
      this.rawState.secret(0),
      this.rawState.secret(1)
    ])
  }
  secret(player: Player): PlayerSecret<SkyWeaver> {
    return this.rawState.secret(player)
  }
  simulate(
    player: Player | undefined,
    action: PlayerAction,
    secretsToUse: readonly [boolean, boolean]
  ): {
    status: 'complete' | 'incomplete'
    events: Array<CardEvent<SkyWeaver>>
  } {
    return this.rawState.simulate(player, action, secretsToUse)
  }
}

export class WasmMatchBotOpponent<T> extends BotOpponent<WasmMatch, T> {
  buildStateFromRawState(rawState: WasmMatch): State {
    return {
      dispatch: action => rawState.dispatch(action),
      get state() {
        return rawState.hasState() ? rawState.state : undefined
      }
    }
  }
  apply(diff: Uint8Array): Promise<void> {
    return new Promise(res =>
      setTimeout(() => {
        this.rawState.apply(diff)
        res()
      }, 1)
    )
  }
}

export function pickBestStartingCards(
  mulliganChoiceSize: number,
  cardsArray: Array<CardInstance<SkyWeaver>>,
  selected: Set<number> = new Set()
): FindByTag<PlayerAction, { type: 'CommitCardSelection' }> {
  if (cardsArray.length < mulliganChoiceSize) {
    return {
      type: 'CommitCardSelection',
      cardIndices: [] // will fail :)
    }
  }
  const cardSelectionCards = new Set(
    [...cardsArray.keys()].filter(i => !selected.has(i))
  )
  const buckets = Array.from(
    { length: mulliganChoiceSize },
    (_, i) => i + 1
  ).filter(cost => {
    for (const i of selected) {
      if (cardsArray[i].state.view.cost === cost) {
        return false
      }
    }
    return true
  })

  while (selected.size < mulliganChoiceSize) {
    // Group by card cost
    const groups = [...cardSelectionCards].reduce<{
      [key: number]: number[]
    }>((acc, i) => {
      const { cost } = cardsArray[i].state.view
      ;(acc[cost] = acc[cost] || []).push(i)

      return acc
    }, {})

    const groupCosts = Object.keys(groups).map(Number)

    // Find best cost for curve
    const targetCost = buckets.shift()!
    let minDist = Infinity
    let bestCost = groupCosts[0]
    for (const cost of groupCosts) {
      const dist = Math.abs(targetCost - cost)

      if (dist < minDist) {
        minDist = dist
        bestCost = cost
      }
    }

    const bestCards = groups[bestCost]
    // Prioritize units
    // TODO Rather than selecting a random on curve card it should balance units and spells
    bestCards.sort(
      (a, b) =>
        Number(isUnit(cardsArray[b].state.view)) -
        Number(isUnit(cardsArray[a].state.view))
    )
    // const units = getUnits(bestCards)
    // const spells = getSpells(bestCards)
    const card = bestCards[0]

    cardSelectionCards.delete(card)

    selected.add(card)
  }

  return { type: 'CommitCardSelection', cardIndices: [...selected] }
}

// Utils

const getPlayer = (
  state: GameState<SkyWeaver>,
  playerId: number
): PlayerState => state.state.players[playerId]

const getOpponent = (
  state: GameState<SkyWeaver>,
  playerId: number
): PlayerState => state.state.players[1 - playerId]

function getOwner(id: InstanceID, state: GameState<SkyWeaver>): Player {
  const instance = state.instances[id]

  if ('player' in instance) {
    return instance.player
  }

  for (let player = 0; player < state.playerCards.length; player++) {
    const playerCards = state.playerCards[player]
    const collections = [
      playerCards.hand,
      playerCards.field,
      playerCards.graveyard,
      playerCards.dust,
      playerCards.limbo,
      playerCards.casting
    ]

    for (const collection of collections) {
      if (collection.includes(id)) {
        return player as Player
      }
    }
  }

  for (let parent = 0; parent < state.instances.length; parent++) {
    const instance = state.instances[parent]
    if ('instance' in instance && instance.instance.attachment === id) {
      return getOwner(parent, state)
    }
  }

  throw new Error(`public card #${id} not in any public zone`)
}

const getCard = (
  state: GameState<SkyWeaver>,
  secret: PlayerSecret<SkyWeaver> | undefined,
  cardId: number
): LocalCardInstance =>
  getCardsForPlayer(state, getOwner(cardId, state), secret).find(
    c => c.id === cardId
  )!

const getAttachedCard = (
  state: GameState<SkyWeaver>,
  secret: PlayerSecret<SkyWeaver> | undefined,
  card: LocalCardInstance
) => card.attachment && getCard(state, secret, card.attachment)

const getCardsForPlayer = (
  state: GameState<SkyWeaver>,
  player: Player,
  secret?: PlayerSecret<SkyWeaver>
): LocalCardInstance[] => {
  if (secret && secret.player !== player) {
    secret = undefined
  }

  const cards = state.playerCards[player]
  const instances = ([] as LocalCardInstance[]).concat(
    cards.hand
      .filter(id => id !== undefined)
      .map(id => ({
        ...(state.instances[id!] as any).instance,
        owner: player,
        zone: { name: 'Hand', public: true }
      })),
    cards.field.map(id => ({
      ...(state.instances[id] as any).instance,
      owner: player,
      zone: { name: 'Field' }
    })),
    cards.graveyard.map(id => ({
      ...(state.instances[id] as any).instance,
      owner: player,
      zone: { name: 'Graveyard' }
    })),
    cards.dust.map(id => ({
      ...(state.instances[id] as any).instance,
      owner: player,
      zone: { name: 'Dust', public: true }
    })),
    cards.limbo.map(id => ({
      ...(state.instances[id] as any).instance,
      owner: player,
      zone: { name: 'Limbo', public: true }
    })),
    cards.casting.map(id => ({
      ...(state.instances[id] as any).instance,
      owner: player,
      zone: { name: 'Casting' }
    })),
    cards.heroAbility.map(id => ({
      ...(state.instances[id] as any).instance,
      owner: player,
      zone: { name: 'HeroAbility' }
    }))
  )
  const attachments = instances.reduce<LocalCardInstance[]>((list, parent) => {
    if (parent.attachment) {
      const id = parent.attachment
      list.push({
        ...(state.instances[id] as any).instance,
        owner: player,
        zone: { name: 'Attachment', parent: { id: parent.id } }
      })
    }
    return list
  }, [])
  instances.push(...attachments)

  if (secret) {
    const secrets = [
      ...secret.deck.map(
        (id): LocalCardInstance => ({
          ...secret!.instances.get(id)!,
          owner: player,
          zone: { name: 'Deck' }
        })
      ),
      ...secret.hand
        .filter(id => id !== undefined)
        .map(
          (id): LocalCardInstance => ({
            ...secret!.instances.get(id!)!,
            owner: player,
            zone: { name: 'Hand', public: false }
          })
        ),
      ...secret.dust.map(
        (id): LocalCardInstance => ({
          ...secret!.instances.get(id)!,
          owner: player,
          zone: { name: 'Dust', public: false }
        })
      ),
      ...secret.limbo.map(
        (id): LocalCardInstance => ({
          ...secret!.instances.get(id)!,
          owner: player,
          zone: { name: 'Limbo', public: false }
        })
      ),
      ...secret.cardSelection.map(
        (id): LocalCardInstance => ({
          ...secret!.instances.get(id)!,
          owner: player,
          zone: { name: 'CardSelection' }
        })
      )
    ]
    const secretAttachments = secrets.reduce<LocalCardInstance[]>(
      (list, parent) => {
        if (parent.attachment) {
          const id = parent.attachment
          list.push({
            ...secret!.instances.get(id)!,
            owner: player,
            zone: { name: 'Attachment', parent: { id: parent.id } }
          })
        }
        return list
      },
      []
    )
    instances.push(...secrets, ...secretAttachments)
  }

  return instances
}

const isHero = (card: CardInstance<SkyWeaver>) => card.id === 0 || card.id === 1

const isAlly = (player: PlayerState, card: LocalCardInstance) =>
  card.owner === player.id

const isEnemy = (player: PlayerState, card: LocalCardInstance) =>
  !isAlly(player, card)

const isUnit = (card: CardAttributes) => card.type === 'unit'
// const isSpell = (card: CardInstance) => card.view.type === 'Spell'
// const isEnchant = (card: CardInstance) => card.view.type === 'Enchant'

const getRandomIndex = (arr: any[]) => {
  if (arr.length) {
    return Math.floor(Math.random() * arr.length)
  } else {
    return -1
  }
}

const getRandomItem = <T extends any>(arr: T[]): T | undefined => {
  const idx = getRandomIndex(arr)

  if (idx >= 0) {
    return arr[idx]
  }

  return undefined
}

const getValidCardActions = (
  card: CardInstance<SkyWeaver>,
  actions: PlayerAction[]
) => {
  return actions.filter(
    action =>
      (action.type === 'PlayCard' && action.cardID === card.id) ||
      (action.type === 'Attack' && action.attackerID === card.id)
  )
}

const getPlayableCards = (
  cards: LocalCardInstance[],
  actions: PlayerAction[]
) => {
  return cards.reduce<LocalCardInstance[]>((acc, card) => {
    if (getValidCardActions(card, actions).length) {
      acc.push(card)
    }
    return acc
  }, [])
}

const getEffectiveDamage = (
  attacker: CardInstance<SkyWeaver>,
  target: CardInstance<SkyWeaver>
): number => {
  const damage = target.state.view.traits.includes('armor')
    ? Math.max(attacker.state.view.power - 1, 0)
    : attacker.state.view.power

  return Math.min(damage, target.state.view.health)
}

// When ever you attack a card you should be thinking about winning the trade
const getTradeValue = (
  attacker: LocalCardInstance,
  target: LocalCardInstance
): number => {
  const attackerValue = isHero(attacker)
    ? Infinity
    : attacker.state.view.power +
      attacker.state.view.health +
      getTraitsValue(attacker)
  const targetValue = isHero(target)
    ? Infinity
    : target.state.view.power +
      target.state.view.health +
      getTraitsValue(target)

  let result = 0

  const attackerEffectiveDamage = getEffectiveDamage(attacker, target)
  if (attackerEffectiveDamage >= target.state.view.health) {
    result += targetValue
  } else if (attackerEffectiveDamage === 0) {
    result -= Infinity
  } else {
    result += attackerEffectiveDamage
  }

  const targetEffectiveDamage = isHero(target)
    ? 0
    : getEffectiveDamage(target, attacker)

  if (targetEffectiveDamage >= attacker.state.view.health) {
    result -= attackerValue
  } else {
    // Scale negative damage on hero to preserve health as much as possible
    if (
      isHero(attacker) &&
      targetEffectiveDamage / attacker.state.view.health > 0.2
    ) {
      result -= Infinity
    } else {
      result -= targetEffectiveDamage
    }
  }

  return result
}

const getZone = (cards: LocalCardInstance[], zone: Zone['name']) =>
  cards.filter(card => card.zone.name === zone)

const getHero = (
  state: GameState<SkyWeaver>,
  player: Player
): LocalCardInstance =>
  getCardsForPlayer(state, player).find(c => c.state.view.type === 'hero')!

const getUnits = (cards: LocalCardInstance[]) =>
  cards.filter(card => card.state.view.type === 'unit')

const getSpells = (cards: LocalCardInstance[]) =>
  cards.filter(card => card.state.view.type === 'spell')

const getEnchants = (cards: LocalCardInstance[]) =>
  cards.filter(card => card.state.view.type === 'enchant')

const getTrait = (cards: LocalCardInstance[], trait: Trait) =>
  cards.filter(card => card.state.view.traits.includes(trait))

const validateAction = (actions: PlayerAction[], action: any) => {
  const keys = Object.keys(action)
  return actions.some((x: any) => keys.every(key => action[key] === x[key]))
}

const delay = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms))

const getTraitsValue = (card: LocalCardInstance) =>
  card.state.view.traits.reduce(
    (value, trait) => value + TRAIT_VALUE[trait](card),
    0
  )

const DELAY_SECONDS = {
  normal: { min: 2.5, max: 5 },
  attack: { min: 1.4, max: 3 },
  startTurn: { min: 5, max: 12 },
  endTurn: { min: 0.1, max: 2.5 }
} as const satisfies Record<string, { min: number; max: number }>
// Rules from matta
const TRAIT_VALUE: { [K in Trait]: (unit: LocalCardInstance) => number } = {
  stealth: () => 1,
  armor: u => 2 + (1 / 3) * u.state.view.health,
  banner: () => 1,
  dash: u => 1 + (u.state.view.power + u.state.view.health) / 10,
  guard: u => 0.5 + u.state.view.health / 10,
  lifesteal: u => 0.5 + u.state.view.health / 6,
  wither: () => 0.5
}
