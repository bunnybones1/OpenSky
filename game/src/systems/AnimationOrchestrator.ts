/*
 * Card events emitted by the state originate in the WorkerProxyStore and propagate as follows.
 * (m, n) indicates a dependency where the annotated only happens after both m and n occur.
 *
 *  1 WorkerProxyStore
 *  2   ActionHistory.handleEvent (1)
 *  3     AnimationOrchestrator._events.push (2)
 *  4       AnimationOrchestrator.flushEvents (3)
 *  5   AnimationOrchestrator.queueAnimationsForEvent (1)
 *  6     CardCache.processEvent (5)
 *  7       CardCache.updateInstance (6)
 *  8         onCardUpdated (if the event is ModifyCard) (7)
 *  9         onCardMoved (if the event is MoveCard) (7)
 * 10           onCardUpdated (9)
 * 11             animateMoveCard (10)
 * 12     AnimationOrchestrator.flushEvents (4, 5)
 * 13       ActionHistoryContainer.sidebar.process (12)
 */

import { i18n } from '@opensky/language-manager'
import { GameMode } from '@opensky/proto'
import { FindByType } from '@opensky/shared/typeHelpers'
import {
  CardEvent,
  GameAction,
  GameState,
  InstanceID,
  Phase,
  PhaseResolveCardEffect,
  PhaseResolveTrigger,
  Player,
  PlayerAction,
  PlayerActionType,
  ResolvedPhase,
  SkyWeaver,
  SkyWeaverSecret
} from '@skyweaver/state-metadata'

import { CardCacheWithEntities } from '~/cardCache'
import SpecialConjureComponent from '~/components/SpecialConjureComponent'
import ZoneComponent from '~/components/ZoneComponent'
import { FANCY_LOGS, SHOULD_LOG_ACTION } from '~/constants'
import { gameMode, LocalGameMode } from '~/helpers/envGameModeHelpers'
import { isMercurial } from '~/helpers/meshAnimationMaps'
import { tutorialIntroductionPause } from '~/helpers/tutorialIntroductionPause'
import { zoneCollections } from '~/helpers/zoneCollections'
import queryParams from '~/queryParams'
import { showPlayerActionError } from '~/scenes/ui/containers/playerActionError'
import { OpenSkyUI } from '~/scenes/ui/OpenSkyUI'
import { actionHistory, store } from '~/state'
import {
  ActionHistoryEvent,
  ActionHistorySubscriber,
  ActionHistoryUnsubscriber
} from '~/state/ActionHistory'
import { matchInfoStore } from '~/state/stores/MatchInfoStore'
import { changeReplaySpeed } from '~/userSettings'
import { createResolvable } from '~/utils/asyncUtils'
import { fancyLogger, TabbedLogger } from '~/utils/fancyLogs'
import { notEmpty } from '~/utils/jsUtils'
import { waitForNextFrame } from '~/utils/onNextFrame'
import { timeWarp } from '~/utils/timeWarp'
import { world } from '~/world'

import { onEndAttack, onStartAttack } from './animation/attack'
import { onCardMoved, onCardUpdated } from './animation/cardLifecycle'
import { onEndChangeMana } from './animation/changeMana'
import { onEndChangeMaxMana } from './animation/changeMaxMana'
import { onStartCommitCardSelection } from './animation/commitCardSelection'
import { onEndConjure, onStartConjure } from './animation/conjure'
import { onEndDrawCards } from './animation/drawCards'
import { onEndEndTurn } from './animation/endTurn'
import { onEndGlory } from './animation/glory'
import { onEndModifyCard, onStartModifyCard } from './animation/modifyCard'
import { onEndMoveToZone, onStartMoveToZone } from './animation/moveToZone'
import { onStartMulligan } from './animation/mulligan'
import { onEndPlayCard, onStartPlayCard } from './animation/playCard'
import PromiseParallel from './animation/PromiseParallel'
import PromiseQueue from './animation/PromiseQueue'
import {
  onEndResolvingCardEffect,
  onStartResolvingCardEffect
} from './animation/resolveSpellEffect'
import { onEndStartTurn, onStartStartTurn } from './animation/startTurn'
import { onSetup } from './animation/syncState'
import {
  onEndResolveTrigger,
  onPhaseModified,
  onStartResolveTrigger
} from './animation/trigger'
import { animateMoveCard } from './animation/zones'
import ChooseSystem from './cardPositioning/ChooseSystem'
import { updateTargets } from './input/StateInteractions'
import { onAnimationsFinished } from './onAnimationsFinished'

const NO_ANIMATION = async () => {
  // do nothing for this animation
}

// maximum number of action history events to deliver to new subscribers
const MAX_MOST_RECENT_EVENTS = 4

export interface Collection<CE extends CardEvent<SkyWeaver> | undefined> {
  push: <T>(fn: () => T | Promise<T>) => void
  finish: () => void
  runUntilFinished: () => Promise<void>
  isExecuting: false | Promise<any>
  cardEvent?: CE
  cancel: () => void
}

type StagingStack = [
  PromiseQueue<undefined>,
  Collection<{
    type: 'GameEvent'
    payload: { event: FindByType<GameAction, 'EnterPlayerAction'> }
  }>?,
  ...Array<Collection<CardEvent<SkyWeaver>>>
]

interface BrokenReconnectReason {
  event: FindByType<CardEvent<SkyWeaver>, 'MoveCard'>
  partMissing:
    | 'entity'
    | 'cardComponent'
    | 'meshComponent'
    | 'heroComponent'
    | 'characterComponent'
    | 'didNotMoveFromOrigin'
    | 'wrongNumberOfHeroes'
    | 'cardInstance'
}

let animationOrchestrator: AnimationOrchestrator
export function getAnimationOrchestrator(): AnimationOrchestrator {
  return animationOrchestrator
}
export const animationOrchestratorReadyForSetup = createResolvable()
export const animationOrchestratorReadyToStartMatch = createResolvable()

export function setAnimationOrchestrator(orchestrator: AnimationOrchestrator) {
  animationOrchestrator = orchestrator
  animationOrchestratorReadyForSetup.then(() =>
    getAnimationOrchestrator().beginAnimations()
  )
  animationOrchestratorReadyToStartMatch.then(() =>
    getAnimationOrchestrator().letAnimationsPastSetup()
  )
}

export class AnimationOrchestrator {
  beginAnimations: () => void
  letAnimationsPastSetup: () => void
  stagingStack: StagingStack = [
    new PromiseQueue(
      err => store.fireClientError(err),
      undefined,
      () => {
        onAnimationsFinished()
      }
    )
  ]
  private _animationsHaveStarted = new Promise<void>(resolve => {
    this.beginAnimations = resolve
    this._started = true
  })
  private _animationsHaveProgressedPastSetup = new Promise<void>(resolve => {
    this.letAnimationsPastSetup = resolve
  })
  private _started = false
  readonly uuid: string
  get started() {
    return this._started
  }
  private _subscribers: Set<ActionHistorySubscriber> = new Set()

  // action history events that have been parsed, but not yet emitted
  private readonly _events: ActionHistoryEvent[] = []

  // number of action history events from _events that have started animating and need to be emitted
  private _emissions: number = 0

  // most recent action history events that should be delivered to new subscribers
  private readonly _mostRecentEvents: ActionHistoryEvent[] = []

  private _auraUpdates: Map<InstanceID, CardEvent<SkyWeaver>> | null

  private _unsubscribeFromActionHistory: () => void

  constructor(
    private ui: OpenSkyUI,
    private cardCache: CardCacheWithEntities
  ) {
    if (!cardCache) {
      throw new Error('no card cache!')
    }
    this._animationsHaveStarted
      .then(() => {
        this.stagingStack[0].runUntilFinished()
      })
      .catch(err => {
        console.error(
          'Error in animation orchestrator, forcing reconnect: ',
          err
        )
        store.connectECSToState()
      })
    this._unsubscribeFromActionHistory = actionHistory.subscribe(event => {
      this._events.push(event)
      this.flushEvents()
    })

    this.uuid = `${Math.random() * 10000000}`
    console.log('Animation orchestrator with UUID', this.uuid)
  }

  drainSubscribersAndReset() {
    const subs = this._subscribers
    this._subscribers = new Set()

    this.stagingStack.forEach(item => {
      if (item) {
        item.cancel()
      }
    })

    while (this.stagingStack.length > 1) {
      this.stagingStack.pop()
    }
    this._unsubscribeFromActionHistory()
    return subs
  }

  subscribe(subscriber: ActionHistorySubscriber): ActionHistoryUnsubscriber {
    if (this._subscribers.has(subscriber)) {
      throw new Error('subscriber already subscribed')
    }

    for (const event of this._mostRecentEvents) {
      subscriber(event)
    }

    this._subscribers.add(subscriber)

    return () => this._subscribers.delete(subscriber)
  }

  // Maintain a list of CMS card-cache-level events
  // that we haven't yet applied.
  // Each one also has a callback to call when it's time
  // to apply that event.
  private orderedEventList: Array<[CardEvent<SkyWeaver>, () => void]> = []

  hasQueuedEvents(): boolean {
    return this.stagingStack[0].hasUnexecutedPromises()
  }

  queueAnimationsForEvent = (
    event: CardEvent<SkyWeaver>,
    shouldRunEnterTrigger: boolean = false
  ) => {
    const logger = FANCY_LOGS ? fancyLogger : undefined
    if (this._auraUpdates) {
      switch (event.type) {
        case 'GameEvent':
          switch (event.payload.event.type) {
            case 'ExitAuraUpdate': {
              const auraUpdates = this._auraUpdates
              this._auraUpdates = null
              for (const event of auraUpdates.values()) {
                switch (event.type) {
                  case 'ModifyCard': {
                    this.queueAnimationsForEvent(event, shouldRunEnterTrigger)
                    break
                  }
                }
              }
              break
            }
          }
          return

        case 'ModifyCard':
          this._auraUpdates.set(event.payload.instance.id, event)
          return
      }
    }

    let runInSerialEventOrder: (
      event: CardEvent<SkyWeaver>,
      callback: () => void
    ) => Promise<void> = async () => {
      // This function body is empty, since it's immdiately re-assigned
      // in the case that it'd be called.
    }

    if (event.type !== 'GameEvent') {
      let res = () => {
        // This gets replaced immediately by the promise resolve
      }
      // This promise will resolve when all previous promises in the exact order of the events have resolved.
      const imReady = new Promise<void>(resolve => {
        res = resolve
      })

      // Once we're on the list, no other othered event can run before we do.
      this.orderedEventList.push([event, res])

      // This can be called with any arbitrary code related to the event that must be run in a strict order.
      runInSerialEventOrder = async (event, callback) => {
        // If we're about to wait for our turn,
        // but there's nobody ahead of us in line,
        if (
          this.orderedEventList.length &&
          this.orderedEventList[0][0] === event
        ) {
          // Call our own promise resolver so imReady will complete right away.
          res()
        }

        await imReady
        // Don't do anything if we're the wrong animation orchestrator (e.g. our card cache might be wrong too)
        if (getAnimationOrchestrator().uuid === this.uuid) {
          callback()
        }

        // Now, take ourselves out of the list, so we don't block future updates
        this.orderedEventList.shift()

        // And fire the next one in line, if there is one.
        const nextEvent = this.orderedEventList[0]
        if (nextEvent) {
          nextEvent[1]()
        }

        // If there's no more events in the list, the next one to arrive will see itself at the front and start the chain again.
      }
    }

    switch (event.type) {
      case 'NewPointer': {
        this._topCollection().push(async () => {
          if (this.uuid !== getAnimationOrchestrator().uuid) {
            return
          }
          if (logger) {
            logger.log('CMS NewPointer', event)
          }
          await runInSerialEventOrder(event, () => {
            this.cardCache.processEvent(event)
          })
        })
        break
      }

      case 'ModifyCard': {
        const actionStack = ActionStack.fromStagingStack(this.stagingStack)
        this._topCollection().push(async () => {
          if (this.uuid !== getAnimationOrchestrator().uuid) {
            return
          }
          if (logger) {
            logger.log('CMS Modify Card', event)
          }
          await runInSerialEventOrder(event, () => {
            const healthBeforeEvent = this.cardCache.getInstance(
              event.payload.instance
            )?.state.view.health
            this.cardCache.processEvent(event)
            const entity = this.cardCache.getEntity(event.payload.instance)
            if (entity) {
              onCardUpdated(
                this.cardCache,
                actionStack,
                logger,
                event.payload.instance,
                entity,
                healthBeforeEvent
              )
            }
          })
        })
        break
      }

      case 'MoveCard': {
        const actionStack = ActionStack.fromStagingStack(this.stagingStack)
        this._topCollection().push(async () => {
          if (this.uuid !== getAnimationOrchestrator().uuid) {
            return
          }
          if (logger) {
            logger.log('CMS Move Card', event)
          }
          const { from, to } = event.payload

          let entity = this.cardCache.getEntity(from)
          if (entity && ZoneComponent.dirtyEntities.has(entity)) {
            // zone system can only handle one zone change per card per frame,
            // so make sure we never submit a zone change for a card that hasn't already processed its own.
            await waitForNextFrame()
          }
          await runInSerialEventOrder(event, () => {
            this.cardCache.processEvent(event)
            onCardMoved(this.cardCache, actionStack, logger, event.payload)
            entity = this.cardCache.getEntity(to)
          })
          if (entity) {
            const ts = actionStack.triggerSource

            if (
              from.location &&
              from.location[0].name === 'Limbo' &&
              to.location[0].name === 'HeroAbility' &&
              entity.has('cardInstance') &&
              isMercurial(entity.get('cardInstance'))
            ) {
              entity.toggle(SpecialConjureComponent, true)
            }

            if (
              ts &&
              'effectType' in ts &&
              typeof ts.effect === 'object' &&
              'ReefDiver' in ts.effect
            ) {
              entity.toggle(SpecialConjureComponent, true)
            }

            if (
              ts &&
              this.cardCache.getInstance(ts.id)?.base ===
                '25003' /* Ari - Fabricate */ &&
              this.cardCache.getInstance(entity)?.base ===
                '4157' /* Spear Shot */
            ) {
              entity.toggle(SpecialConjureComponent, true)
            }

            // Wait for intro animation before putting cards in card sel,
            // or when card sel is skipped, in your hand.
            const toZoneName = event.payload.to.location[0].name
            if (toZoneName === 'CardSelection' || toZoneName === 'Hand') {
              await this._animationsHaveProgressedPastSetup
            }

            await animateMoveCard(
              this.cardCache,
              actionStack,
              logger,
              event.payload,
              entity
            )
          }
        })
        break
      }

      case 'ShuffleDeck': {
        this._topCollection().push(async () => {
          if (this.uuid !== getAnimationOrchestrator().uuid) {
            return
          }
          if (logger) {
            logger.log('CMS Shuffle Deck', event)
          }
          await runInSerialEventOrder(event, () => {
            this.cardCache.processEvent(event)
          })
        })
        break
      }

      case 'SortField': {
        const { field } = event.payload
        this._topCollection().push(async () => {
          if (this.uuid !== getAnimationOrchestrator().uuid) {
            return
          }
          if (logger) {
            logger.log('CMS Sort Field', event)
          }
          await runInSerialEventOrder(event, () => {
            this.cardCache.processEvent(event)
            for (const [i, id] of field.entries()) {
              const ent = this.cardCache.getEntity(id)
              if (ent && ent.has('order')) {
                ent.set('order', i)
              }
            }
          })
        })
        break
      }

      case 'GameEvent': {
        const action = event.payload.event
        switch (action.type) {
          case 'EnterPlayerAction': {
            const queue = new PromiseQueue(
              err => store.fireClientError(err),
              event
            )
            queue.push(() => {
              if (this.uuid !== getAnimationOrchestrator().uuid) {
                return
              }
              this.cardCache.clearPointers()
              switch (action.payload[1].type) {
                case 'EndTurn':
                case 'PlayCard':
                case 'Attack':
                  this._emissions++
                  this.flushEvents()
                  break
              }
              return beginPlayerAction(logger, ...action.payload)
            })
            this.startAction(queue)
            break
          }

          case 'ExitPlayerAction':
            this.endAction(async () => {
              if (this.uuid !== getAnimationOrchestrator().uuid) {
                return
              }
              await endPlayerAction(logger, ...action.payload)
            })
            break

          case 'EnterPhase': {
            const queue = new PromiseQueue(
              err => store.fireClientError(err),
              event
            )
            const actionStack = ActionStack.fromStagingStack(this.stagingStack)

            if (
              gameMode === GameMode.TUTORIAL &&
              !tutorialIntroductionPause.isResolved
            ) {
              if (action.payload.type === 'Draw') {
                queue.push(() => tutorialIntroductionPause)
              }
            }

            queue.push(() => {
              if (this.uuid !== getAnimationOrchestrator().uuid) {
                return
              }
              switch (action.payload.type) {
                case 'StartTurn':
                  this._emissions++
                  this.flushEvents()
                  break
              }
              return this.beginPhase(actionStack, logger, action.payload)
            })
            this.startAction(queue)
            break
          }

          case 'ExitPhase': {
            const actionStack = ActionStack.fromStagingStack(this.stagingStack)
            this.endAction(async () => {
              if (this.uuid !== getAnimationOrchestrator().uuid) {
                return
              }
              await this.endPhase(actionStack, logger, action.payload)
            })
            break
          }

          case 'EnterParallelPhases': {
            const parallel = new PromiseParallel(
              err => store.fireClientError(err),
              event
            )
            parallel.push(() => {
              if (this.uuid !== getAnimationOrchestrator().uuid) {
                return
              }
              if (logger && SHOULD_LOG_ACTION) {
                logger.logParallel('ENTER')
              }
            })
            this.startAction(parallel)
            break
          }

          case 'ExitParallelPhases':
            this.endAction(() => {
              if (this.uuid !== getAnimationOrchestrator().uuid) {
                return
              }
              if (logger && SHOULD_LOG_ACTION) {
                logger.logParallel('EXIT')
              }
            })
            break

          case 'PhaseModified': {
            const actionStack = ActionStack.fromStagingStack(this.stagingStack)
            this._topCollection().push(() =>
              onPhaseModified(
                this.cardCache,
                actionStack,
                logger,
                action.payload
              )
            )
            break
          }
          case 'FinishCardResolution':
            // TODO: handle this case in the future
            break

          case 'EnterAuraUpdate':
            this._auraUpdates = new Map()
            break
        }
        break
      }

      default: {
        const unhandledEvent: never = event
        console.warn('Got unexpected event', unhandledEvent)
      }
    }
  }

  nextReconstructionTimeout = 1000

  queueReconstructionEvents = (
    reconstructionEvents: Array<FindByType<CardEvent<SkyWeaver>, 'MoveCard'>>
  ) => {
    this._animationsHaveStarted
      .then(() => {
        this.stagingStack[0].runUntilFinished()
      })
      .catch(err => {
        console.error(
          'Error in animation orchestrator, forcing reconnect: ',
          err
        )
        store.connectECSToState()
      })

    this.queueAnimationsForEvent({
      type: 'GameEvent',
      payload: {
        event: {
          type: 'EnterParallelPhases'
        }
      }
    })

    if (queryParams.fakeBuggyReconnect) {
      for (const event of reconstructionEvents) {
        if (Math.random() > 0.99) {
          this.queueAnimationsForEvent({
            ...event,
            payload: {
              ...event.payload,
              to: {
                ...event.payload.to,
                location: [{ name: 'Limbo', public: true }, 0]
              }
            }
          })
        } else {
          this.queueAnimationsForEvent(event)
        }
      }
    } else {
      for (const event of reconstructionEvents) {
        this.queueAnimationsForEvent(event)
      }
    }

    this.queueAnimationsForEvent({
      type: 'GameEvent',
      payload: {
        event: {
          type: 'ExitParallelPhases'
        }
      }
    })

    this.stagingStack[0].push(() => {
      // Verify reconnect worked as expected, and if not, try again.
      const missingReconnectZoneTransitions: BrokenReconnectReason[] = []

      for (const event of reconstructionEvents) {
        const to = event.payload.to
        const toName = to.location[0].name
        // Ignore zones that don't create entities, and ignore attachments for now.
        if (
          toName === 'Dust' ||
          toName === 'Limbo' ||
          toName === 'Attachment'
        ) {
          continue
        }
        const entity = this.cardCache.getEntity(to)
        if (!entity) {
          missingReconnectZoneTransitions.push({ event, partMissing: 'entity' })
        } else if (!entity.hasComponent('card')) {
          missingReconnectZoneTransitions.push({
            event,
            partMissing: 'cardComponent'
          })
        } else if (!entity.hasComponent('mesh')) {
          missingReconnectZoneTransitions.push({
            event,
            partMissing: 'meshComponent'
          })
        } else if (toName === 'Field') {
          const instance = event.payload.instance
          const type = instance && instance[0] && instance[0].state.view.type
          if (type === 'hero' && !entity.has('hero')) {
            missingReconnectZoneTransitions.push({
              event,
              partMissing: 'heroComponent'
            })
          } else if (type === 'unit' && !entity.has('character')) {
            // TODO: figure out why Character components get applied multiple frames late, then enable this check.
            // missingReconnectZoneTransitions.push({
            //   event,
            //   partMissing: 'characterComponent'
            // })
          }
        } else if (
          to.player === store.player &&
          !entity.has('cardInstance') &&
          gameMode !== LocalGameMode.SPECTATE
        ) {
          missingReconnectZoneTransitions.push({
            event,
            partMissing: 'cardInstance'
          })
        }
      }
      if (missingReconnectZoneTransitions.length > 0) {
        console.error(
          'Reconnect did not reconstruct game state successfully! Forcing reconnect again.',
          JSON.stringify(missingReconnectZoneTransitions, null, 2)
        )
        store.connectECSToState()
      } else {
        console.log(
          'Reconnection looks good, waiting to ensure no cards are at (0,0,0).'
        )
        setTimeout(() => {
          const brokenCards: BrokenReconnectReason[] = []
          if (queryParams.fakeBuggyReconnect) {
            if (Math.random() > 0.5) {
              brokenCards.push({
                partMissing: 'didNotMoveFromOrigin',
                event: {
                  type: 'MoveCard',
                  payload: {
                    from: {
                      location: [
                        {
                          name: 'Deck'
                        },
                        undefined
                      ],
                      player: 0
                    },
                    to: {
                      location: [
                        {
                          name: 'Limbo',
                          public: false
                        },
                        0
                      ],
                      player: 0
                    },
                    instance: undefined
                  }
                }
              })
            }
          }
          for (const event of reconstructionEvents) {
            const to = event.payload.to
            const toName = to.location[0].name
            // Ignore zones that don't create entities, and ignore attachments for now.
            if (
              toName === 'Dust' ||
              toName === 'Limbo' ||
              toName === 'Attachment'
            ) {
              continue
            }
            const entity = this.cardCache.getEntity(to)
            // If an entity doesn't exist, that's neither here nor there - it might have been dusted, etc in this timeframe.
            // However, NO entity is allowed to be at (0,0,0) at this point.
            if (entity && entity.has('transform')) {
              const pos = entity.get('transform').position
              if (pos.x === 0 && pos.y === 0 && pos.z === 0) {
                brokenCards.push({ event, partMissing: 'didNotMoveFromOrigin' })
              }
            }
            if (
              toName === 'Field' &&
              event.payload.instance?.[0].base === 'Hero'
            ) {
              const numHeroes = zoneCollections.Field.items.filter(
                c =>
                  c.has('cardInstance') &&
                  c.get('cardInstance').base === 'Hero' &&
                  c.has('hero') &&
                  c.has('character')
              ).length
              if (numHeroes !== 2) {
                brokenCards.push({
                  event,
                  partMissing: 'wrongNumberOfHeroes'
                })
              }
            }
          }
          if (brokenCards.length > 0) {
            console.error(
              'Reconnect did not reconstruct game state successfully! Forcing reconnect again.',
              JSON.stringify(brokenCards, null, 2)
            )
            this.nextReconstructionTimeout *= 2
            store.connectECSToState()
          } else {
            console.log('Reconnected successfully.')
            this.nextReconstructionTimeout = 1000
          }
        }, this.nextReconstructionTimeout)
      }
    })
  }

  /// syncState gets called right away on state message.
  syncState(
    player: Player,
    match: GameState<SkyWeaver>,
    secret: SkyWeaverSecret,
    validActions: PlayerAction[]
  ) {
    const isMyTurn = match.state.currentPlayer === player
    matchInfoStore.isPlayerTurn = isMyTurn
    matchInfoStore.gameStarted = true

    // Wait for any current animations to finish so that we don't update things early.
    this.stagingStack[0].push(() => {
      updateTargets(this.ui, match, validActions)
      const gameOver = store.state?.state.status.type === 'GameOver'

      if (gameOver && gameMode !== LocalGameMode.REPLAY) {
        matchInfoStore.timer.paused = true
        matchInfoStore.timer.finished = true
        this.ui.handleMatchEnd()
      }
      // close card selection if it's already done
      if (world.hasSystem(ChooseSystem) && secret.cardSelectionState) {
        const bothPlayersDoneCardSelection = store.state?.state.players.every(
          p => p.doneCardSelection
        )
        world
          .getSystem(ChooseSystem)
          .setCardSelectionCards(
            secret.cardSelectionState,
            bothPlayersDoneCardSelection ?? false
          )
        world.getSystem(ChooseSystem).enable()
      } else if (
        world.hasSystem(ChooseSystem) &&
        world.getSystem(ChooseSystem).enabled
      ) {
        world.getSystem(ChooseSystem).disable()
      }
    })
  }

  async beginPhase(
    actionStack: ActionStack,
    logger: TabbedLogger | undefined,
    phase: Phase
  ) {
    const animationFunction = ENTER_PHASE[phase.type]
    if (logger && SHOULD_LOG_ACTION) {
      logger.logAction('ENTER', 'Phase', phase, !!animationFunction)
    }
    if (animationFunction) {
      await animationFunction(
        this.cardCache,
        actionStack,
        logger,
        phase.payload as any
      )
    }
  }

  async endPhase(
    actionStack: ActionStack,
    logger: TabbedLogger | undefined,
    phase: ResolvedPhase
  ) {
    const animationFunction = EXIT_PHASE[phase.type]
    if (animationFunction) {
      await animationFunction(
        this.cardCache,
        actionStack,
        logger,
        phase.payload as any
      )
    }
    if (logger && SHOULD_LOG_ACTION) {
      logger.logAction('EXIT', 'Phase', phase, !!animationFunction)
    }
  }

  private _topCollection() {
    return this.stagingStack[this.stagingStack.length - 1]!
  }

  private startAction(collection: Collection<CardEvent<SkyWeaver>>) {
    this._topCollection().push(() => collection.runUntilFinished())
    this.stagingStack.push(collection)
  }

  private endAction(final?: () => void | Promise<void>) {
    if (this.stagingStack.length === 1) {
      console.error(
        'Tried to end action when the staging stack only had its root.'
      )
      store.connectECSToState() // if we hit this, force a manual resync with state.
      return
    }
    const collection = this.stagingStack.pop()
    collection?.push(async () => {
      if (final) {
        await final()
      }
      collection.finish()
    })
  }

  private flushEvents() {
    while (this._events.length > 0 && this._emissions > 0) {
      const event = this._events.shift()!
      this._emissions--

      this._mostRecentEvents.push(event)
      while (this._mostRecentEvents.length > MAX_MOST_RECENT_EVENTS) {
        this._mostRecentEvents.shift()
      }

      for (const subscriber of this._subscribers) {
        subscriber(event)
      }

      let failedDraws = 0
      for (const item of event.items) {
        switch (item.type) {
          case 'Draw':
            if (!item.success) {
              failedDraws++
            }
            break
        }
      }
      if (failedDraws > 0) {
        showPlayerActionError(this.ui, {
          msg: i18n.t('ui.prompt.noCardsToConjure')
        })
      }
    }
  }
}

async function beginPlayerAction(
  logger: TabbedLogger | undefined,
  player: Player | undefined,
  playerAction: PlayerAction
) {
  const animationFunction = ENTER_PLAYER_ACTION[playerAction.type]
  if (logger && SHOULD_LOG_ACTION) {
    logger.logAction('ENTER', 'PlayerAction', playerAction, !!animationFunction)
  }
  if (animationFunction) {
    await animationFunction(logger, player, playerAction as any)
  }
}

async function endPlayerAction(
  logger: TabbedLogger | undefined,
  player: Player | undefined,
  playerAction: PlayerAction
) {
  const animationFunction = EXIT_PLAYER_ACTION[playerAction.type]
  if (logger && SHOULD_LOG_ACTION) {
    logger.logAction('EXIT', 'PlayerAction', playerAction, !!animationFunction)
  }
  if (animationFunction) {
    await animationFunction(logger, player, playerAction as any)
  }
}

const ENTER_PLAYER_ACTION: {
  [K in PlayerAction['type']]:
    | ((
        logger: TabbedLogger | undefined,
        player: Player | undefined,
        action: PlayerActionType<K>
      ) => void | Promise<void>)
    | undefined
} = {
  CommitCardSelection: onStartCommitCardSelection,
  PlayCard: onStartPlayCard,
  Attack: NO_ANIMATION,
  Concede: NO_ANIMATION,
  EndTurn: NO_ANIMATION,
  Setup: onSetup,
  Cheat: NO_ANIMATION,
  Timeout: NO_ANIMATION,
  Abandon: NO_ANIMATION
}

const EXIT_PLAYER_ACTION: {
  [K in PlayerAction['type']]:
    | ((
        logger: TabbedLogger | undefined,
        player: Player | undefined,
        action: PlayerActionType<K>
      ) => void | Promise<void>)
    | undefined
} = {
  CommitCardSelection: NO_ANIMATION,
  PlayCard: onEndPlayCard,
  Attack: NO_ANIMATION,
  Concede: NO_ANIMATION,
  EndTurn: NO_ANIMATION,
  Setup: NO_ANIMATION,
  Cheat: NO_ANIMATION,
  Timeout: NO_ANIMATION,
  Abandon: NO_ANIMATION
}

const ENTER_PHASE: {
  [K in Phase['type']]:
    | ((
        cardCache: CardCacheWithEntities,
        actionStack: ActionStack,
        logger: TabbedLogger | undefined,
        action: FindByType<Phase, K>['payload']
      ) => void | Promise<void>)
    | undefined
} = {
  Attack: onStartAttack,
  Damage: NO_ANIMATION,
  Draw: NO_ANIMATION,
  Conjure: onStartConjure,
  EndTurn: NO_ANIMATION,
  Glory: NO_ANIMATION,
  ResolveCardEffect: onStartResolvingCardEffect,
  StartTurn: onStartStartTurn,
  Cancelled: NO_ANIMATION,
  AuraUpdate: NO_ANIMATION,
  ChangeMana: NO_ANIMATION,
  ChangeMaxMana: NO_ANIMATION,
  ChangeManaNextTurn: NO_ANIMATION,
  MoveToZone: onStartMoveToZone,
  ResetCard: NO_ANIMATION,
  Mulligan: onStartMulligan,
  ModifyCard: onStartModifyCard,
  ResolveTrigger: onStartResolveTrigger,
  Overdraw: NO_ANIMATION,
  ResolveCardSelection: NO_ANIMATION
}

const EXIT_PHASE: {
  [K in ResolvedPhase['type']]:
    | ((
        cardCache: CardCacheWithEntities,
        actionStack: ActionStack,
        logger: TabbedLogger | undefined,
        action: FindByType<ResolvedPhase, K>['payload']
      ) => void | Promise<void>)
    | undefined
} = {
  Glory: onEndGlory,
  Attack: onEndAttack,
  Damage: NO_ANIMATION,
  Draw: onEndDrawCards,
  Conjure: onEndConjure,
  ResolveCardEffect: onEndResolvingCardEffect,
  StartTurn: onEndStartTurn,
  EndTurn: onEndEndTurn,
  FailedToResolve: NO_ANIMATION,
  AuraUpdate: NO_ANIMATION,
  ChangeMana: onEndChangeMana,
  ChangeMaxMana: onEndChangeMaxMana,
  ChangeManaNextTurn: NO_ANIMATION,
  MoveToZone: onEndMoveToZone,
  ResetCard: NO_ANIMATION,
  Mulligan: NO_ANIMATION,
  ModifyCard: onEndModifyCard,
  ResolveTrigger: onEndResolveTrigger,
  Overdraw: NO_ANIMATION,
  ResolveCardSelection: NO_ANIMATION
}

export class ActionStack {
  get playerAction(): [Player | undefined, PlayerAction] {
    const cardEvent = this._events.find(
      event =>
        event.type === 'GameEvent' &&
        event.payload.event.type === 'EnterPlayerAction'
    ) as
      | {
          type: 'GameEvent'
          payload: { event: FindByType<GameAction, 'EnterPlayerAction'> }
        }
      | undefined

    if (cardEvent) {
      return cardEvent.payload.event.payload
    }

    return [
      undefined,
      {
        type: 'Setup'
      }
    ]
  }

  get topPhase(): Phase | null {
    for (let i = this._events.length - 1; i >= 0; i--) {
      const item = this._events[i]
      if (
        item.type === 'GameEvent' &&
        item.payload.event.type === 'EnterPhase'
      ) {
        return item.payload.event.payload
      }
    }
    return null
  }
  get parentPhase(): Phase | null {
    for (let i = this._events.length - 2; i >= 0; i--) {
      const item = this._events[i]
      if (
        item.type === 'GameEvent' &&
        item.payload.event.type === 'EnterPhase'
      ) {
        return item.payload.event.payload
      }
    }
    return null
  }

  get triggerSource(): PhaseResolveTrigger | PhaseResolveCardEffect | null {
    for (let i = this._events.length - 1; i >= 0; i--) {
      const item = this._events[i]
      if (
        item.type === 'GameEvent' &&
        item.payload.event.type === 'EnterPhase'
      ) {
        if (
          item.payload.event.payload.type === 'ResolveTrigger' ||
          item.payload.event.payload.type === 'ResolveCardEffect'
        ) {
          return item.payload.event.payload.payload
        }
      }
    }
    return null
  }

  static fromStagingStack(stagingStack: StagingStack): ActionStack {
    const cardEvents = stagingStack
      .map(item => item?.cardEvent)
      .filter(notEmpty)
    return new ActionStack(cardEvents)
  }
  private _events: Array<CardEvent<SkyWeaver>>
  constructor(events: Array<CardEvent<SkyWeaver>>) {
    this._events = [...events]
  }
}

// fast forward animations util

let __lastTabbedAwayTime = 0

window.addEventListener('blur', () => {
  __lastTabbedAwayTime = Date.now()
})

window.addEventListener('focus', () => {
  if (gameMode === GameMode.TUTORIAL || !getAnimationOrchestrator()) {
    return
  }
  if (
    Date.now() - __lastTabbedAwayTime > 2000 &&
    getAnimationOrchestrator().hasQueuedEvents()
  ) {
    timeWarp.setCustomScaler('TabbedInFastForward', changeReplaySpeed.value)
  }
})
