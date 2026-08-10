import { GameMode, Hero } from '@opensky/proto'
import { CardCache } from '@opensky/shared/cardCache'
import {
  BaseCard,
  CardEvent,
  GameState,
  InstanceID,
  PhaseResolveTrigger,
  Player,
  PlayerAction,
  PlayerSecret,
  Prism,
  SkyWeaver
} from '@skyweaver/state-metadata'

// Quests lang files
import type * as quests from '../locales/en/quests.json'
export type QuestsI18nResources = {
  quests: typeof quests
}
export const questsI18nNamespaces = ['quests'] as const

// At DB level, Quests will have a count they need to have to complete - some will be 1, some 3, etc.

export interface StateInfo {
  player: Player
  lastEvent?: CardEvent<SkyWeaver>
  eventsThisAction: ReadonlyArray<CardEvent<SkyWeaver>>
  cardCache: CardCache
  beforeEventState?: GameState<SkyWeaver>
  beforeEventSecret?: PlayerSecret<SkyWeaver>
  beforeEventEnemySecret?: PlayerSecret<SkyWeaver>
  cardExecutionContext?: InstanceID
  triggerResolutionContext?: PhaseResolveTrigger
  interlacedResolutionContext?: InstanceID
}

export interface QuestStateImpl<State> {
  initState: () => State
  modifyState: (
    props: StateInfo & {
      state: State
      emitProgress: (progress: number) => void
    }
  ) => State
}

export function instantOneTimeEvent(
  didFinish: (props: StateInfo) => boolean | number | void
): QuestStateImpl<{ done: boolean }> {
  return oneTimeEvent({
    done: s => s,
    initState: () => false,
    modifyState: p => Boolean(didFinish(p))
  })
}

export function oneTimeEvent<T>(
  inner: QuestStateImpl<T> & { done: (s: T) => boolean }
): QuestStateImpl<{ done: false; innerState: T } | { done: true }> {
  return {
    initState: () => ({ done: false, innerState: inner.initState() }),
    modifyState(props) {
      const { state } = props
      if (state.done) {
        return state
      }
      const innerState = inner.modifyState({
        ...props,
        state: state.innerState
      })
      if (inner.done(innerState)) {
        props.emitProgress(1)
        return { done: true }
      }
      return { innerState, done: false }
    }
  }
}

/// An event that adds N progress every time it happens
export function accumulated(
  accumulate: (props: StateInfo) => number | boolean | void
): QuestStateImpl<void> {
  return {
    initState: () => undefined,
    modifyState(props) {
      const progress = accumulate(props)
      if (progress !== undefined) {
        props.emitProgress(Number(progress))
        return
      }
      return
    }
  }
}

/// Use two impls. It will emit when either emits
export function implOr(
  ...impls: Array<QuestStateImpl<unknown>>
): QuestStateImpl<Array<unknown>> {
  return {
    initState: () => impls.map(impl => impl.initState()),
    modifyState: props => {
      return impls.map((impl, i) =>
        impl.modifyState({ ...props, state: props.state[i] })
      )
    }
  }
}

/// An event that increases its state by a number every time it happens
export function count(
  accumulate: (props: StateInfo) => number | boolean | void
): QuestStateImpl<number> {
  return {
    initState: () => 0,
    modifyState(props) {
      const n = accumulate(props)

      if (Number.isNaN(n)) {
        throw new Error('got NaN back from accumulator')
      }
      return props.state + (typeof n === 'number' ? n : Number(Boolean(n)))
    }
  }
}

type BaseQuestImplementation = {
  gameModeFilter?: GameMode[]
  heroFilter?: Hero[]
  constructedDeckFilter?: (bases: BaseCard[]) => boolean
}

export type QuestImplementation = BaseQuestImplementation &
  QuestStateImpl<unknown>

export type GameStateFilter = (
  player: Player,
  gameState: GameState<SkyWeaver>,
  secret: PlayerSecret<SkyWeaver>
) => boolean

export interface QuestImplTestPlayer {
  prisms: Prism | [Prism, Prism]
  cards: BaseCard[]
}
export type QuestImplTestJson = {
  players: [QuestImplTestPlayer, QuestImplTestPlayer]
  actions: Array<[Player | undefined, PlayerAction]>
}
