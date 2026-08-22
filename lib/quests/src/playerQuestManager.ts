import { GameMode, Hero, QuestType } from '@opensky/proto'
import { CardCache } from '@opensky/shared/cardCache'
import {
  BaseCard,
  CardEvent,
  GameState,
  InstanceID,
  PhaseResolveTrigger,
  Player,
  PlayerSecret,
  SkyWeaver
} from '@skyweaver/state-metadata'

import { getQuestImpl } from './impls'
import { QuestImplementation } from './types'

interface ActiveQuest {
  id: number
  impl: QuestImplementation
  initProgress: number
  progress: number
  endProgress: number
  statefulEventState: unknown
  questType: QuestType
}

export interface PlayerQuestRuntimeState {
  quests: Array<{
    id: number
    progress: number
    statefulEventState: unknown
  }>
}

// No private matches allowed!!
const DEFAULT_GAME_MODE_FILTER: Array<GameMode> = [
  GameMode.CONQUEST_CONSTRUCTED,
  GameMode.CONQUEST_DISCOVERY,
  GameMode.PRACTICE_PVP,
  GameMode.WARM_UP,
  GameMode.RANKED_CONSTRUCTED,
  GameMode.RANKED_DISCOVERY
]

export class PlayerQuestManager {
  private activeQuests: Array<ActiveQuest>
  private _player: Player
  private _cardCache: CardCache
  private _lastGameState?: GameState<SkyWeaver>
  private _lastEnemySecret?: PlayerSecret<SkyWeaver>
  private _lastPlayerSecret?: PlayerSecret<SkyWeaver>
  private _eventsThisPlayerAction: Array<CardEvent<SkyWeaver>> = []
  private _cardExecutionContext: Array<InstanceID> = []
  private _triggerResolutionContext: Array<PhaseResolveTrigger> = []
  private _interlacedResolutionContext: Array<InstanceID> = []
  private _onProgress:
    | ((quest: {
        id: number
        prevProgress: number
        currProgress: number
        quest: QuestType
      }) => void)
    | undefined
  constructor({
    player,
    quests,
    gameMode,
    hero,
    deck,
    onProgress
  }: {
    quests: Array<
      {
        id: number
        progress: number
        endProgress: number
      } & (
        | {
            questType: QuestType
          }
        | {
            impl: QuestImplementation
          }
      )
    >
    player: Player
    gameMode: GameMode
    hero: Hero
    deck: BaseCard[]
    onProgress?: (quest: {
      id: number
      prevProgress: number
      currProgress: number
      quest?: QuestType
    }) => void
  }) {
    this._onProgress = onProgress
    this._player = player
    this._cardCache = new CardCache(player)
    this.activeQuests = quests
      .map(q => ({
        ...q,
        initProgress: q.progress,
        impl: 'impl' in q ? q.impl : getQuestImpl(q.questType)
      }))
      // filter out irrelevant quests
      .filter((q): q is ActiveQuest =>
        Boolean(
          q.impl &&
            (q.impl.gameModeFilter ?? DEFAULT_GAME_MODE_FILTER).includes(
              gameMode
            ) &&
            (!q.impl.heroFilter || q.impl.heroFilter.includes(hero)) &&
            (!q.impl.constructedDeckFilter ||
              q.impl.constructedDeckFilter(deck))
        )
      )
      // and build state tracking for them
      .map(quest => ({
        ...quest,
        impl: quest.impl,
        statefulEventState: quest.impl.initState()
      }))
  }

  get player() {
    return this._player
  }

  onProcessEvent(event?: CardEvent<SkyWeaver>) {
    if (event) {
      this._eventsThisPlayerAction.push(event)
      if (event.type === 'GameEvent') {
        if (event.payload.event.type === 'EnterPhase') {
          if (event.payload.event.payload.type === 'ResolveCardEffect') {
            this._cardExecutionContext.push(
              event.payload.event.payload.payload.id
            )
            this._interlacedResolutionContext.push(
              event.payload.event.payload.payload.id
            )
          } else if (event.payload.event.payload.type === 'ResolveTrigger') {
            this._triggerResolutionContext.push(
              event.payload.event.payload.payload
            )
            this._interlacedResolutionContext.push(
              event.payload.event.payload.payload.id
            )
          }
        } else if (event.payload.event.type === 'EnterPlayerAction') {
          if (event.payload.event.payload[1].type === 'Attack') {
            const attacker = event.payload.event.payload[1].attackerID
            this._cardExecutionContext.push(attacker)
            this._interlacedResolutionContext.push(attacker)
          }
        }
      }
      this._cardCache.processEvent(event)
    }

    const cardExecutionContext =
      this._cardExecutionContext[this._cardExecutionContext.length - 1]
    const triggerResolutionContext =
      this._triggerResolutionContext[this._triggerResolutionContext.length - 1]
    const interlacedResolutionContext =
      this._interlacedResolutionContext[
        this._interlacedResolutionContext.length - 1
      ]

    for (const quest of this.activeQuests) {
      const { impl } = quest
      if (quest.progress >= quest.endProgress) {
        continue
      }
      try {
        const state = impl.modifyState({
          player: this._player,
          cardCache: this._cardCache,
          beforeEventEnemySecret: this._lastEnemySecret,
          beforeEventSecret: this._lastPlayerSecret,
          beforeEventState: this._lastGameState,
          eventsThisAction: this._eventsThisPlayerAction,
          lastEvent: event,
          state: quest.statefulEventState,
          emitProgress: n => {
            if (!n) {
              return
            }
            if (this._onProgress) {
              this._onProgress({
                id: quest.id,
                currProgress: quest.progress + n,
                prevProgress: quest.progress,
                quest: quest.questType
              })
            }
            quest.progress += n
          },
          cardExecutionContext: cardExecutionContext,
          triggerResolutionContext: triggerResolutionContext,
          interlacedResolutionContext: interlacedResolutionContext
        })
        quest.statefulEventState = state
      } catch (err) {
        if (
          process.env.NODE_ENV === 'test' ||
          process.env.NODE_ENV === 'development'
        ) {
          throw err
        }
        console.error('Bug in quest implementation:', quest.id, err)
      }
    }

    if (event) {
      if (event.type === 'GameEvent') {
        if (event.payload.event.type === 'ExitPhase') {
          if (event.payload.event.payload.type === 'ResolveCardEffect') {
            this._cardExecutionContext.pop()
            this._interlacedResolutionContext.pop()
          } else if (event.payload.event.payload.type === 'ResolveTrigger') {
            this._triggerResolutionContext.pop()
            this._interlacedResolutionContext.pop()
          }
        } else if (event.payload.event.type === 'ExitPlayerAction') {
          if (event.payload.event.payload[1].type === 'Attack') {
            this._cardExecutionContext.pop()
            this._interlacedResolutionContext.pop()
          }
        }
      }
    }
  }

  onStateUpdated(
    lastGameState?: GameState<SkyWeaver>,
    lastPlayerSecret?: PlayerSecret<SkyWeaver>,
    lastEnemySecret?: PlayerSecret<SkyWeaver>
  ) {
    this._eventsThisPlayerAction = []
    this._lastGameState = lastGameState
    this._lastPlayerSecret = lastPlayerSecret
    this._lastEnemySecret = lastEnemySecret
    this._cardCache = new CardCache(
      this._player,
      lastGameState ? [lastGameState, lastPlayerSecret] : undefined
    )
    this.onProcessEvent()
  }

  getProgressThisMatch(): { [questId: number]: number } {
    return Object.fromEntries(
      this.activeQuests.map(q => [q.id, q.progress - q.initProgress])
    )
  }

  /**
   * Preserve the source quest evaluator across runtimes such as a hibernating
   * Durable Object. Values are structured-cloneable quest implementation
   * state (primitives, arrays, Maps and Sets) rather than class instances.
   */
  snapshotRuntimeState(): PlayerQuestRuntimeState {
    return {
      quests: this.activeQuests.map(quest => ({
        id: quest.id,
        progress: quest.progress,
        statefulEventState: quest.statefulEventState
      }))
    }
  }

  restoreRuntimeState(snapshot?: PlayerQuestRuntimeState): void {
    if (!snapshot) return
    const saved = new Map(snapshot.quests.map(quest => [quest.id, quest]))
    for (const quest of this.activeQuests) {
      const restored = saved.get(quest.id)
      if (!restored) continue
      quest.progress = Math.max(quest.initProgress, restored.progress)
      quest.statefulEventState = restored.statefulEventState
    }
  }
}
