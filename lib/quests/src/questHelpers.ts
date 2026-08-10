import { Hero } from '@opensky/proto'
import { CardCache } from '@opensky/shared/cardCache'
import {
  BaseCard,
  CardEvent,
  CardInstance,
  CardLocation,
  EffectType,
  ExactCardLocation,
  FindByTag,
  InstanceID,
  Modifier,
  Player,
  ResolvedPhaseAttack,
  ResolvedPhaseDamage,
  SkyWeaver
} from '@skyweaver/state-metadata'

import {
  instantOneTimeEvent,
  oneTimeEvent,
  QuestImplementation,
  QuestStateImpl,
  StateInfo
} from './types'

export const gameFinish: (props: StateInfo) => boolean = ({
  beforeEventState: state
}) => state?.state.status.type === 'GameOver'

export const gameWin: (props: StateInfo) => boolean = ({
  beforeEventState: state,
  player: p
}) => state?.state.status.type === 'GameOver' && state.state.status.winner === p

export const gameLose: (props: StateInfo) => boolean = ({
  beforeEventState: state,
  player: p
}) => state?.state.status.type === 'GameOver' && state.state.status.winner !== p

export const gameDraw: (props: StateInfo) => boolean = ({
  beforeEventState: state
}) =>
  state?.state.status.type === 'GameOver' &&
  state?.state.status.winner === undefined

export function findMap<T, O>(
  array: T[],
  findMap: (item: T) => undefined | O
): O | undefined {
  for (const item of array) {
    const xx = findMap(item)
    if (xx !== undefined) {
      return xx
    }
  }
  return undefined
}

export function hero(
  player: Player,
  cardCache: CardCache
): CardInstance<SkyWeaver> | undefined {
  return field(player, cardCache).find(c => c.state.view.type === 'hero')
}

export function cardPlayed(
  player: Player,
  actionStack: ReadonlyArray<CardEvent<SkyWeaver>>,
  filter: (c: CardInstance<SkyWeaver>) => boolean
): boolean {
  const playCardAction = actionStack.find(
    a =>
      a.type === 'GameEvent' &&
      a.payload.event.type === 'EnterPlayerAction' &&
      a.payload.event.payload[0] === player &&
      a.payload.event.payload[1].type === 'PlayCard'
  )
  if (!playCardAction) {
    return false
  }
  const a = actionStack[actionStack.length - 1]
  if (a.type === 'MoveCard' && a.payload.to.location[0].name === 'Casting') {
    const card = a.payload.instance?.[0]
    if (!card) {
      return false
    }
    if (filter(card)) {
      return true
    }
  }
  return false
}

export function summonUnit(
  filter: (c: CardInstance<SkyWeaver>, props: StateInfo) => boolean = () => true
): (props: StateInfo) => number | void {
  return props => {
    const { lastEvent: last, player } = props
    if (
      last?.type === 'MoveCard' &&
      last.payload.to.location[0].name === 'Field' &&
      last.payload.to.player === player &&
      last.payload.instance &&
      filter(last.payload.instance[0], props)
    ) {
      return 1
    }
    return
  }
}

export type ShouldResetCallback = (
  props: StateInfo
) => boolean | number | void | undefined

export function resetStatefulEventOnCondition<T>(
  event: QuestStateImpl<T>,
  shouldReset: ShouldResetCallback
): QuestStateImpl<T> {
  return {
    initState: event.initState,
    modifyState: props => {
      if (shouldReset(props)) {
        const state = event.initState()
        return event.modifyState({ ...props, state })
      }
      return event.modifyState(props)
    }
  }
}

export const resetsAfterTurn: ShouldResetCallback = ({ lastEvent }) => {
  return (
    lastEvent?.type === 'GameEvent' &&
    lastEvent.payload.event.type === 'ExitPhase' &&
    lastEvent.payload.event.payload.type === 'EndTurn'
  )
}

export const resetsAfterPlayerAction: ShouldResetCallback = ({ lastEvent }) => {
  return (
    lastEvent?.type === 'GameEvent' &&
    lastEvent.payload.event.type === 'ExitPlayerAction'
  )
}

export function field(
  player: Player,
  cardCache: CardCache
): Array<CardInstance<SkyWeaver>> {
  return [0, 1, 2, 3, 4, 5, 6]
    .map(idx =>
      cardCache.getInstance({
        player,
        location: [{ name: 'Field' }, idx]
      })
    )
    .filter(isDefined)
}

export function graveyard(
  player: Player,
  cardCache: CardCache
): Array<CardInstance<SkyWeaver>> {
  const g: CardInstance<SkyWeaver>[] = []
  cardCache.forEachInstance((i, l) => {
    if (l.player === player && l.location[0].name === 'Graveyard') {
      g.push(i)
    }
  })
  return g
}

export function hand(
  player: Player,
  cardCache: CardCache
): Array<CardInstance<SkyWeaver>> {
  const g: CardInstance<SkyWeaver>[] = []
  cardCache.forEachInstance((i, l) => {
    if (l.player === player && l.location[0].name === 'Hand') {
      g.push(i)
    }
  })
  return g
}

export function isDefined<T>(input: T | null | undefined): input is T {
  return typeof input !== 'undefined' && input !== null
}

export function getLastEvent(
  events: CardEvent<SkyWeaver>[]
): CardEvent<SkyWeaver> | undefined {
  if (!events.length) {
    return
  }
  const last = events[events.length - 1]
  return last
}

export function whenPlayersNonHeroAbilCardPlayed(
  matches: (card: CardInstance<SkyWeaver>, playedForCost: number) => boolean
): (props: StateInfo) => number | undefined {
  return ({ lastEvent: last, cardCache, player }) => {
    if (
      last?.type === 'GameEvent' &&
      last.payload.event.type === 'ExitPhase' &&
      last.payload.event.payload.type === 'ResolveCardEffect'
    ) {
      const card = cardCache.getInstance(last.payload.event.payload.payload.id)
      if (
        card &&
        cardCache.getLocation(card)?.player === player &&
        card.state.view.type !== 'heroAbility' &&
        matches(card, last.payload.event.payload.payload.playedManaCost)
      ) {
        return 1
      }
    }
    return
  }
}

export const whenAllyUnitDestroyed = (
  matches: (
    card: CardInstance<SkyWeaver>,
    props: Omit<StateInfo, 'lastEvent'> & {
      lastEvent: FindByTag<CardEvent<SkyWeaver>, { type: 'MoveCard' }>
    },
    killer?: CardInstance<SkyWeaver>
  ) => boolean = () => true
) =>
  whenUnitDestroyed((card, props, killer) => {
    return (
      props.lastEvent.payload.from.player === props.player &&
      props.lastEvent.payload.to.player === props.player &&
      matches(card, props, killer)
    )
  })

export const whenEnemyUnitDestroyed = (
  matches: (
    card: CardInstance<SkyWeaver>,
    props: Omit<StateInfo, 'lastEvent'> & {
      lastEvent: FindByTag<CardEvent<SkyWeaver>, { type: 'MoveCard' }>
    },
    killer?: CardInstance<SkyWeaver>
  ) => boolean = () => true
) =>
  whenUnitDestroyed((card, props, killer) => {
    return (
      props.lastEvent.payload.from.player === 1 - props.player &&
      props.lastEvent.payload.to.player === 1 - props.player &&
      matches(card, props, killer)
    )
  })

export function whenUnitDestroyed(
  matches: (
    card: CardInstance<SkyWeaver>,
    props: Omit<StateInfo, 'lastEvent'> & {
      lastEvent: FindByTag<CardEvent<SkyWeaver>, { type: 'MoveCard' }>
    },
    killer?: CardInstance<SkyWeaver>
  ) => boolean = () => true
): (props: StateInfo) => number | undefined {
  return props => {
    const { lastEvent: last, cardCache } = props
    if (last?.type !== 'MoveCard') {
      return
    }
    // from field
    if (last.payload.from.location?.[0].name !== 'Field') {
      return
    }
    // to grave or dust
    if (
      last.payload.to.location[0].name !== 'Graveyard' &&
      last.payload.to.location[0].name !== 'Dust'
    ) {
      return
    }
    const card = last.payload.instance
    if (!card) {
      return
    }

    const killer =
      card[0].state.view.markedForDeath !== undefined
        ? cardCache.getInstance(card[0].state.view.markedForDeath)
        : undefined
    if (!matches(card[0], { ...props, lastEvent: last }, killer)) {
      return
    }
    return 1
  }
}

export function whenCardMoved(
  matches: (props: {
    mover: CardInstance<SkyWeaver> | undefined
    card: CardInstance<SkyWeaver> | undefined
    from: CardLocation
    to: ExactCardLocation
    props: StateInfo
  }) => boolean
): (props: StateInfo) => number | void {
  return props => {
    const { lastEvent: last, cardCache, interlacedResolutionContext } = props
    if (last?.type !== 'MoveCard') {
      return
    }

    const card = cardCache.getInstance(interlacedResolutionContext)
    if (
      matches({
        card: last.payload.instance?.[0],
        from: last.payload.from,
        to: last.payload.to,
        mover: card,
        props
      })
    ) {
      return 1
    } else {
      return 0
    }
  }
}

const gameEnded = ({ beforeEventState }: StateInfo): boolean =>
  beforeEventState?.state.status.type === 'GameOver'

export function playAGameAs(hero: Hero[] | Hero): QuestImplementation {
  return {
    ...instantOneTimeEvent(gameEnded),
    heroFilter: Array.isArray(hero) ? hero : [hero]
  } as const
}

export function winAGameAs(hero: Hero[] | Hero): QuestImplementation {
  return {
    ...instantOneTimeEvent(gameWin),
    heroFilter: Array.isArray(hero) ? hero : [hero]
  } as const
}

export function and<T extends (...args: G) => boolean, G extends unknown[]>(
  ...fns: T[]
): (...args: G) => boolean {
  return (...args) => fns.every(fn => fn(...args))
}
export function or<T extends (...args: G) => boolean, G extends unknown[]>(
  ...fns: T[]
): (...args: G) => boolean {
  return (...args) => fns.some(fn => fn(...args))
}

export function gameEndedWithoutProgressFrom<T>(
  t: QuestStateImpl<T>,
  ended = gameEnded
) {
  return oneTimeEvent({
    initState: () => ({
      happened: false,
      gameEnded: false,
      state: t.initState()
    }),
    modifyState: p => {
      if (ended(p)) {
        return { ...p.state, gameEnded: true }
      }
      t.modifyState({
        ...p,
        state: p.state.state,
        emitProgress: () => {
          p.state = { ...p.state, happened: true }
        }
      })
      return p.state
    },
    done: s => !s.happened && s.gameEnded
  })
}
export function spendMana({ lastEvent, player }: StateInfo): number {
  return lastEvent?.type === 'GameEvent' &&
    lastEvent.payload.event.type === 'ExitPhase' &&
    lastEvent.payload.event.payload.type === 'ChangeMana' &&
    lastEvent.payload.event.payload.payload.player === player &&
    lastEvent.payload.event.payload.payload.delta < 0
    ? -lastEvent.payload.event.payload.payload.delta
    : 0
}

export function triggerUnitEffect(
  unit?: BaseCard,
  effect?: EffectType,
  filter?: (card: InstanceID, props: StateInfo) => boolean
): (props: StateInfo) => number {
  return props =>
    props.interlacedResolutionContext &&
    props.lastEvent?.type === 'GameEvent' &&
    props.lastEvent.payload.event.type === 'ExitPhase' &&
    props.lastEvent.payload.event.payload.type === 'ResolveTrigger' &&
    (!effect ||
      props.lastEvent.payload.event.payload.payload.effectType === effect) &&
    (!unit ||
      props.cardCache.getInstance(props.interlacedResolutionContext)?.base ===
        unit) &&
    (!filter || filter(props.interlacedResolutionContext, props)) &&
    props.cardCache.getLocation(props.interlacedResolutionContext)?.player ===
      props.player
      ? 1
      : 0
}

export function isZomboid(base: BaseCard) {
  return base === '20013' || base === '20065'
}

export function isArmisGuard(base: BaseCard) {
  return base === '20001' || base === '20066'
}

export function attackWith(
  filter: (
    card: CardInstance<SkyWeaver>,
    stateInfo: Omit<StateInfo, 'lastEvent'> & {
      lastEvent: ResolvedPhaseAttack
    }
  ) => boolean | void
): (stateInfo: StateInfo) => boolean | void {
  return props => {
    const { lastEvent: ev, player, cardCache } = props
    if (
      ev?.type === 'GameEvent' &&
      ev.payload.event.type === 'ExitPhase' &&
      ev.payload.event.payload.type === 'Attack'
    ) {
      const c = cardCache.getInstance(ev.payload.event.payload.payload.attacker)
      if (
        c &&
        filter(c, {
          ...props,
          lastEvent: ev.payload.event.payload.payload
        }) &&
        cardCache.getLocation(ev.payload.event.payload.payload.attacker)
          ?.player === player
      ) {
        return true
      }
    }
    return
  }
}

export function constructedDeckMatches(
  matches: (value: BaseCard[]) => boolean
): (state: StateInfo) => boolean {
  return ({ beforeEventSecret }) =>
    !!beforeEventSecret &&
    !!beforeEventSecret.secret.originalDeck.length &&
    matches(beforeEventSecret.secret.originalDeck)
}

export function buff(
  filter: (
    card: CardInstance<SkyWeaver>,
    buffer: CardInstance<SkyWeaver>,
    modifier: Modifier,
    stateInfo: StateInfo
  ) => boolean | void = () => true
): QuestStateImpl<{ buffedThisContext: Set<InstanceID> }> {
  return {
    initState: () => ({ buffedThisContext: new Set() }),
    modifyState: props => {
      // Should only emit one event for like +1/+1 and Guard
      const {
        lastEvent: event,
        cardCache,
        interlacedResolutionContext,
        player,
        eventsThisAction
      } = props
      if (
        event?.type === 'GameEvent' &&
        event.payload.event.type === 'ExitParallelPhases'
      ) {
        const secondLast = eventsThisAction[eventsThisAction.length - 1]
        if (
          secondLast.type === 'GameEvent' &&
          secondLast.payload.event.type === 'EnterPhase'
        ) {
          const id =
            secondLast.payload.event.payload.type === 'ResolveCardEffect'
              ? secondLast.payload.event.payload.payload.id
              : secondLast.payload.event.payload.type === 'ResolveTrigger'
              ? secondLast.payload.event.payload.payload.id
              : 'no'
          if (id === interlacedResolutionContext) {
            return {
              buffedThisContext: new Set()
            }
          }
        }
      }
      if (
        event?.type === 'GameEvent' &&
        event.payload.event.type === 'ExitPhase' &&
        event.payload.event.payload.type === 'ModifyCard' &&
        cardCache.getLocation(interlacedResolutionContext)?.player === player
      ) {
        const ev = event.payload.event.payload
        const c = cardCache.getInstance(ev.payload.card)
        const source = cardCache.getInstance(ev.payload.source)
        if (
          c &&
          source &&
          typeof ev.payload.modifier === 'object' &&
          !props.state.buffedThisContext.has(c.id) &&
          (('ModifyHealth' in ev.payload.modifier &&
            ev.payload.modifier.ModifyHealth[0] > 0) ||
            ('ModifyPower' in ev.payload.modifier &&
              ev.payload.modifier.ModifyPower[0] > 0) ||
            'GrantTrait' in ev.payload.modifier) &&
          filter(c, source, ev.payload.modifier, props)
        ) {
          props.emitProgress(1)
          props.state.buffedThisContext.add(c.id)
        }
      }
      return props.state
    }
  }
}

export function dealDamage(
  filter: (
    props: Omit<ResolvedPhaseDamage, 'source' | 'target'> & {
      source: CardInstance<SkyWeaver>
      target: CardInstance<SkyWeaver>
      props: StateInfo
    }
  ) => boolean | void
): (props: StateInfo) => number | boolean | void {
  return props => {
    const { lastEvent: last, cardCache } = props
    if (
      last?.type === 'GameEvent' &&
      last.payload.event.type === 'ExitPhase' &&
      last.payload.event.payload.type === 'Damage'
    ) {
      const source = cardCache.getInstance(
        last.payload.event.payload.payload.source
      )
      const target = cardCache.getInstance(
        last.payload.event.payload.payload.target
      )
      if (source && target) {
        return filter({
          ...last.payload.event.payload.payload,
          source,
          target,
          props
        })
          ? last.payload.event.payload.payload.amount
          : 0
      }
    }
    return false
  }
}
