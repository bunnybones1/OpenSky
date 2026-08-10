import { TFuncKey } from '@opensky/language-manager'
import {
  ActionStep,
  AttachedCardTarget,
  FieldTarget,
  GameStateCondition,
  GraveTarget,
  HandTarget,
  HeroTarget,
  MessageStep,
  PlayerActionCreator,
  PlayerActionFilter,
  PlayerActionOptions,
  PlayerActionStep,
  Target,
  UnitTarget
} from '@opensky/shared/tutorialConfig'
import { CardInstance, SkyWeaver } from '@skyweaver/state-metadata'

import { asArray } from './utils'

type MessageOptions = Omit<MessageStep, 'type' | 'key' | 'text'>
export const message = (
  key: string | undefined,
  text: TFuncKey,
  options: MessageOptions = {}
): MessageStep => {
  return { type: 'message', key, text, ...options }
}

export const nonTranslatedMessage = (
  key: string | undefined,
  text: string,
  options: MessageOptions = {}
): MessageStep => {
  return { type: 'message', key, text, ...options }
}

// export const enemyMessage = (
//   key: string | undefined,
//   text: string,
//   options: MessageOptions = {}
// ): MessageStep => {
//   return { type: 'message', key, text, source: Target.EnemyHero, ...options }
// }

type ActionOptions = Omit<ActionStep, 'type' | 'actions'>

export const action = (
  actions: PlayerActionStep[] | PlayerActionStep,
  options: ActionOptions = {}
): ActionStep => {
  return { type: 'action', actions, ...options }
}

export const playCard = (
  card: HandTarget | AttachedCardTarget,
  target?: UnitTarget | HeroTarget,
  options: Partial<PlayerActionOptions> = {}
) => {
  const playCardFilter: PlayerActionFilter = (
    state,
    player,
    secret,
    validActions
  ) => {
    const cardID = card.getInstanceID(state, secret)
    const targetIDs = ([] as Array<number | undefined>)
      .concat(target && target.getInstanceIDs(state, secret))
      .filter(x => typeof x === 'number') as number[]

    return validActions.filter(
      action =>
        action.type === 'PlayCard' &&
        action.cardID === cardID &&
        (action.targetID === undefined
          ? !target
          : targetIDs!.some(targetID => action.targetID === targetID))
    )
  }

  return { filter: playCardFilter, options: { highlight: card, ...options } }
}

export const attack = (
  attacker: UnitTarget | HeroTarget,
  defender: UnitTarget | HeroTarget,
  options: Partial<PlayerActionOptions> = {}
) => {
  const attackFilter: PlayerActionFilter = (
    state,
    player,
    secret,
    validActions
  ) => {
    const attackerID = attacker.getInstanceID(state, secret)
    const defenderIDs = defender.getInstanceIDs(state, secret)

    return validActions.filter(
      action =>
        action.type === 'Attack' &&
        action.attackerID === attackerID &&
        defenderIDs.some(defenderID => action.defenderID === defenderID)
    )
  }

  return {
    filter: attackFilter,
    options: { highlight: [attacker, defender], ...options }
  }
}

export const attackWithAllCharacters = (
  options: Partial<PlayerActionOptions> = {}
) => {
  const filter: PlayerActionFilter = (state, player, secret, validActions) => {
    return validActions.filter(action => action.type === 'Attack')
  }

  return { filter, options, multi: true }
}

export const attackWithAllCharactersExceptIfHeroWouldHitAUnit = (
  options: Partial<PlayerActionOptions> = {}
) => {
  const filter: PlayerActionFilter = (state, player, secret, validActions) => {
    return validActions.filter(
      action =>
        action.type === 'Attack' &&
        (action.attackerID > 1 || action.defenderID <= 1)
    )
  }

  return { filter, options, multi: true }
}

// export const anyExceptEndTurn: PlayerActionCreator = (
//   options: Partial<PlayerActionOptions> = {}
// ) => {
//   const filter: PlayerActionFilter = (state, player, secret, validActions) => {
//     return validActions.filter(action => action.type !== 'EndTurn')
//   }
//   return { filter, options, multi: true }
// }

export const endTurn: PlayerActionCreator = () => {
  const filter: PlayerActionFilter = (state, player, secret, validActions) => {
    return validActions.filter(action => action.type === 'EndTurn')
  }

  return { filter, options: { highlight: Target.EndTurn } }
}

export function cardIsInGrave(card: GraveTarget): GameStateCondition {
  return (state, _player, secret) => {
    const id = card.getInstanceID(state, secret)
    return id !== undefined
  }
}

export function unitIsInPlay(unit: UnitTarget): GameStateCondition {
  return (state, _player, secret) => {
    const id = unit.getInstanceID(state, secret)
    return id !== undefined
  }
}

export function characterIsCondition(
  unit: FieldTarget,
  condition: (card: CardInstance<SkyWeaver>) => boolean
): GameStateCondition {
  return (state, _player, secret) => {
    const ids = unit.getInstanceIDs(state, secret)
    return ids.some(id =>
      condition(
        (state.instances[id] as { instance: CardInstance<SkyWeaver> }).instance
      )
    )
  }
}

export function unitIsExhausted(unit: UnitTarget): GameStateCondition {
  return characterIsCondition(
    unit,
    u => u.state.view.attackState === 'Exhausted'
  )
}

export function turnsPassed(turns: number): GameStateCondition {
  return state => state.state.turnCount > turns
}

export function any_of(...funs: GameStateCondition[]): GameStateCondition {
  return (...args: Parameters<GameStateCondition>) => funs.some(f => f(...args))
}

export function not(fun: GameStateCondition): GameStateCondition {
  return (...args: Parameters<GameStateCondition>) => !fun(...args)
}

export function all_of(...funs: GameStateCondition[]): GameStateCondition {
  return (...args: Parameters<GameStateCondition>) =>
    funs.every(f => f(...args))
}

export function linkedConditions(
  conditions: [PlayerActionStep, PlayerActionStep, ...PlayerActionStep[]],
  success: MessageStep[]
): Array<PlayerActionStep & { conditionKey?: string }> {
  const conditionKey = `${Math.random() * 100_000}`
  return conditions.map(c => ({
    ...c,
    options: {
      ...c.options,
      successMessage: [...asArray(c.options?.successMessage ?? []), ...success]
    },
    conditionKey
  }))
}
