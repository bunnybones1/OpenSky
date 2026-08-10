import {
  DUAL_PRISM_DECK_SIZE,
  SINGLE_PRISM_DECK_SIZE
} from '@opensky/shared/constants'
import {
  ActionStep,
  GameConfig,
  MessageStep,
  PlayerActionStep,
  PlayerCreatedLethalPuzzleConfig,
  Step,
  Turn,
  TutorialConfig
} from '@opensky/shared/tutorialConfig'
import {
  BaseCard,
  GameParams,
  GameState,
  PlayerAction,
  PlayerSecret,
  Prism,
  SkyWeaver
} from '@skyweaver/state-metadata'

import {
  MessageSyncTutorial,
  MessageTutorialChange
} from '~/state/StateSharedTypes'

import { turnsPassed } from './helpers'
import { levels } from './levels'
import { asArray } from './utils'

type TutorialChangeListener = (ev: {
  player: number
  turnCount: number
  stepIdx: number
}) => void

let tutorialData: Tutorial
export function getTutorial(): Tutorial {
  return tutorialData
}
export function setTutorial(tutorial: Tutorial) {
  tutorialData = tutorial
}
export class Tutorial {
  static async loadLethalPuzzle(lethalPuzzleURL: string): Promise<Tutorial> {
    const lethalPuzzleConfig: PlayerCreatedLethalPuzzleConfig = await fetch(
      lethalPuzzleURL
    ).then(res => res.json())
    const config: TutorialConfig = {
      ...lethalPuzzleConfig,
      allowTryAgainBeforeRewards: true,
      gameEndConditions: {
        description: 'Defeat the enemy hero this turn to win!',
        loseCondition: turnsPassed(0)
      }
    }

    const tut = new Tutorial(config)
    return tut
  }
  static load(level: string): Tutorial {
    if (!(level in levels)) {
      throw new Error('Invalid level ' + level)
    }
    const config = levels[level as keyof typeof levels]

    if (config) {
      const tut = new Tutorial(config)
      return tut
    } else {
      throw new Error(`Tutorial: Could not load tutorial level ${level}`)
    }
  }

  player: number = 0
  turnCount: number = -1
  stepIdx: number = -1
  actionStepIdx: number = -1
  actions: PlayerActionStep[] = []
  conditions: Array<PlayerActionStep & { conditionKey?: string }> = []
  readonly config: TutorialConfig

  private _changeListeners: Set<TutorialChangeListener> = new Set()

  get turnIdx() {
    return (
      (typeof this.config.setup === 'object' &&
      this.config.setup.skipFirstTurnStart
        ? this.turnCount
        : this.turnCount - 1) >> 1
    )
  }

  get turn(): Turn | undefined {
    return this.config.turns?.[this.turnIdx]
  }

  get steps(): Step[] {
    return this.turn ? this.turn[this.player ? 'enemy' : 'player'] : []
  }

  get step(): Step | undefined {
    return this.steps[this.stepIdx]
  }

  get actionStep(): ActionStep | undefined {
    return this.steps[this.actionStepIdx] as ActionStep
  }

  constructor(config: TutorialConfig) {
    this.conditions = config.conditions ? config.conditions?.slice() : []

    // Clone config object so we don't modify it.
    this.config = {
      ...config,
      introduction: config.introduction ? [...config.introduction] : undefined,
      turns: config.turns
        ? [
            ...config.turns.map(turn => ({
              player: [...turn.player],
              enemy: [...turn.enemy]
            }))
          ]
        : undefined
    }

    // Introduction Messages are not skippable
    this.config.introduction?.forEach(step => {
      step.noSkip = true
    })

    // play the game end condition once
    if (this.config.gameEndConditions) {
      const extraMessage: MessageStep = {
        type: 'message',
        text: this.config.gameEndConditions.description
      }
      if (this.config.turns?.length) {
        this.config.turns[0].player = [
          extraMessage,
          ...this.config.turns[0].player
        ]
      } else {
        this.config.turns = [{ player: [extraMessage], enemy: [] }]
      }
    }

    // Bot Messages are not skippable
    this.config.turns?.forEach(turn => {
      turn.enemy.forEach(step => {
        if (step.type === 'message') {
          step.noSkip = true
        }
      })
    })
  }

  getSetup():
    | {
        gameParams: GameParams
        playerPrisms: Prism[]
        enemyPrisms: Prism[]
        playerAbility: BaseCard | undefined
        enemyAbility: BaseCard | undefined
      }
    | string {
    if (typeof this.config.setup === 'string') {
      return this.config.setup
    }
    const player = this.config.setup.player
    const enemy = this.config.setup.enemy
    const gameParams: GameParams & Partial<GameConfig> = {
      season: 999,
      skipFirstTurnStart: false,
      fillDecksToPrismSize: false,
      maxBoardUnits: 7,
      maxHandSize: 9,
      maxManaCrystals: 255,
      maxTurnCount: 60,
      cheatsAllowed: false,
      skipMulligan: false,
      cardWhitelist: undefined,
      singlePrismDeckSize: SINGLE_PRISM_DECK_SIZE,
      dualPrismDeckSize: DUAL_PRISM_DECK_SIZE,
      rigDeckOrder: true,
      allowBeyondDeckDrawOutsidePrisms: true,
      krampusMode: false,
      tavernMode: undefined,
      randomDeckOdds: undefined,
      ...this.config.setup,
      playerParams: [
        {
          field: player?.field ?? [],
          graveyard: player?.graveyard ?? [],
          heroModifiers: player?.heroModifiers ?? [],
          heroSpell: player?.heroSpell,
          mulliganChoiceSize: player?.mulliganChoiceSize ?? 4,
          mulliganPoolSize: player?.mulliganPoolSize ?? 7,
          startingMana: player?.startingMana ?? 0,
          skipFirstDraw: player?.skipFirstDraw ?? false,
          cardsAddedToHandAfterMulligan:
            player?.cardsAddedToHandAfterMulligan ?? [],
          deck:
            player?.deck?.map(base =>
              typeof base === 'string'
                ? {
                    base,
                    attachment: undefined,
                    modifiers: []
                  }
                : base
            ) ?? []
        },
        {
          field: enemy?.field ?? [],
          graveyard: enemy?.graveyard ?? [],
          heroModifiers: enemy?.heroModifiers ?? [],
          heroSpell: enemy?.heroSpell,
          mulliganChoiceSize: enemy?.mulliganChoiceSize ?? 4,
          mulliganPoolSize: enemy?.mulliganPoolSize ?? 7,
          startingMana: player?.startingMana ?? 0,
          skipFirstDraw: player?.skipFirstDraw ?? false,
          cardsAddedToHandAfterMulligan:
            enemy?.cardsAddedToHandAfterMulligan ?? [],
          deck:
            enemy?.deck?.map(base => {
              return typeof base === 'string'
                ? {
                    base,
                    attachment: undefined,
                    modifiers: []
                  }
                : base
            }) ?? []
        }
      ]
    }

    const playerPrisms = gameParams.player?.prisms ?? ['hrt']
    const enemyPrisms = gameParams.enemy?.prisms ?? ['hrt']

    const playerAbility = gameParams.player?.heroAbility
    const enemyAbility = gameParams.enemy?.heroAbility
    delete gameParams.player
    delete gameParams.enemy

    return {
      gameParams,
      playerPrisms,
      enemyPrisms,
      playerAbility,
      enemyAbility
    }
  }

  nextStep() {
    this.stepIdx++

    this.updateActions()

    if (this.step) {
      this._changeListeners.forEach(listener =>
        listener({
          player: this.player,
          turnCount: this.turnCount,
          stepIdx: this.stepIdx
        })
      )
    } else {
      // End of turn steps
    }
  }

  // Only used on worker side
  sync(message: MessageSyncTutorial) {
    this.player = message.player
    this.turnCount = message.turnCount
    this.stepIdx = message.stepIdx

    if (message.actionStepIdx !== this.actionStepIdx) {
      this.actionStepIdx = message.actionStepIdx

      if (this.actionStep) {
        this.actions = asArray(this.actionStep.actions)
      }
    }
  }

  updateActions() {
    if (!this.hasRequiredActions()) {
      this.actions = []
      this.actionStepIdx = -1
      for (let idx = this.stepIdx; idx < this.steps.length; idx++) {
        const step = this.steps[idx]
        if (step.type === 'message' && step.noSkip) {
          break
        } else if (step.type === 'action') {
          this.actionStepIdx = idx
          this.actions = asArray(step.actions)
          break
        }
      }
    }

    return this.actions
  }

  onChange(listener: TutorialChangeListener) {
    this._changeListeners.add(listener)

    return () => this._changeListeners.delete(listener)
  }

  update(turnCount: number, player: number) {
    // Start of turn setup
    if (this.turnCount !== turnCount) {
      this.turnCount = turnCount
      this.player = player
      this.stepIdx = -1
      this.actionStepIdx = -1
    }
  }

  hasRequiredActions() {
    return (
      this.actionStepIdx >= 0 &&
      this.stepIdx <= this.actionStepIdx &&
      this.actions.length
    )
  }

  hasMoreSteps() {
    return this.stepIdx < this.steps.length - 1
  }

  hasMoreActionSteps() {
    return this.steps.some(
      (step, idx) => step.type === 'action' && idx > this.stepIdx
    )
  }

  filterValidActions(
    state: GameState<SkyWeaver>,
    player: number,
    secret: PlayerSecret<SkyWeaver>,
    validActions: PlayerAction[]
  ): PlayerAction[] {
    if (!this.hasRequiredActions()) {
      throw new Error(
        'Tutorial: Could not filter valid actions as there is not scripted action step.'
      )
    }

    const filters = this.actions.map(x => x.filter)
    const filteredActions = filters.reduce<PlayerAction[]>((acc, filter) => {
      return acc.concat(filter(state, player, secret, validActions))
    }, [])

    return filteredActions
  }

  isActionValidToBeCommitted(
    state: GameState<SkyWeaver>,
    player: number,
    action: PlayerAction,
    secret: PlayerSecret<SkyWeaver>
  ): boolean {
    if (action.type === 'Concede') {
      return true
    }

    return this.actions.some(
      x => !!x.filter(state, player, secret, [action]).length
    )
  }

  commitAction(
    state: GameState<SkyWeaver>,
    player: number,
    action: PlayerAction,
    secret: PlayerSecret<SkyWeaver>,
    playerActionStep: PlayerActionStep,
    availableActions: PlayerAction[],
    updateCallback: (data: MessageTutorialChange) => void
  ) {
    if (action.type === 'Concede') {
      return
    }

    // Try and resolve any conditional actions based on this action.
    this.commitConditionalAction(playerActionStep, action, updateCallback)

    this.stepIdx = this.actionStepIdx

    const idx = this.actions.indexOf(playerActionStep)

    // Remove the committed action from required actions
    if (idx !== -1) {
      const matchedActions = playerActionStep.filter(
        state,
        player,
        secret,
        availableActions
      )

      // Multi actions dont commit until they are complete
      if (!playerActionStep.multi || matchedActions.length === 0) {
        this.actions.splice(idx, 1)

        updateCallback({
          type: 'TutorialChange',
          actionType: 'scripted',
          player: this.player,
          turnCount: this.turnCount,
          stepIdx: this.stepIdx,
          actionIdx: idx,
          action
        })
      }
    } else {
      console.error('Somehow, you committed an invalid action to the tutorial.')
    }
  }

  commitConditionalAction(
    conditionalAction: PlayerActionStep,
    action: PlayerAction,
    updateCallback: (data: MessageTutorialChange) => void
  ) {
    const idx = this.conditions.indexOf(conditionalAction)

    // Remove the committed action from required actions
    if (idx !== -1) {
      const step = this.conditions.splice(idx, 1)[0]!
      // remove all actions with the same conditionKey
      if (step.conditionKey) {
        const indexes = this.conditions.reduce<number[]>((indexes, cond, i) => {
          if (cond.conditionKey === step.conditionKey) {
            indexes.push(i)
          }
          return indexes
        }, [])
        while (indexes.length) {
          this.conditions.splice(indexes.pop()!, 1)
        }
      }

      updateCallback({
        type: 'TutorialChange',
        actionType: 'conditional',
        player: this.player,
        turnCount: this.turnCount,
        stepIdx: this.stepIdx,
        actionIdx: idx,
        action
      })
    }
  }
}

export default Tutorial
