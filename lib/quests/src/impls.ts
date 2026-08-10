import { GameMode, Hero, QuestType } from '@opensky/proto'
import {
  BaseCard,
  CardInstance,
  CardLibrary,
  Element,
  InstanceID,
  Player,
  Prism,
  SkyWeaver,
  Trait
} from '@skyweaver/state-metadata'

import {
  and,
  attackWith,
  buff,
  cardPlayed,
  constructedDeckMatches,
  dealDamage,
  field,
  gameEndedWithoutProgressFrom,
  gameFinish,
  gameWin,
  graveyard,
  hand,
  hero,
  isArmisGuard,
  isDefined,
  isZomboid,
  playAGameAs,
  resetsAfterPlayerAction,
  resetsAfterTurn,
  resetStatefulEventOnCondition,
  spendMana,
  summonUnit,
  triggerUnitEffect,
  whenAllyUnitDestroyed,
  whenCardMoved,
  whenEnemyUnitDestroyed,
  whenPlayersNonHeroAbilCardPlayed,
  whenUnitDestroyed,
  winAGameAs
} from './questHelpers'
import {
  accumulated,
  count,
  implOr,
  instantOneTimeEvent,
  oneTimeEvent,
  QuestImplementation,
  QuestStateImpl
} from './types'

const playElementCard = (el: Element) =>
  accumulated(
    whenPlayersNonHeroAbilCardPlayed(c => c.state.view.element === el)
  )

const giveHealthToAllies = accumulated(({ lastEvent, player, cardCache }) =>
  lastEvent?.type === 'GameEvent' &&
  lastEvent.payload.event.type === 'ExitPhase' &&
  lastEvent.payload.event.payload.type === 'ModifyCard' &&
  cardCache.getLocation(lastEvent.payload.event.payload.payload.source)
    ?.player === player &&
  cardCache.getLocation(lastEvent.payload.event.payload.payload.card)
    ?.player === player &&
  cardCache.getLocation(lastEvent.payload.event.payload.payload.card)
    ?.location[0].name === 'Field' &&
  typeof lastEvent.payload.event.payload.payload.modifier === 'object' &&
  'ModifyHealth' in lastEvent.payload.event.payload.payload.modifier &&
  lastEvent.payload.event.payload.payload.modifier.ModifyHealth[0] > 0
    ? lastEvent.payload.event.payload.payload.modifier.ModifyHealth[0]
    : 0
)
const questImplementations: Partial<{
  [K in QuestType]: QuestImplementation
}> = {
  AdasResolve: playAGameAs(Hero.ADA),
  AdasResolvePlus: winAGameAs(Hero.ADA),
  HerosJourney: playAGameAs(Hero.ADA),
  HerosJourneyII: playAGameAs(Hero.SAMYA),
  HerosJourneyIII: playAGameAs(Hero.BOURAN),
  HerosJourneyIV: playAGameAs(Hero.ARI),
  HerosJourneyV: playAGameAs(Hero.LOTUS),
  OntheRoadAgain: {
    ...instantOneTimeEvent(gameFinish),
    gameModeFilter: [
      GameMode.UNKNOWN,
      GameMode.RANKED_CONSTRUCTED,
      GameMode.CHALLENGE_CONSTRUCTED,
      GameMode.TUTORIAL,
      GameMode.PRACTICE_BOT,
      GameMode.RANKED_DISCOVERY,
      GameMode.CONQUEST_CONSTRUCTED,
      GameMode.CONQUEST_DISCOVERY,
      GameMode.WARM_UP,
      GameMode.CHALLENGE_DISCOVERY,
      GameMode.PRACTICE_PVP
    ]
  },
  OntheRoadAgainII: oneTimeEvent({
    ...resetStatefulEventOnCondition(
      count(attackWith(c => c.state.view.type === 'unit')),
      resetsAfterTurn
    ),
    done: s => s >= 2
  }),
  OntheRoadAgainIII: accumulated(
    whenPlayersNonHeroAbilCardPlayed(
      c => c.state.view.type === 'unit' && c.state.view.health >= 5
    )
  ),
  AnEnemyApproaches: accumulated(whenEnemyUnitDestroyed()),
  Strengthweaver: winAGameAs([
    Hero.ADA,
    Hero.FOX,
    Hero.TITUS,
    Hero.HORIK,
    Hero.MIRA
  ]),
  Agilityweaver: winAGameAs([
    Hero.SAMYA,
    Hero.IRIS,
    Hero.ZOEY,
    Hero.MAI,
    Hero.FOX
  ]),
  Intellectweaver: winAGameAs([
    Hero.ARI,
    Hero.SITTI,
    Hero.BANJO,
    Hero.MAI,
    Hero.MIRA
  ]),
  Wisdomweaver: winAGameAs([
    Hero.LOTUS,
    Hero.TITUS,
    Hero.IRIS,
    Hero.AXEL,
    Hero.BANJO
  ]),
  Heartweaver: winAGameAs([
    Hero.BOURAN,
    Hero.HORIK,
    Hero.ZOEY,
    Hero.AXEL,
    Hero.SITTI
  ]),
  SamyasSwiftness: playAGameAs(Hero.SAMYA),
  SamyasSwiftnessII: winAGameAs(Hero.SAMYA),
  BouransShadow: playAGameAs(Hero.BOURAN),
  BouransShadowII: winAGameAs(Hero.BOURAN),
  ArisInsight: playAGameAs(Hero.ARI),
  ArisInsightII: winAGameAs(Hero.ARI),
  LotusPatience: playAGameAs([Hero.LOTUS]),
  LotusPatienceII: winAGameAs([Hero.LOTUS]),
  AxelsVision: playAGameAs(Hero.AXEL),
  BanjosMirth: playAGameAs(Hero.BANJO),
  FoxsBravado: playAGameAs(Hero.FOX),
  HoriksBurden: playAGameAs(Hero.HORIK),
  IrisGrace: playAGameAs(Hero.IRIS),
  MaisBreakthrough: playAGameAs(Hero.MAI),
  MirasMettle: playAGameAs(Hero.MIRA),
  SittisSpite: playAGameAs(Hero.SITTI),
  TitusTune: playAGameAs(Hero.TITUS),
  ZoeysJustice: playAGameAs(Hero.ZOEY),
  AFriendAppears: buff(c => c.state.view.type === 'unit'),
  TheReturnerer: accumulated(
    whenCardMoved(
      ({ from, to, card, props: { player } }) =>
        card?.base === '3132' &&
        from.player === player &&
        to.player === player &&
        from.location?.[0].name === 'Graveyard'
    )
  ),

  EarthBattler: playElementCard('earth'),
  MetalBattler: playElementCard('metal'),
  AirBattler: playElementCard('air'),
  FireBattler: playElementCard('fire'),
  DarkBattler: playElementCard('dark'),
  LightBattler: playElementCard('light'),
  WaterBattler: playElementCard('water'),
  MindBattler: playElementCard('mind'),

  EarthBattlerPLUS: playElementCard('earth'),
  MetalBattlerPLUS: playElementCard('metal'),
  AirBattlerPLUS: playElementCard('air'),
  FireBattlerPLUS: playElementCard('fire'),
  DarkBattlerPLUS: playElementCard('dark'),
  LightBattlerPLUS: playElementCard('light'),
  WaterBattlerPLUS: playElementCard('water'),
  MindBattlerPLUS: playElementCard('mind'),
  EarthBattlerPLUSPLUS: playElementCard('earth'),
  MetalBattlerPLUSPLUS: playElementCard('metal'),
  AirBattlerPLUSPLUS: playElementCard('air'),
  FireBattlerPLUSPLUS: playElementCard('fire'),
  DarkBattlerPLUSPLUS: playElementCard('dark'),
  LightBattlerPLUSPLUS: playElementCard('light'),
  WaterBattlerPLUSPLUS: playElementCard('water'),
  MindBattlerPLUSPLUS: playElementCard('mind'),

  IllbeBack: oneTimeEvent({
    ...resetStatefulEventOnCondition(
      {
        initState: () => new Map<InstanceID, number>(),
        modifyState: props => {
          const { state, player } = props
          whenCardMoved(({ from, to, card }) => {
            const ragsComingBack =
              card?.base === '3132' &&
              from.player === player &&
              to.player === player &&
              from.location?.[0].name === 'Graveyard'
            if (ragsComingBack) {
              state.set(card.id, (state.get(card.id) ?? 0) + 1)
            }
            return ragsComingBack
          })(props)
          return state
        }
      },
      resetsAfterTurn
    ),
    done: ragss => [...ragss.values()].some(c => c >= 2)
  }),
  WildlandChampion: accumulated(triggerUnitEffect('1132')),
  HolyWords: accumulated(
    summonUnit(
      (u, { triggerResolutionContext, cardCache }) =>
        isArmisGuard(u.base) &&
        cardCache.getInstance(triggerResolutionContext?.id)?.base === '133'
    )
  ),
  Surprise: resetStatefulEventOnCondition<{
    summonedThisTurn: false | InstanceID
  }>(
    {
      initState: () => ({
        summonedThisTurn: false,
        unitsDestroyed: 0
      }),
      modifyState: props => {
        const { state } = props
        summonUnit(u => {
          if (
            u.base === '4132' &&
            typeof props.triggerResolutionContext?.effect === 'object' &&
            'ReefDiver' in props.triggerResolutionContext.effect
          ) {
            state.summonedThisTurn = u.id
          }
          return false
        })(props)
        if (
          whenUnitDestroyed(
            (_, __, killer) => killer?.id === state.summonedThisTurn
          )(props)
        ) {
          props.emitProgress(1)
        }
        return state
      }
    },
    resetsAfterTurn
  ),
  PhyrricVictory: instantOneTimeEvent(
    and(
      gameWin,
      ({ player, beforeEventState }) =>
        beforeEventState?.playerCards[player].hand.length === 0 &&
        beforeEventState?.playerCards[player].deck === 0
    )
  ),
  MeteorShower: accumulated(
    whenPlayersNonHeroAbilCardPlayed(c => c.base === '20018')
  ),
  FullyEquipped: instantOneTimeEvent(
    props =>
      attackWith(c => c.state.view.type === 'hero')(props) &&
      hero(props.player, props.cardCache)?.state.view.traits.every(t =>
        (
          [
            'banner',
            'wither',
            'lifesteal',
            'armor'
          ] satisfies Trait[] as Trait[]
        ).includes(t)
      )
  ),
  HandtoHand: oneTimeEvent({
    ...resetStatefulEventOnCondition(
      count(
        ({ lastEvent: last, player, cardCache }) =>
          last?.type === 'GameEvent' &&
          last.payload.event.type === 'ExitPhase' &&
          last.payload.event.payload.type === 'Damage' &&
          last.payload.event.payload.payload.target ===
            hero((1 - player) as Player, cardCache)?.id &&
          last.payload.event.payload.payload.source ===
            hero(player, cardCache)?.id &&
          last.payload.event.payload.payload.amount
      ),
      resetsAfterTurn
    ),
    done: c => c >= 20
  }),
  LastStand: instantOneTimeEvent(
    and(
      gameWin,
      ({ player, cardCache }) =>
        hero(player, cardCache)?.state.view.health === 1
    )
  ),
  Destroy: accumulated(({ lastEvent, cardCache, player }) =>
    lastEvent?.type === 'GameEvent' &&
    lastEvent.payload.event.type === 'ExitPhase' &&
    lastEvent.payload.event.payload.type === 'Damage' &&
    cardCache.getLocation(lastEvent.payload.event.payload.payload.source)
      ?.player === player &&
    cardCache.getLocation(lastEvent.payload.event.payload.payload.target)
      ?.player !== player
      ? lastEvent.payload.event.payload.payload.amount
      : 0
  ),
  BackfromtheBrink: oneTimeEvent({
    initState: () => ({ fellBelow10: false, gameFinishedWith32Health: false }),
    modifyState(props) {
      const h = hero(props.player, props.cardCache)
      if (!h) {
        return props.state
      }
      if (h.state.view.health < 10) {
        props.state.fellBelow10 = true
      }
      if (
        props.beforeEventState?.state.status.type === 'GameOver' &&
        h.state.view.health > 32
      ) {
        props.state.gameFinishedWith32Health = true
      }
      return props.state
    },
    done: s => s.fellBelow10 && s.gameFinishedWith32Health
  }),
  OTK: oneTimeEvent({
    ...resetStatefulEventOnCondition(
      count(({ lastEvent, cardCache, player }) =>
        lastEvent?.type === 'GameEvent' &&
        lastEvent.payload.event.type === 'ExitPhase' &&
        lastEvent.payload.event.payload.type === 'Damage' &&
        cardCache.getLocation(lastEvent.payload.event.payload.payload.source)
          ?.player === player &&
        hero((1 - player) as Player, cardCache)?.id ===
          lastEvent.payload.event.payload.payload.target
          ? lastEvent.payload.event.payload.payload.amount
          : 0
      ),
      resetsAfterTurn
    ),
    done: s => s >= 32
  }),
  RegeneratorPLUSPLUS: giveHealthToAllies,
  Demilitarize: accumulated(whenEnemyUnitDestroyed(c => isArmisGuard(c.base))),
  ZombieSlayer: accumulated(whenEnemyUnitDestroyed(c => isZomboid(c.base))),
  FirstBlood: {
    initState: () => false,
    modifyState(props) {
      const { state } = props
      if (state) {
        return state
      }

      if (
        whenUnitDestroyed((_, __, killer) => {
          if (props.cardCache.getLocation(killer)?.player === props.player) {
            props.emitProgress(1)
            return true
          }
          return false
        })(props)
      ) {
        return true
      }
      return state
    }
  } satisfies QuestStateImpl<boolean>,
  MirrorMatched: instantOneTimeEvent(
    and(
      gameFinish,
      props =>
        !!props.beforeEventState?.state.players[0].prisms.every(
          (p, i) => props.beforeEventState?.state.players[1].prisms[i] === p
        )
    )
  ),
  Champion: accumulated(gameWin),
  Determinator: accumulated(gameFinish),
  BigHitter: instantOneTimeEvent(({ player, cardCache, lastEvent }) => {
    const enemyHero = hero((1 - player) as Player, cardCache)
    return (
      lastEvent?.type === 'GameEvent' &&
      lastEvent.payload.event.type === 'ExitPhase' &&
      lastEvent.payload.event.payload.type === 'Damage' &&
      lastEvent.payload.event.payload.payload.kind.type === 'Combat' &&
      lastEvent.payload.event.payload.payload.target === enemyHero?.id &&
      lastEvent.payload.event.payload.payload.amount >= 15
    )
  }),
  Pacifist: oneTimeEvent({
    initState: () => ({
      turnsWithoutAttacking: 0,
      attackedThisTurn: false,
      won: false
    }),
    modifyState: ({
      player,
      state,
      lastEvent,
      cardCache,
      beforeEventState
    }) => {
      if (
        lastEvent?.type === 'GameEvent' &&
        lastEvent.payload.event.type === 'ExitPhase'
      ) {
        if (
          lastEvent.payload.event.payload.type === 'Attack' &&
          lastEvent.payload.event.payload.payload.attacker ===
            hero(player, cardCache)?.id
        ) {
          return { ...state, attackedThisTurn: true }
        } else if (
          lastEvent.payload.event.payload.type === 'EndTurn' &&
          lastEvent.payload.event.payload.payload.player === player
        ) {
          return {
            ...state,
            turnsWithoutAttacking:
              state.turnsWithoutAttacking + (state.attackedThisTurn ? 0 : 1),
            attackedThisTurn: false
          }
        }
      }
      if (
        beforeEventState?.state.status.type === 'GameOver' &&
        beforeEventState.state.status.winner === player
      ) {
        return { ...state, won: true }
      }
      return state
    },
    done: s => s.turnsWithoutAttacking >= 5 && s.won
  }),
  ThreesCompany: gameEndedWithoutProgressFrom(
    accumulated(whenPlayersNonHeroAbilCardPlayed((_c, cost) => cost !== 3)),
    gameWin
  ),
  PatientStudent: {
    ...instantOneTimeEvent(
      and(
        gameWin,
        ({ player, beforeEventState }) =>
          !!beforeEventState && beforeEventState.state.turnCount >= 19 + player
      )
    ),
    gameModeFilter: [GameMode.RANKED_CONSTRUCTED, GameMode.RANKED_DISCOVERY]
  },
  SpeedDemon: {
    ...instantOneTimeEvent(
      and(
        gameWin,
        ({ player, beforeEventState }) =>
          !!beforeEventState && beforeEventState.state.turnCount <= 15 + player
      )
    ),
    gameModeFilter: [GameMode.RANKED_CONSTRUCTED, GameMode.RANKED_DISCOVERY]
  },
  KaZam: oneTimeEvent({
    ...resetStatefulEventOnCondition(
      count(({ lastEvent, player, cardCache }) =>
        lastEvent?.type === 'GameEvent' &&
        lastEvent.payload.event.type === 'ExitPhase' &&
        lastEvent.payload.event.payload.type === 'Damage' &&
        cardCache.getInstance(lastEvent.payload.event.payload.payload.source)
          ?.base === '4018' &&
        cardCache.getLocation(lastEvent.payload.event.payload.payload.source)
          ?.player === player
          ? lastEvent.payload.event.payload.payload.amount
          : 0
      ),
      resetsAfterTurn
    ),
    done: s => s >= 20
  }),
  Spelless: instantOneTimeEvent(
    and(
      gameWin,
      constructedDeckMatches(d =>
        d.every(c => {
          const meta = CardLibrary.get(c)
          if (!meta) {
            return false
          }
          if (meta.type === 'spell') {
            return false
          }
          if (
            meta.type === 'unit' &&
            meta.attachment &&
            CardLibrary.get(meta.attachment)?.type === 'spell'
          ) {
            return false
          }
          return true
        })
      )
    )
  ),
  Unitless: instantOneTimeEvent(
    and(
      gameWin,
      constructedDeckMatches(d =>
        d.every(c => {
          const meta = CardLibrary.get(c)
          if (!meta) {
            return false
          }
          if (meta.type === 'unit') {
            return false
          }

          return true
        })
      )
    )
  ),
  AllTogether: instantOneTimeEvent(({ cardCache, player }) => {
    const gy = graveyard(player, cardCache)
    if (gy.length < 5) {
      return false
    }
    const p = gy.reduce(
      (prisms, card) => (prisms.add(card.state.view.prism), prisms),
      new Set<Prism>()
    )
    return (
      p.has('str') &&
      p.has('agy') &&
      p.has('hrt') &&
      p.has('int') &&
      p.has('wis')
    )
  }),
  RainbowRestriction: instantOneTimeEvent(
    and(
      gameWin,
      constructedDeckMatches(d =>
        Object.values(
          d.reduce<{ [K in Exclude<Element, 'sky'>]: number }>(
            (acc, card) => {
              const c = CardLibrary.get(card)
              if (c && c.element !== 'sky') {
                acc[c.element] += 1
              }
              return acc
            },
            {
              light: 0,
              mind: 0,
              fire: 0,
              water: 0,
              air: 0,
              earth: 0,
              dark: 0,
              metal: 0
            }
          )
        ).every(elCount => elCount >= 3)
      )
    )
  ),
  Megashroom: oneTimeEvent({
    ...count(triggerUnitEffect('3107', 'Death')),
    done: s => s >= 10
  }),
  BakersDozen: accumulated(
    attackWith(
      (c, { player, cardCache }) => c.id === hero(player, cardCache)?.id
    )
  ),
  Sequence: oneTimeEvent({
    initState: () => 0,
    modifyState(props) {
      whenPlayersNonHeroAbilCardPlayed((_c, cost) => {
        const isOneOff = cost === props.state + 1
        if (isOneOff) {
          props.state += 1
        } else {
          props.state = 0
        }
        return isOneOff
      })(props)

      return props.state
    },
    done: s => s >= 4
  }),
  Magnificant: accumulated(
    whenPlayersNonHeroAbilCardPlayed((c, cost) => {
      const baseCost = CardLibrary.get(c.base)?.cost
      return typeof baseCost === 'number' && cost < baseCost
    })
  ),
  Overkill: oneTimeEvent({
    ...resetStatefulEventOnCondition(
      {
        initState: () => ({ unitsDestroyed: 0, won: false }),
        modifyState: props => {
          if (whenEnemyUnitDestroyed()(props)) {
            return {
              ...props.state,
              unitsDestroyed: props.state.unitsDestroyed + 1
            }
          }
          if (gameWin(props)) {
            return { ...props.state, won: true }
          }
          return props.state
        }
      },
      resetsAfterPlayerAction
    ),
    done: s => s.unitsDestroyed >= 0 && s.won
  }),
  Ribbit: accumulated(
    whenCardMoved(
      ({
        from,
        to,
        props: { player, cardCache, interlacedResolutionContext }
      }) => {
        if (
          from.player !== player &&
          from.location?.[0].name === 'Field' &&
          to.location[0].name === 'Dust'
        ) {
          const x = cardCache.getInstance(interlacedResolutionContext)
          return !!x && (x.base === '4045' || x.base === '2112')
        }
        return false
      }
    )
  ),
  Fireworks: accumulated(
    ({ lastEvent, player, cardCache, interlacedResolutionContext }) =>
      lastEvent?.type === 'GameEvent' &&
      lastEvent.payload.event.type === 'ExitPhase' &&
      lastEvent.payload.event.payload.type === 'Damage' &&
      cardCache.getInstance(lastEvent.payload.event.payload.payload.source)
        ?.base === '3117' &&
      cardCache.getInstance(interlacedResolutionContext)?.base === '3117' &&
      cardCache.getLocation(lastEvent.payload.event.payload.payload.source)
        ?.player === player
        ? lastEvent.payload.event.payload.payload.amount
        : 0
  ),
  ByMyHand: instantOneTimeEvent(
    attackWith(
      (t, { player, cardCache, lastEvent }) =>
        t.id === hero(player, cardCache)?.id &&
        lastEvent.defender === hero((1 - player) as Player, cardCache)?.id &&
        cardCache.getInstance(lastEvent.defender)?.state.view.health === 0
    )
  ),
  Combotastic: oneTimeEvent({
    ...resetStatefulEventOnCondition(
      {
        ...count(
          whenPlayersNonHeroAbilCardPlayed(
            c => c.state.view.type === 'unit' || c.state.view.type === 'spell'
          )
        )
      },
      resetsAfterTurn
    ),
    done: s => s >= 4
  }),
  ConcedingwithStyle: instantOneTimeEvent(
    ({ lastEvent, player, cardCache }) =>
      lastEvent?.type === 'ModifyCard' &&
      lastEvent.payload.instance.id === hero(player, cardCache)?.id &&
      lastEvent.payload.instance.state.view.markedForDeath !== undefined &&
      cardCache.getInstance(
        lastEvent.payload.instance.state.view.markedForDeath
      )?.state.view.type === 'spell' &&
      cardCache.getLocation(
        lastEvent.payload.instance.state.view.markedForDeath
      )?.player === player
  ),
  Shhhhhhh: accumulated(
    whenCardMoved(
      ({
        to,
        card,
        props: { cardCache, interlacedResolutionContext, player }
      }) =>
        to.location[0].name === 'Attachment' &&
        card?.base === '20048' &&
        cardCache.getLocation(interlacedResolutionContext)?.player === player
    )
  ),
  LockedUp: accumulated(
    whenCardMoved(
      ({
        to,
        card,
        props: { cardCache, interlacedResolutionContext, player }
      }) =>
        to.location[0].name === 'Attachment' &&
        card?.base === '20027' &&
        cardCache.getLocation(interlacedResolutionContext)?.player === player
    )
  ),
  PleaseNerf: instantOneTimeEvent(triggerUnitEffect('3033')),
  Oops: instantOneTimeEvent(
    ({ lastEvent, player, cardCache }) =>
      lastEvent?.type === 'GameEvent' &&
      lastEvent.payload.event.type === 'ExitPhase' &&
      lastEvent.payload.event.payload.type === 'Damage' &&
      lastEvent.payload.event.payload.payload.kind.type === 'Combat' &&
      lastEvent.payload.event.payload.payload.amount === 0 &&
      cardCache.getLocation(lastEvent.payload.event.payload.payload.source)
        ?.player === player
  ),
  MightyThick: instantOneTimeEvent(
    attackWith(c => c.state.view.type === 'unit' && c.state.view.health >= 15)
  ),
  MightyStrike: instantOneTimeEvent(
    attackWith(c => c.state.view.type === 'unit' && c.state.view.power >= 15)
  ),
  Manetastic: (() => {
    const b = buff()
    return oneTimeEvent({
      ...resetStatefulEventOnCondition(
        {
          initState: () => ({ num: 0, buffState: b.initState() }),
          modifyState(props) {
            if (
              props.cardCache.getInstance(props.cardExecutionContext)?.base ===
              '40'
            ) {
              props.state.buffState = b.modifyState({
                ...props,
                state: props.state.buffState,
                emitProgress: () => {
                  props.state.num += 1
                }
              })
            }
            return props.state
          }
        },
        resetsAfterPlayerAction
      ),
      done: s => s.num >= 10
    })
  })(),
  HallowedSwords: instantOneTimeEvent(
    attackWith(
      c =>
        isArmisGuard(c.base) &&
        c.state.view.traits.includes('wither') &&
        c.state.view.traits.includes('lifesteal')
    )
  ),
  DinoDiscount: accumulated(
    whenPlayersNonHeroAbilCardPlayed((c, cost) => {
      const meta = CardLibrary.get(c.base)
      if (!meta) {
        return false
      }
      return typeof meta.cost === 'number' && cost - meta.cost < 0
    })
  ),
  BigSpender: oneTimeEvent({
    ...resetStatefulEventOnCondition(count(spendMana), resetsAfterTurn),
    done: s => s >= 20
  }),
  GlizzyGobbler: accumulated(
    whenPlayersNonHeroAbilCardPlayed(c => c.base === '20060')
  ),
  Vampire: accumulated(
    ({ lastEvent: l, cardCache, player }) =>
      l?.type === 'GameEvent' &&
      l.payload.event.type === 'ExitPhase' &&
      l.payload.event.payload.type === 'Damage' &&
      l.payload.event.payload.payload.lifestealFrom ===
        hero((1 - player) as Player, cardCache)?.id &&
      cardCache.getInstance(l.payload.event.payload.payload.target)?.id ===
        l.payload.event.payload.payload.lifestealFrom &&
      l.payload.event.payload.payload.amount
  ),
  WhiteWhale: instantOneTimeEvent(props => {
    const { lastEvent, player, cardCache } = props
    if (
      lastEvent?.type === 'ModifyCard' &&
      lastEvent?.payload.instance.state.view.markedForDeath !== undefined &&
      lastEvent.payload.instance.id ===
        hero((1 - player) as Player, cardCache)?.id &&
      cardCache.getInstance(
        lastEvent?.payload.instance.state.view.markedForDeath
      )?.base === '8' &&
      cardCache.getLocation(
        lastEvent?.payload.instance.state.view.markedForDeath
      )?.player === player
    ) {
      return true
    } else {
      return whenUnitDestroyed(
        (c, _, killer) =>
          c.base === '8' &&
          props.cardCache.getLocation(killer)?.player === props.player
      )(props)
    }
  }),
  Boing: oneTimeEvent({
    ...count(
      whenCardMoved(
        ({ to, props: { player, interlacedResolutionContext, cardCache } }) =>
          to.location[0].name === 'Hand' &&
          cardCache.getLocation(interlacedResolutionContext)?.player === player
      )
    ),
    done: s => s >= 5
  }),
  Gifted: oneTimeEvent({
    ...resetStatefulEventOnCondition(
      count(
        whenCardMoved(
          c =>
            c.from.location?.[0].name === 'Deck' &&
            c.props.player !== c.to.player &&
            c.props.cardCache.getLocation(c.props.interlacedResolutionContext)
              ?.player === c.props.player
        )
      ),
      resetsAfterTurn
    ),
    done: s => s >= 3
  }),
  Slayer: oneTimeEvent({
    ...count(triggerUnitEffect(undefined, 'Slay')),
    done: s => s >= 5
  }),
  Glorious: oneTimeEvent({
    ...count(triggerUnitEffect(undefined, 'Glory')),
    done: s => s >= 5
  }),
  MightofEarth: buff(
    (_card, _buffer, modifier) =>
      typeof modifier === 'object' &&
      ('ModifyPower' in modifier || 'ModifyHealth' in modifier)
  ),
  Tidyup: oneTimeEvent({
    ...resetStatefulEventOnCondition(
      count(
        whenCardMoved(
          ({ from, props }) =>
            !!(
              props.beforeEventState?.state.currentPlayer === props.player &&
              from.location?.[0].name === 'Attachment' &&
              props.cardCache.getLocation(from.location[0].parent)?.location[0]
                .name === 'Field'
            )
        )
      ),
      resetsAfterTurn
    ),
    done: s => s >= 5
  }),
  Shatterer: accumulated(
    whenUnitDestroyed(
      (c, { cardCache }) =>
        cardCache.getInstance(c.attachment)?.base === '20009'
    )
  ),

  BurnBabyBurn: accumulated(
    props =>
      props.lastEvent?.type === 'ModifyCard' &&
      props.cardCache.getInstance(
        props.lastEvent.payload.instance.state.view.markedForDeath
      )?.base === '20023' &&
      props.cardCache.getLocation(props.lastEvent.payload.instance.id)
        ?.location[0].name === 'Field' &&
      props.cardCache.getLocation(props.lastEvent.payload.instance.id)
        ?.player !== props.player
  ),
  Curseslinger: oneTimeEvent({
    ...count(
      whenCardMoved(
        ({
          to,
          card,
          props: { player, cardCache, interlacedResolutionContext }
        }) =>
          card?.state.view.type === 'enchant' &&
          to.player !== player &&
          to.location?.[0].name === 'Attachment' &&
          cardCache.getLocation(interlacedResolutionContext)?.player === player
      )
    ),
    done: s => s >= 20
  }),

  DieAgainLater: oneTimeEvent({
    ...count(triggerUnitEffect(undefined, 'Death')),
    done: s => s >= 20
  }),
  Summoner: oneTimeEvent({
    ...count(triggerUnitEffect(undefined, 'Summon')),
    done: s => s >= 10
  }),
  HexboundHorde: instantOneTimeEvent(
    ({ player, cardCache }) =>
      field(player, cardCache).filter(f => isZomboid(f.base)).length === 6
  ),
  LegionofArmis: instantOneTimeEvent(
    ({ player, cardCache }) =>
      field(player, cardCache).filter(f => isArmisGuard(f.base)).length === 6
  ),
  ASmallSacrifice: accumulated(props => {
    const { lastEvent: last, cardExecutionContext, cardCache, player } = props
    if (
      last?.type !== 'GameEvent' ||
      last.payload.event.type !== 'ExitPhase' ||
      last.payload.event.payload.type !== 'ModifyCard'
    ) {
      return
    }
    const event = last.payload.event.payload.payload

    if (
      cardCache.getLocation(event.card)?.player !== player ||
      cardCache.getLocation(cardExecutionContext)?.player !== player ||
      cardCache.getInstance(cardExecutionContext)?.state.view.type !==
        'spell' ||
      typeof event.modifier !== 'object'
    ) {
      return
    }

    const explicitlyKilled = 'MarkedForDeath' in event.modifier
    if (explicitlyKilled) {
      return true
    }

    const killedByHealthChangeThatIsntDamage =
      'ModifyHealth' in event.modifier &&
      event.modifier.ModifyHealth[0] < 0 &&
      (typeof event.modifier.ModifyHealth[1] !== 'object' ||
        !('Damage' in event.modifier.ModifyHealth[1]))

    if (killedByHealthChangeThatIsntDamage) {
      return true
    }

    return false
  }),
  TheReturned: oneTimeEvent({
    initState: () => new Map<BaseCard, number>(),
    modifyState: props => {
      whenCardMoved(({ from, to, card }) => {
        if (
          card?.state.view.type === 'unit' &&
          from.location?.[0].name === 'Graveyard' &&
          from.player === props.player &&
          to.location[0].name === 'Field' &&
          to.player === props.player
        ) {
          props.state.set(card.base, (props.state.get(card.base) ?? 0) + 1)
        }
        return false
      })(props)
      return props.state
    },
    done: s => [...s.values()].some(v => v >= 3)
  }),
  Healer: oneTimeEvent({
    initState: () => ({ gained: 0 }),
    modifyState: ({ lastEvent, state, cardCache, player }) => {
      if (
        lastEvent?.type === 'GameEvent' &&
        lastEvent.payload.event.type === 'ExitPhase' &&
        lastEvent.payload.event.payload.type === 'ModifyCard' &&
        cardCache.getInstance(lastEvent.payload.event.payload.payload.card)
          ?.id === hero(player, cardCache)?.id &&
        typeof lastEvent.payload.event.payload.payload.modifier === 'object' &&
        'ModifyHealth' in lastEvent.payload.event.payload.payload.modifier
      ) {
        const hpChange =
          lastEvent.payload.event.payload.payload.modifier.ModifyHealth[0]
        if (hpChange > 0) {
          state.gained += hpChange
        }
      }
      return state
    },
    done: ({ gained }) => gained >= 20
  }),
  WRATH: oneTimeEvent({
    ...resetStatefulEventOnCondition(
      {
        initState: () => ({
          spell: undefined as InstanceID | undefined,
          units: new Set()
        }),
        modifyState(props) {
          if (props.state.spell !== props.cardExecutionContext) {
            props.state.spell =
              props.cardCache.getInstance(props.cardExecutionContext)?.state
                .view.type === 'spell'
                ? props.cardExecutionContext
                : undefined
            props.state.units = new Set()
          }

          if (props.state.spell && props.lastEvent?.type === 'ModifyCard') {
            const loc = props.cardCache.getLocation(
              props.lastEvent.payload.instance
            )
            if (
              loc &&
              loc.location[0].name === 'Field' &&
              loc.player !== props.player &&
              props.cardCache.getInstance(loc)?.state.view.markedForDeath !==
                undefined
            ) {
              props.state.units.add(props.lastEvent.payload.instance.id)
            }
          }
          return props.state
        }
      },
      resetsAfterPlayerAction
    ),
    done: s => s.units.size >= 4
  }),
  RainbowResurrection: oneTimeEvent({
    ...count(
      ({ player, lastEvent: last, triggerResolutionContext, cardCache }) =>
        last?.type === 'MoveCard' &&
        last.payload.from.player === player &&
        last.payload.to.player === player &&
        last.payload.to.location[0].name === 'Field' &&
        cardCache.getInstance(triggerResolutionContext?.id)?.base === '2043'
    ),
    done: state => state >= 3
  }),
  Stophittingyourself: instantOneTimeEvent(
    ({ lastEvent, player, cardCache, beforeEventEnemySecret }) => {
      if (
        lastEvent?.type === 'GameEvent' &&
        lastEvent.payload.event.type === 'ExitPhase' &&
        lastEvent.payload.event.payload.type === 'Damage' &&
        lastEvent.payload.event.payload.payload.target ===
          hero((1 - player) as Player, cardCache)?.id &&
        lastEvent.payload.event.payload.payload.amount > 0 &&
        cardCache.getInstance(lastEvent.payload.event.payload.payload.source)
          ?.state.view.type === 'unit'
      ) {
        // started in their deck?
        const id = lastEvent.payload.event.payload.payload.source
        return beforeEventEnemySecret?.secret.filledDeckInstances.some(
          i => i === id
        )
      }
      return false
    }
  ),
  EmptyHanded: instantOneTimeEvent(
    and(
      gameWin,
      ({ beforeEventState, player }) =>
        beforeEventState?.playerCards[player].hand.length === 0
    )
  ),
  DoubleRainbow: instantOneTimeEvent(({ player, cardCache }) => {
    const els = graveyard(player, cardCache).reduce<{
      [K in Exclude<Element, 'sky'>]: number
    }>(
      (elements, card) => {
        if (card.state.view.element !== 'sky') {
          elements[card.state.view.element] += 1
        }
        return elements
      },
      {
        fire: 0,
        water: 0,
        earth: 0,
        air: 0,
        mind: 0,
        dark: 0,
        light: 0,
        metal: 0
      }
    )
    return Object.values(els).every(e => e >= 2)
  }),
  ABiiiigStick: instantOneTimeEvent(({ player, cardCache }) =>
    field(player, cardCache).some(
      e => e.base === '20003' && e.state.view.power >= 8
    )
  ),
  FullBoard: instantOneTimeEvent(
    ({ player, cardCache }) =>
      field(player, cardCache).filter(c => c.state.view.type === 'unit')
        .length === 6 &&
      field((1 - player) as Player, cardCache).filter(
        c => c.state.view.type === 'unit'
      ).length === 6
  ),
  Gardener: accumulated(summonUnit(u => u.base === '20003')),
  ArmisEnvoy: accumulated(attackWith(c => isArmisGuard(c.base))),
  ZomboidEnvoy: accumulated(attackWith(c => isZomboid(c.base))),
  Blighted: accumulated(props =>
    whenCardMoved(({ from, to, card }) => {
      return (
        card?.base === '20064' &&
        to.player !== props.player &&
        from.location?.[0].name === 'Limbo' &&
        to.location[0].name === 'Deck'
      )
    })(props)
  ),
  DeadonArrival: oneTimeEvent({
    initState: () => ({ count: 0, playedThisTurn: new Set() }),
    modifyState(props) {
      if (resetsAfterTurn(props)) {
        props.state.playedThisTurn = new Set()
      }
      whenPlayersNonHeroAbilCardPlayed(c => {
        const unitPlayed = c.state.view.type === 'unit'
        if (unitPlayed) {
          props.state.playedThisTurn.add(c.id)
        }
        return unitPlayed
      })(props)

      if (
        whenCardMoved(
          ({ from, to, card }) =>
            !!card &&
            from.player === props.player &&
            to.player === props.player &&
            from.location?.[0].name === 'Field' &&
            to.location[0].name === 'Graveyard' &&
            props.state.playedThisTurn.has(card.id)
        )(props)
      ) {
        props.state.count += 1
      }
      return props.state
    },
    done: s => s.count > 0
  }),
  CloneArmy: oneTimeEvent({
    initState: () => new Map<BaseCard, number>(),
    modifyState: ({ state, player, eventsThisAction }) => {
      cardPlayed(player, eventsThisAction, c => {
        if (c.state.view.type === 'unit') {
          state.set(c.base, (state.get(c.base) ?? 0) + 1)
        }
        return false
      })
      return state
    },
    done: s => [...s.values()].some(v => v >= 4)
  }),
  MicroManagement: accumulated(attackWith(c => c.base === '20058')),
  MajorInvestment: accumulated(spendMana),
  ManaInvestment: accumulated(spendMana),
  CrystalGrowth: oneTimeEvent({
    ...count(
      ({
        lastEvent,
        player,
        triggerResolutionContext,
        cardExecutionContext,
        cardCache
      }) =>
        lastEvent?.type === 'GameEvent' &&
        lastEvent.payload.event.type === 'ExitPhase' &&
        lastEvent.payload.event.payload.type === 'ChangeMaxMana' &&
        lastEvent.payload.event.payload.payload.player === player &&
        lastEvent.payload.event.payload.payload.delta > 0 &&
        cardCache.getLocation(triggerResolutionContext?.id)?.player !==
          ((1 - player) as Player) &&
        cardCache.getLocation(cardExecutionContext)?.player !==
          ((1 - player) as Player)
          ? lastEvent.payload.event.payload.payload.delta
          : 0
    ),
    done: s => s >= 5
  }),
  PainandGain: instantOneTimeEvent(({ lastEvent, player, cardCache }) => {
    return (
      lastEvent?.type === 'GameEvent' &&
      lastEvent.payload.event.type === 'ExitPhase' &&
      lastEvent.payload.event.payload.type === 'ResolveCardEffect' &&
      cardCache.getLocation(lastEvent.payload.event.payload.payload.id)
        ?.player === player &&
      lastEvent.payload.event.payload.payload.baseCard === '1122' &&
      lastEvent.payload.event.payload.payload.playedManaCost === 0
    )
  }),

  Armoured: accumulated(
    whenPlayersNonHeroAbilCardPlayed(
      c => c.state.view.type === 'unit' && c.state.view.traits.includes('armor')
    )
  ),
  Dashing: accumulated(
    whenPlayersNonHeroAbilCardPlayed(
      c => c.state.view.type === 'unit' && c.state.view.traits.includes('dash')
    )
  ),
  Lively: accumulated(
    whenPlayersNonHeroAbilCardPlayed(
      c =>
        c.state.view.type === 'unit' &&
        c.state.view.traits.includes('lifesteal')
    )
  ),
  Stealthy: accumulated(
    whenPlayersNonHeroAbilCardPlayed(
      c =>
        c.state.view.type === 'unit' && c.state.view.traits.includes('stealth')
    )
  ),
  Withered: accumulated(
    whenPlayersNonHeroAbilCardPlayed(
      c =>
        c.state.view.type === 'unit' && c.state.view.traits.includes('wither')
    )
  ),
  Guarded: accumulated(
    whenPlayersNonHeroAbilCardPlayed(
      c => c.state.view.type === 'unit' && c.state.view.traits.includes('guard')
    )
  ),
  Bubbly: instantOneTimeEvent(
    ({ player, beforeEventState }) =>
      beforeEventState?.playerCards[player].field
        .map(
          c =>
            beforeEventState?.instances[c] as {
              instance: CardInstance<SkyWeaver>
            }
        )
        .some(
          c => c.instance.base === '4067' && c.instance.state.view.health >= 10
        )
  ),
  VaporMaster: accumulated(({ lastEvent, player, cardCache }) => {
    return (
      lastEvent?.type === 'GameEvent' &&
      lastEvent.payload.event.type === 'ExitPhase' &&
      lastEvent.payload.event.payload.type === 'ResolveTrigger' &&
      cardCache.getInstance(lastEvent.payload.event.payload.payload.id)
        ?.base === '20054' &&
      cardCache.getLocation(lastEvent.payload.event.payload.payload.id)
        ?.player === player
    )
  }),
  MasterAnimist: accumulated(({ lastEvent, player, cardCache }) => {
    return (
      lastEvent?.type === 'GameEvent' &&
      lastEvent.payload.event.type === 'ExitPhase' &&
      lastEvent.payload.event.payload.type === 'ResolveTrigger' &&
      cardCache.getInstance(lastEvent.payload.event.payload.payload.id)
        ?.base === '20039' &&
      cardCache.getLocation(lastEvent.payload.event.payload.payload.id)
        ?.player === player
    )
  }),
  DidntNeedIt: instantOneTimeEvent(
    and(gameWin, ({ cardCache, player }) =>
      hand(player, cardCache).some(
        c => c.base === '20038' || c.base === '20017'
      )
    )
  ),
  Onezeroonezeroone: instantOneTimeEvent(({ lastEvent, player, cardCache }) => {
    const enemyHero = hero((1 - player) as Player, cardCache)
    return (
      enemyHero?.state.view.health === 0 &&
      lastEvent?.type === 'GameEvent' &&
      lastEvent.payload.event.type === 'ExitPhase' &&
      lastEvent.payload.event.payload.type === 'ModifyCard' &&
      'id' in lastEvent.payload.event.payload.payload.card &&
      lastEvent.payload.event.payload.payload.card.id === enemyHero.id &&
      cardCache.getInstance(lastEvent.payload.event.payload.payload.source)
        ?.base === '20040'
    )
  }),
  ContagiousVictory: instantOneTimeEvent(({ player, cardCache, lastEvent }) => {
    const enemyHero = hero((1 - player) as Player, cardCache)
    return (
      enemyHero?.state.view.health === 0 &&
      lastEvent?.type === 'GameEvent' &&
      lastEvent.payload.event.type === 'ExitPhase' &&
      lastEvent.payload.event.payload.type === 'Damage' &&
      lastEvent.payload.event.payload.payload.kind.type === 'CardEffect' &&
      isZomboid(
        cardCache.getInstance(lastEvent.payload.event.payload.payload.source)
          ?.base ?? 'Dummy'
      ) &&
      lastEvent.payload.event.payload.payload.target === enemyHero.id
    )
  }),
  RageoftheDead: oneTimeEvent({
    ...resetStatefulEventOnCondition(
      count(
        ({ cardCache, cardExecutionContext, lastEvent, player }) =>
          cardExecutionContext &&
          lastEvent?.type === 'GameEvent' &&
          lastEvent.payload.event.type === 'ExitPhase' &&
          lastEvent.payload.event.payload.type === 'ResolveTrigger' &&
          lastEvent.payload.event.payload.payload.effectType === 'Death' &&
          cardCache.getInstance(cardExecutionContext)?.base === '3049' &&
          cardCache.getLocation(lastEvent.payload.event.payload.payload.id)
            ?.player === player
      ),
      ({ lastEvent, cardCache, player }) =>
        lastEvent?.type === 'GameEvent' &&
        lastEvent.payload.event.type === 'ExitPhase' &&
        lastEvent.payload.event.payload.type === 'ResolveCardEffect' &&
        lastEvent.payload.event.payload.payload.baseCard === '3049' &&
        cardCache.getLocation(lastEvent.payload.event.payload.payload.id)
          ?.player === player
    ),
    done: s => s >= 15
  }),
  UnfathomableWealth: accumulated(
    ({ cardCache, lastEvent, player, cardExecutionContext }) =>
      lastEvent?.type === 'GameEvent' &&
      lastEvent.payload.event.type === 'ExitPhase' &&
      lastEvent.payload.event.payload.type === 'Draw' &&
      lastEvent.payload.event.payload.payload.to[0] === player &&
      cardCache.getInstance(cardExecutionContext)?.state.view.type ===
        'spell' &&
      cardCache.getLocation(cardExecutionContext)?.player === player
  ),
  CoupDeGrace: instantOneTimeEvent(
    ({ lastEvent, player, cardCache }) =>
      lastEvent?.type === 'GameEvent' &&
      lastEvent.payload.event.type === 'ExitPhase' &&
      lastEvent.payload.event.payload.type === 'Damage' &&
      lastEvent.payload.event.payload.payload.overkill >= 5 &&
      hero((1 - player) as Player, cardCache)?.id ===
        lastEvent.payload.event.payload.payload.target
  ),
  DustDevil: oneTimeEvent({
    ...count(
      whenCardMoved(
        ({ to, mover, props: { cardCache, player } }) =>
          cardCache.getLocation(mover)?.player === player &&
          to.location[0].name === 'Dust'
      )
    ),
    done: n => n >= 10
  }),
  RegeneratorPLUS: giveHealthToAllies,
  Guardbreaker: accumulated(
    whenEnemyUnitDestroyed(e =>
      e.state.view.traits.some(t => t === 'guard' || t === 'armor')
    )
  ),
  PokeofDoom: instantOneTimeEvent(({ lastEvent, player, cardCache }) => {
    const h = hero((1 - player) as Player, cardCache)
    return (
      lastEvent?.type === 'GameEvent' &&
      lastEvent.payload.event.type === 'ExitPhase' &&
      lastEvent.payload.event.payload.type === 'Damage' &&
      lastEvent.payload.event.payload.payload.overkill === 0 &&
      lastEvent.payload.event.payload.payload.amount === 1 &&
      lastEvent.payload.event.payload.payload.target === h?.id &&
      h.state.view.health === 0
    )
  }),
  FriendlyFire: accumulated(
    whenAllyUnitDestroyed(
      (_, { cardCache, player }, killer) =>
        cardCache.getLocation(killer?.id)?.player === player
    )
  ),
  Deathcaller: accumulated(
    triggerUnitEffect(
      undefined,
      'Death',
      (c, { player, cardCache }) =>
        cardCache.getLocation(c)?.location[0].name === 'Field' &&
        cardCache.getLocation(c)?.player === player
    )
  ),
  MasterofDeath: accumulated(triggerUnitEffect(undefined, 'Death')),
  IronWill: buff(),
  Beastmaster: oneTimeEvent({
    ...count(summonUnit()),
    done: state => state >= 20
  }),

  Spellslinger: oneTimeEvent({
    ...count(
      whenPlayersNonHeroAbilCardPlayed(c => c.state.view.type === 'spell')
    ),
    done: state => state >= 20
  }),
  Annihilation: oneTimeEvent({
    ...resetStatefulEventOnCondition(
      count(whenEnemyUnitDestroyed()),
      resetsAfterTurn
    ),
    done: u => u >= 4
  }),
  RecklessRage: oneTimeEvent({
    ...resetStatefulEventOnCondition(
      count(
        dealDamage(
          ({ target, props: { player, cardCache, beforeEventState } }) =>
            target.id === hero(player, cardCache)?.id &&
            beforeEventState?.state.currentPlayer === player
        )
      ),
      resetsAfterTurn
    ),
    done: d => d >= 10
  }),
  BalancePatch: accumulated(
    whenPlayersNonHeroAbilCardPlayed(
      c =>
        c.state.view.traits.includes('banner') &&
        !CardLibrary.get(c.base)?.traits.includes('banner')
    )
  ),
  DemonRush: oneTimeEvent({
    ...resetStatefulEventOnCondition(
      count(({ lastEvent: ev, player, cardCache }) => {
        const h = hero(player, cardCache)
        if (
          ev?.type === 'GameEvent' &&
          ev.payload.event.type === 'ExitPhase' &&
          ev.payload.event.payload.type === 'Attack' &&
          ev.payload.event.payload.payload.attacker === h?.id
        ) {
          return 1
        }
        return
      }),
      resetsAfterTurn
    ),
    done: s => s >= 4
  }),
  WhatDoesntKillYou: oneTimeEvent({
    initState: () => ({ taken: 0, won: false }),
    modifyState(props) {
      const { state, lastEvent: last, player, cardCache } = props
      if (
        last?.type === 'GameEvent' &&
        last.payload.event.type === 'ExitPhase' &&
        last.payload.event.payload.type === 'Damage' &&
        last.payload.event.payload.payload.target ===
          hero(player, cardCache)?.id
      ) {
        state.taken += last.payload.event.payload.payload.amount
      }
      if (gameWin(props)) {
        state.won = true
      }
      return state
    },
    done: ({ taken, won }) => won && taken >= 30
  }),
  Encore: oneTimeEvent({
    ...count(
      whenCardMoved(
        ({ from, to, props: { cardCache, cardExecutionContext, player } }) =>
          from.location?.[0].name === 'Graveyard' &&
          to.location[0].name === 'Field' &&
          to.player === player &&
          from.player === player &&
          cardCache.getLocation(cardExecutionContext)?.player === player
      )
    ),
    done: n => n >= 10
  }),
  RainbowRider: oneTimeEvent({
    initState: () => ({
      air: 0,
      dark: 0,
      earth: 0,
      fire: 0,
      light: 0,
      metal: 0,
      mind: 0,
      water: 0
    }),
    done: state => Object.values(state).every(n => n >= 2),
    modifyState({ player, cardCache, lastEvent: last, state }) {
      if (
        last?.type === 'GameEvent' &&
        last.payload.event.type === 'EnterPlayerAction' &&
        last.payload.event.payload[0] === player &&
        last.payload.event.payload[1].type === 'PlayCard'
      ) {
        const el = cardCache.getInstance(last.payload.event.payload[1].cardID)
          ?.state.view.element
        if (!el || el === 'sky') {
          return state
        }
        state[el] += 1
      }
      return state
    }
  }),
  Gravekeeper: instantOneTimeEvent(({ cardCache, player }) => {
    let grave = 0
    cardCache.forEachInstance((c, l) => {
      if (
        c.state.view.type === 'unit' &&
        l.location[0].name === 'Graveyard' &&
        l.player === player
      ) {
        grave += 1
      }
    })
    return grave >= 30
  }),
  ZomboidWrangler: accumulated(summonUnit(u => u.base === '20013')),
  ArcaneOverflow: accumulated(({ player, lastEvent: ev, cardCache }) => {
    const enemyHero = hero((1 - player) as Player, cardCache)
    if (
      ev?.type !== 'GameEvent' ||
      ev.payload.event.type !== 'ExitPhase' ||
      ev.payload.event.payload.type !== 'Damage' ||
      ev.payload.event.payload.payload.target !== enemyHero?.id ||
      cardCache.getInstance(ev.payload.event.payload.payload.source)?.state.view
        .type !== 'spell'
    ) {
      return
    }

    return ev.payload.event.payload.payload.amount
  }),
  BigBird: instantOneTimeEvent(({ player, lastEvent: ev, cardCache }) => {
    const h = hero(player, cardCache)
    if (
      ev?.type !== 'GameEvent' ||
      ev.payload.event.type !== 'ExitPhase' ||
      ev.payload.event.payload.type !== 'Attack' ||
      ev.payload.event.payload.payload.attacker !== h?.id
    ) {
      return false
    }

    return h.state.view.power >= 5
  }),
  TheBattleisWon: accumulated(
    dealDamage(
      ({ source, target, props: { cardCache, player } }) =>
        cardCache.getLocation(source)?.player === player &&
        cardCache.getLocation(target)?.player !== player
    )
  ),
  AnArmyisBuilt: accumulated(summonUnit(c => c.base === '138')),
  HeavyHitter: instantOneTimeEvent(
    and(
      gameWin,
      constructedDeckMatches(d =>
        d.every(c => {
          const meta = CardLibrary.get(c)
          if (!meta) {
            return false
          }
          return typeof meta.cost !== 'number' || meta.cost >= 4
        })
      )
    )
  ),
  Smoosh: oneTimeEvent({
    ...resetStatefulEventOnCondition(
      {
        initState: () => new Set(),
        modifyState(props) {
          if (
            props.cardCache.getInstance(props.cardExecutionContext)?.base !==
            '4055'
          ) {
            return props.state
          }

          if (props.lastEvent?.type === 'ModifyCard') {
            const loc = props.cardCache.getLocation(
              props.lastEvent.payload.instance
            )
            if (
              loc &&
              loc.location[0].name === 'Field' &&
              loc.player !== props.player &&
              props.cardCache.getInstance(loc)?.state.view.health === 0
            ) {
              props.state.add(props.lastEvent.payload.instance.id)
            }
          }
          return props.state
        }
      },
      resetsAfterPlayerAction
    ),
    done: s => s.size >= 3
  }),
  Gottagofast2: gameEndedWithoutProgressFrom(
    count(
      whenPlayersNonHeroAbilCardPlayed(
        c => !c.state.view.traits.includes('dash')
      )
    ),
    gameWin
  ),
  LongLivetheKing: instantOneTimeEvent(
    whenCardMoved(
      ({ card, mover, from, to, props: { player } }) =>
        to.player === player &&
        from.player === player &&
        from.location?.[0].name === 'Graveyard' &&
        to.location[0].name === 'Field' &&
        card?.base === '3100' &&
        mover?.base === '3100'
    )
  ),
  PowerUp: implOr(
    buff((_, buffer) => buffer.state.view.type === 'spell'),
    accumulated(
      whenCardMoved(
        ({ to, mover, props: { player, cardCache } }) =>
          !!(
            to.location?.[0].name === 'Attachment' &&
            mover?.state.view.type === 'spell' &&
            cardCache.getLocation(mover)?.player === player
          )
      )
    )
  ),
  ReducedtoAtoms: accumulated(
    whenCardMoved(
      ({ from, to, mover, card, props: { cardCache, player } }) =>
        cardCache.getLocation(mover)?.player === player &&
        to.location[0].name === 'Dust' &&
        card?.state.view.type === 'unit' &&
        from.player !== player
    )
  ),
  RestinPeace: accumulated(
    whenCardMoved(
      ({ from, to, mover, props: { cardCache, player } }) =>
        cardCache.getLocation(mover)?.player === player &&
        from.location?.[0].name === 'Graveyard' &&
        to.location[0].name === 'Dust' &&
        from.player !== player
    )
  ),
  GrandLarceny: oneTimeEvent({
    initState: () => ({ battery: false, yoink: false }),
    modifyState(props) {
      if (!field(props.player, props.cardCache).some(c => c.base === '3122')) {
        return props.state
      }
      if (whenPlayersNonHeroAbilCardPlayed(c => c.base === '3131')(props)) {
        props.state.battery = true
      } else if (
        whenPlayersNonHeroAbilCardPlayed(c => c.base === '1126')(props)
      ) {
        props.state.yoink = true
      }
      return props.state
    },
    done: s => s.battery && s.yoink
  }),
  OversoldCemetery: instantOneTimeEvent(
    ({ player, cardCache }) => graveyard(player, cardCache).length >= 40
  ),
  ThousandCuts: oneTimeEvent({
    ...resetStatefulEventOnCondition(
      {
        initState: () => ({ damage: 0, win: false }),
        modifyState(props) {
          const { state, lastEvent, player, cardCache } = props
          if (
            lastEvent?.type === 'GameEvent' &&
            lastEvent.payload.event.type === 'ExitPhase' &&
            lastEvent.payload.event.payload.type === 'Damage' &&
            lastEvent.payload.event.payload.payload.target ===
              hero((1 - player) as Player, cardCache)?.id &&
            lastEvent.payload.event.payload.payload.amount === 1
          ) {
            state.damage += 1
          }
          if (gameWin(props)) {
            state.win = true
          }
          return state
        }
      },
      resetsAfterTurn
    ),
    done: s => s.damage >= 5 && s.win
  }),
  AcrosstheRainbow: oneTimeEvent({
    ...resetStatefulEventOnCondition(
      {
        initState: () => ({
          air: 0,
          dark: 0,
          earth: 0,
          fire: 0,
          light: 0,
          metal: 0,
          mind: 0,
          water: 0
        }),
        modifyState({ lastEvent: last, cardCache, player, state }) {
          if (
            last?.type === 'GameEvent' &&
            last.payload.event.type === 'ExitPhase' &&
            last.payload.event.payload.type === 'ResolveCardEffect'
          ) {
            const card = cardCache.getInstance(
              last.payload.event.payload.payload.id
            )
            if (
              card &&
              card.state.view.element !== 'sky' &&
              cardCache.getLocation(card)?.player === player
            ) {
              state[card.state.view.element] += 1
            }
          }
          return state
        }
      } satisfies QuestStateImpl<{ [K in Exclude<Element, 'sky'>]: number }>,
      resetsAfterTurn
    ),
    done: s => Object.values(s).every(s => s >= 1)
  }),
  FromtheJawsofDefeat: instantOneTimeEvent(
    and(
      gameWin,
      ({ cardCache, player }) =>
        (hero(player, cardCache)?.state.view.health ?? Infinity) <= 5
    )
  ),
  BurnedOut: instantOneTimeEvent(
    and(
      gameWin,
      ({ player, beforeEventState }) =>
        beforeEventState?.playerCards[player].deck === 0
    )
  ),
  Calamaritastrophe: instantOneTimeEvent(
    and(gameWin, ({ player, cardCache }) => {
      const killer = hero((1 - player) as Player, cardCache)?.state.view
        .markedForDeath
      return (
        cardCache.getInstance(killer)?.base === '20063' &&
        cardCache.getLocation(killer)?.player === player
      )
    })
  ),
  HowOriginal2: oneTimeEvent({
    ...resetStatefulEventOnCondition(
      {
        initState: () => new Map<BaseCard, number>(),
        modifyState: props => {
          whenPlayersNonHeroAbilCardPlayed(c => {
            const isSpellOrUnit =
              c.state.view.type === 'spell' || c.state.view.type === 'unit'
            if (isSpellOrUnit) {
              props.state.set(c.base, (props.state.get(c.base) ?? 0) + 1)
            }
            return isSpellOrUnit
          })(props)
          return props.state
        }
      },
      resetsAfterTurn
    ),
    done: s => [...s.values()].some(t => t >= 3)
  }),
  DOOMED: oneTimeEvent({
    ...resetStatefulEventOnCondition(
      count(
        whenUnitDestroyed(
          (_, { cardCache, player }, killer) =>
            killer?.base == '2036' &&
            cardCache.getLocation(killer)?.player === player
        )
      ),
      whenPlayersNonHeroAbilCardPlayed(() => true)
    ),
    done: s => s >= 8
  }),
  StingOperation: oneTimeEvent({
    ...resetStatefulEventOnCondition(
      count(whenPlayersNonHeroAbilCardPlayed(c => c.base === '1026')),
      resetsAfterTurn
    ),
    done: s => s >= 4
  }),
  Improvisation: {
    initState: () => new Set<InstanceID>(),
    modifyState: props => {
      const { lastEvent, player, emitProgress, cardCache, state } = props
      if (
        lastEvent?.type === 'GameEvent' &&
        lastEvent.payload.event.type === 'ExitPhase' &&
        lastEvent.payload.event.payload.type === 'Draw' &&
        lastEvent.payload.event.payload.payload.from[1] === 'Prisms' &&
        lastEvent.payload.event.payload.payload.to[0] === player
      ) {
        const id = cardCache.getInstance(
          lastEvent.payload.event.payload.payload.drawnCard
        )?.id
        if (id) {
          state.add(id)
        }
      }
      if (whenPlayersNonHeroAbilCardPlayed(c => state.has(c.id))(props)) {
        emitProgress(1)
      }
      return state
    }
  } satisfies QuestStateImpl<Set<InstanceID>>,
  OddlyEven: instantOneTimeEvent(
    and(
      gameWin,
      constructedDeckMatches(d =>
        d.every(c => {
          const cost = CardLibrary.get(c)?.cost
          return typeof cost !== 'number' || cost % 2 === 1
        })
      )
    )
  ),
  EvenlyOdd: instantOneTimeEvent(
    and(
      gameWin,
      constructedDeckMatches(d =>
        d.every(c => {
          const cost = CardLibrary.get(c)?.cost
          return typeof cost !== 'number' || cost % 2 === 0
        })
      )
    )
  ),
  LowtotheGround: instantOneTimeEvent(
    and(
      gameWin,
      constructedDeckMatches(d =>
        d.every(c => {
          const cost = CardLibrary.get(c)?.cost
          return typeof cost !== 'number' || cost <= 3
        })
      )
    )
  ),
  Surveillance: accumulated(
    whenCardMoved(
      ({ mover, to, props: { player, cardCache } }) =>
        cardCache.getLocation(mover)?.player === player &&
        to.location[0].name === 'Hand' &&
        to.location[0].public &&
        to.player !== player
    )
  ),
  BackforMore: accumulated(
    whenCardMoved(
      ({ to, from, props: { player } }) =>
        to.location[0].name === 'Field' &&
        from.location?.[0].name === 'Graveyard' &&
        to.player === player
    )
  ),
  Enchanting: accumulated(
    whenCardMoved(
      ({ mover, to, props: { cardCache, player }, card }) =>
        to.location[0].name === 'Attachment' &&
        card?.state.view.type === 'enchant' &&
        cardCache.getLocation(mover)?.player === player
    )
  ),
  Showoff: gameEndedWithoutProgressFrom(
    accumulated(
      attackWith(
        (c, { player, cardCache }) => c.id === hero(player, cardCache)?.id
      )
    ),
    gameWin
  ),
  BringhometheBacon: instantOneTimeEvent(
    and(gameWin, ({ player, cardCache }) => {
      const killer = hero((1 - player) as Player, cardCache)?.state.view
        .markedForDeath
      return (
        cardCache.getInstance(killer)?.base === '2107' &&
        cardCache.getLocation(killer)?.player === player
      )
    })
  ),
  Enchantress: instantOneTimeEvent(({ cardCache, player }) => {
    const fieldEnchantBases = new Set(
      field(player, cardCache)
        .map(c => c.attachment)
        .filter(isDefined)
        .map(c => cardCache.getInstance(c)?.base)
        .filter(isDefined)
    )

    return field(player, cardCache).length >= 4 && fieldEnchantBases.size >= 3
  }),
  SeasonalChampion: accumulated(gameWin),
  Competitor: accumulated(gameFinish),
  LightthePath: accumulated(
    whenCardMoved(
      ({
        to,
        card,
        props: { cardCache, interlacedResolutionContext, player }
      }) =>
        to.location[0].name === 'Attachment' &&
        card?.base === '20019' &&
        cardCache.getLocation(interlacedResolutionContext)?.player === player &&
        cardCache.getInstance(interlacedResolutionContext)?.base === '3133'
    )
  ),
  PrismPowered: accumulated(
    ({ cardCache, lastEvent, player, triggerResolutionContext }) =>
      (lastEvent?.type === 'GameEvent' &&
        lastEvent.payload.event.type === 'EnterPlayerAction' &&
        lastEvent.payload.event.payload[0] === player &&
        lastEvent.payload.event.payload[1].type === 'PlayCard' &&
        cardCache.getInstance(lastEvent.payload.event.payload[1].cardID)?.state
          .view.type === 'heroAbility') ||
      (triggerResolutionContext &&
        lastEvent?.type === 'GameEvent' &&
        lastEvent.payload.event.type === 'ExitPhase' &&
        lastEvent.payload.event.payload.type === 'ResolveTrigger' &&
        typeof triggerResolutionContext.effect === 'object' &&
        'Intrinsic' in triggerResolutionContext.effect &&
        CardLibrary.get(triggerResolutionContext.effect.Intrinsic)?.type ===
          'heroAbility' &&
        cardCache.getLocation(triggerResolutionContext)?.player) === player
  ),
  Om: accumulated(
    ({ cardCache, lastEvent, player, triggerResolutionContext }) =>
      (triggerResolutionContext &&
        lastEvent?.type === 'GameEvent' &&
        lastEvent.payload.event.type === 'ExitPhase' &&
        lastEvent.payload.event.payload.type === 'ResolveTrigger' &&
        typeof triggerResolutionContext.effect === 'object' &&
        'Intrinsic' in triggerResolutionContext.effect &&
        triggerResolutionContext.effect.Intrinsic === '25004' &&
        cardCache.getLocation(triggerResolutionContext)?.player) === player
  ),
  MatterReshaper: accumulated(
    ({ cardCache, lastEvent, player }) =>
      lastEvent?.type === 'GameEvent' &&
      lastEvent.payload.event.type === 'EnterPlayerAction' &&
      lastEvent.payload.event.payload[0] === player &&
      lastEvent.payload.event.payload[1].type === 'PlayCard' &&
      cardCache.getInstance(lastEvent.payload.event.payload[1].cardID)?.base ===
        '25003'
  ),
  Ritualistic: accumulated(
    ({ cardCache, lastEvent, player }) =>
      lastEvent?.type === 'GameEvent' &&
      lastEvent.payload.event.type === 'EnterPlayerAction' &&
      lastEvent.payload.event.payload[0] === player &&
      lastEvent.payload.event.payload[1].type === 'PlayCard' &&
      cardCache.getInstance(lastEvent.payload.event.payload[1].cardID)?.base ===
        '25002'
  ),
  SpeedofLight: accumulated(
    ({ cardCache, lastEvent, player }) =>
      lastEvent?.type === 'GameEvent' &&
      lastEvent.payload.event.type === 'EnterPlayerAction' &&
      lastEvent.payload.event.payload[0] === player &&
      lastEvent.payload.event.payload[1].type === 'PlayCard' &&
      cardCache.getInstance(lastEvent.payload.event.payload[1].cardID)?.base ===
        '25001'
  ),
  Empowered: accumulated(
    ({ cardCache, lastEvent, player, triggerResolutionContext }) =>
      (triggerResolutionContext &&
        lastEvent?.type === 'GameEvent' &&
        lastEvent.payload.event.type === 'ExitPhase' &&
        lastEvent.payload.event.payload.type === 'ResolveTrigger' &&
        typeof triggerResolutionContext.effect === 'object' &&
        'Intrinsic' in triggerResolutionContext.effect &&
        triggerResolutionContext.effect.Intrinsic === '25000' &&
        cardCache.getLocation(triggerResolutionContext)?.player) === player
  ),
  SkillwiththeQuill: instantOneTimeEvent(
    ({ cardCache, lastEvent, interlacedResolutionContext, player }) =>
      lastEvent?.type === 'GameEvent' &&
      lastEvent.payload.event.type === 'ExitPhase' &&
      lastEvent.payload.event.payload.type === 'ModifyCard' &&
      typeof lastEvent.payload.event.payload.payload.modifier === 'object' &&
      'ModifyHealth' in lastEvent.payload.event.payload.payload.modifier &&
      lastEvent.payload.event.payload.payload.modifier.ModifyHealth[0] >= 8 &&
      cardCache.getInstance(interlacedResolutionContext)?.base === '2128' &&
      cardCache.getLocation(interlacedResolutionContext)?.player === player
  )
}

export function getQuestImpl(
  quest: QuestType
): QuestImplementation | undefined {
  return questImplementations[quest]
}
export function getQuestImpls(quests: QuestType[]): QuestImplementation[] {
  return quests.map(quest => questImplementations[quest]).filter(isDefined)
}

/**
 * Go from six units, to zero, and to six again, in a single turn.
 */
export const speedySixSwappingSequence: QuestImplementation =
  resetStatefulEventOnCondition(
    oneTimeEvent({
      initState: () => 'init',
      modifyState: ({ player, cardCache, state: unitState }) => {
        if (field(player, cardCache).length === 7) {
          if (unitState === 'init') {
            return 'six'
          }
          if (unitState === 'zero') {
            return 'six_again'
          }
        } else if (
          field(player, cardCache).length === 1 &&
          unitState === 'six'
        ) {
          return 'zero'
        }
        return unitState
      },
      done: state => state === 'six_again'
    } as const),
    resetsAfterTurn
  )
