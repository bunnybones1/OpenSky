import { GetValidActions, ValidatePlayerAction } from '@opensky/bot'
import { isLocalDevMode } from '@opensky/shared/devMode'
import { PlayerActionStep } from '@opensky/shared/tutorialConfig'
import {
  CardLibrary,
  GameState,
  Player,
  PlayerAction,
  PlayerSecret,
  SkyWeaver
} from '@skyweaver/state-metadata'

import Tutorial from '~/tutorial/Tutorial'

import {
  MessageStartBotMatch,
  MessageStartTutorialMatch
} from '../StateSharedTypes'
import { WorkerOrFakeWorker } from '../workerAbstraction'
import { BotWorkerState, onStartBotMatch } from './botWorkerState'
import { log, sendMessage } from './common'
import { InitMessage, SwWasm } from './types'

export async function onStartTutorialMatch(
  worker: WorkerOrFakeWorker,
  sw: SwWasm,
  initMessage: InitMessage,
  data: MessageStartTutorialMatch
): Promise<BotWorkerState<any>> {
  log('Starting tutorial match')
  const { key, tutorialData } = data
  const tutorial =
    'level' in tutorialData
      ? Tutorial.load(tutorialData.level)
      : await Tutorial.loadLethalPuzzle(tutorialData.lethalPuzzleURL)

  // don't do this on dev tutorials, but..
  const config = tutorial.config
  const stateVersion = sw.getVersion()
  // provide a fallback for the first version where we didn't include this data.
  const configStateVersion = config.stateVersion
  const newestGameVersionForConfigStateVersion = await lookupStateVersion(
    initMessage.env.DEPLOY_ENV,
    configStateVersion
  )
  console.log(
    `[Tutorial] Git commit\n${initMessage.env.GITCOMMIT}\n, newest game for this tutorial's state\n${newestGameVersionForConfigStateVersion}`
  )
  if (
    newestGameVersionForConfigStateVersion &&
    newestGameVersionForConfigStateVersion !== initMessage.env.GITCOMMIT &&
    stateVersion !== 'dev' &&
    configStateVersion !== 'dev'
  ) {
    // Load old client :)
    sendMessage(worker, {
      type: 'SwitchGameVersion',
      gitCommit: newestGameVersionForConfigStateVersion
    })
    console.log(
      `Puzzle state is version ${config.stateVersion}, but we're version ${stateVersion} Loading older git commit ${newestGameVersionForConfigStateVersion}`
    )
  }
  // Override to intercept and filter valid actions based on tutorial move
  const getValidActions: GetValidActions = (state, player, secret) => {
    const validActions: PlayerAction[] = sw.getValidActions(
      state,
      player,
      secret
    )

    if (validActions.length === 0) {
      return validActions
    }

    // Tutorial not yet synced Wait for sync message to trigger another state change
    if (state.state.turnCount !== tutorial.turnCount) {
      return []
    }

    // Filter actions until there are no more scriptable actions this turn
    if (tutorial.hasRequiredActions() || tutorial.hasMoreActionSteps()) {
      if (tutorial.hasRequiredActions()) {
        const filteredActions = tutorial.filterValidActions(
          state,
          player,
          secret,
          validActions
        )

        if (
          tutorial.actionStep?.optional &&
          filteredActions.length === 0 &&
          tutorial.hasMoreActionSteps()
        ) {
          sendMessage(worker, {
            type: 'TutorialSkipForwards'
          })
        }
        return filteredActions
      }

      return []
    }

    return validActions
  }

  const validatePlayerAction: ValidatePlayerAction<
    PlayerActionStep | undefined
  > = (state, player, action, secret) => {
    if (action.type === 'Concede') {
      return
    }
    let ac
    // First check to see if this is a valid tutorial action for the current step
    if (tutorial.hasRequiredActions()) {
      if (!tutorial.isActionValidToBeCommitted(state, player, action, secret)) {
        throw {
          playerActionErrorType: 'UnscriptedTutorialAction'
        }
      } else {
        ac = tutorial.actions.find(
          x => !!x.filter(state, player, secret, [action]).length
        )
      }
    } else {
      const actionStep = tutorial.conditions.find(
        x => !!x.filter(state, player, secret, [action]).length
      )
      if (actionStep) {
        tutorial.commitConditionalAction(actionStep, action, msg =>
          sendMessage(worker, msg)
        )
      }
    }

    sw.validatePlayerAction(state, player, action, secret)
    return ac
  }

  const onStateChange = (
    state: GameState<SkyWeaver>,
    secrets: Array<PlayerSecret<SkyWeaver>>
  ) => {
    if (workerState.type === 'bot') {
      const clientPlayerID = workerState.player
      const { winCondition, loseCondition } =
        tutorial.config.gameEndConditions ?? {}

      try {
        if (state.state.status.type !== 'GameOver') {
          // if player wins by condition, bot concedes.
          if (
            winCondition &&
            winCondition(state, clientPlayerID, secrets[clientPlayerID])
          ) {
            workerState.bot.apply((1 - clientPlayerID) as Player, {
              type: 'Concede'
            })
          }

          // if player loses by condition, player concedes.
          if (
            loseCondition &&
            loseCondition(state, clientPlayerID, secrets[clientPlayerID])
          ) {
            workerState.bot.apply(clientPlayerID, {
              type: 'Concede'
            })
          }
        }
      } catch (err) {
        if (`${err}`.includes('Game is over!')) {
          // no prob
        } else {
          throw err
        }
      }
    }
  }

  const setup = tutorial.getSetup()

  const botSettings = {
    key,
    type: 'StartBotMatch',

    // Remove randomness in bot for a consistent experience
    // Bot difficulty can be controlled by stacking deck for the player
    botDifficulty: 0,
    botAlias: tutorial.config.botName ?? 'AI-WEAVER',
    playerIsBot: false,
    useTimer: false,
    waitBetweenMoves: false,

    dispatchEvenIfSuperceded: true,

    // No stickers or skins in this mode.
    deckEquipment: undefined,
    recordGameForQuestTest: false
  } as const satisfies Partial<MessageStartBotMatch>

  const afterActionApplied: (
    ...args: [
      ...Parameters<ValidatePlayerAction<PlayerActionStep>>,
      PlayerActionStep
    ]
  ) => void = (...args) => {
    const [state, player, _, secret, playerActionStep] = args
    if (playerActionStep) {
      tutorial.commitAction(
        ...args,
        sw.getValidActions(state, player, secret),
        msg => sendMessage(worker, msg)
      )
    }
  }

  const extraWorkerState = {
    tutorial,
    onStateChange,
    customValidators:
      'level' in tutorialData
        ? { getValidActions, validatePlayerAction, afterActionApplied }
        : undefined
  }

  let workerState: BotWorkerState<PlayerActionStep | undefined>
  if (typeof setup === 'string') {
    // Loading a serialized game
    workerState = onStartBotMatch(
      worker,
      sw,
      initMessage,
      {
        ...botSettings,
        serializedGame: setup,
        deckEquipment: {
          stickers: []
        }
      },
      extraWorkerState
    )
  } else {
    // Starting from scratch
    workerState = onStartBotMatch(
      worker,
      sw,
      initMessage,
      {
        ...botSettings,
        playerInfo: {
          cards: [],
          heroAbility: setup.playerAbility,
          prisms: setup.playerPrisms
        },
        botInfo: {
          cards: [],
          heroAbility: setup.enemyAbility,
          prisms: setup.enemyPrisms
        },
        playerGoesFirst: true,
        gameParams: setup.gameParams,
        deckEquipment: {
          stickers: []
        },
        botAccount: {
          crystalID: 1, // amethyst, Horizon crystal ;)
          tagArtID: CardLibrary.get(tutorial.config.botArt!)?.artSlug ?? ''
        }
      },
      extraWorkerState
    )
  }
  return workerState
}

function lookupStateVersion(
  env: string,
  configStateVersion: string | undefined
) {
  return new Promise<string | undefined>(resolve => {
    if (isLocalDevMode()) {
      resolve(undefined)
      return
    }
    function onErr(e: Error) {
      console.warn(e.message)
      resolve(undefined)
    }
    fetch(`/game/state_mappings/${env}/${configStateVersion}.json`)
      .then(r => {
        r.json()
          .then((lookup: any) => {
            resolve(lookup.latest_build)
          })
          .catch(onErr)
      })
      .catch(onErr)
  })
}
