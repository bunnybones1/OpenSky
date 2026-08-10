import {
  AfterActionApplied,
  GetValidActions,
  ValidatePlayerAction,
  WasmStateBotOpponent
} from '@opensky/bot'
import { GameMode, QuestType } from '@opensky/proto'
import {
  getQuestImpl,
  PlayerQuestManager,
  QuestImplTestJson
} from '@opensky/quests'
import { DECKCLASS_HEROES, PrismClass } from '@opensky/shared/constants'
import { HeroSkinLibrary } from '@opensky/shared/cosmetics'
import { AccountWithPrismsAndCosmeticsInfo } from '@opensky/shared/game-server-message-types'
import { gameStateParse } from '@opensky/shared/gameStateSerializer'
import {
  getDeckClassFromPrisms,
  prismsToDeckClass
} from '@opensky/shared/helpers'
import {
  CardEvent,
  CardLibrary,
  GameState,
  Player,
  PlayerSecret,
  Prism,
  PrivateSeed,
  SkyWeaver
} from '@skyweaver/state-metadata'
import { ethers } from 'ethers'

import Tutorial from '~/tutorial/Tutorial'
import { capitalize } from '~/utils/stringUtils'

import { MessageStartBotMatch, SerializedBotGame } from '../StateSharedTypes'
import { WorkerOrFakeWorker } from '../workerAbstraction'
import {
  connectECSToState,
  createCertification,
  createPrivateSeed,
  createSecret,
  getNonRandomBytes,
  getRandomBytes,
  log,
  sendMessage,
  signMessageSync
} from './common'
import { InitMessage, SwWasm } from './types'

export interface BotWorkerState<T> {
  type: 'bot'
  bot: WasmStateBotOpponent<T>
  player: Player
  teardown: () => void
  customValidators?: {
    getValidActions: GetValidActions
    validatePlayerAction: ValidatePlayerAction<T>
    afterActionApplied: AfterActionApplied<T>
  }
  tutorial?: Tutorial
  quest?: { record: QuestImplTestJson; manager: PlayerQuestManager } | undefined
}

export function onStartBotMatch<T>(
  worker: WorkerOrFakeWorker,
  sw: SwWasm,
  initMessage: InitMessage,
  data: MessageStartBotMatch,
  additionalWorkerState: {
    tutorial?: Tutorial
    onStateChange?: (
      state: GameState<SkyWeaver>,
      secrets: PlayerSecret<SkyWeaver>[]
    ) => void
    customValidators?: {
      getValidActions: GetValidActions
      validatePlayerAction: ValidatePlayerAction<T>
      afterActionApplied: AfterActionApplied<T>
    }
  } = {}
) {
  log('Starting bot match')
  const botWallet = ethers.Wallet.createRandom()
  const botSubkey = ethers.Wallet.createRandom()
  const botSubkeySignature = signMessageSync(
    new ethers.utils.SigningKey(botWallet.privateKey),
    //message content does not matter here
    botSubkey.address
  )
  const setupBotGame: () => [
    GameState<SkyWeaver>,
    Player,
    Array<[PlayerSecret<SkyWeaver>, number[]]>,
    PrivateSeed[]
  ] = () => {
    const subkey = new ethers.utils.SigningKey(initMessage.subkeyPrivateKey)

    const subkeyCertification = createCertification(
      initMessage.account.address,
      ethers.utils.computeAddress(subkey.publicKey),
      initMessage.subkeySignature
    )
    if ('serializedGame' in data) {
      const serializedGame: SerializedBotGame = gameStateParse(
        data.serializedGame
      )
      const certifications = [
        subkeyCertification,
        createCertification(
          botWallet.address,
          botSubkey.address,
          botSubkeySignature
        )
      ]
      const localPlayer =
        data.localPlayer ?? serializedGame.state.state.currentPlayer

      if (localPlayer === 1) {
        certifications.reverse()
      }

      const privateSeeds = serializedGame.secrets.map((secret, i) =>
        createPrivateSeed(
          secret.secret.originalDeck,
          serializedGame.state.state.players[i].heroAbilityBase,
          serializedGame.state.state.players[i].prisms,
          certifications[i],
          secret.secret.cardRarities
        )
      )

      return [
        serializedGame.state,
        localPlayer,
        serializedGame.secrets.map((secret, i) => [
          secret,
          privateSeeds[i].randomSeed
        ]),
        privateSeeds
      ]
    } else {
      const clientPlayerID = data.playerGoesFirst
        ? 0
        : Math.random() > 0.5
        ? 0
        : 1

      const playerPrivateSeed = createPrivateSeed(
        data.playerInfo.cards,
        data.playerInfo.heroAbility,
        data.playerInfo.prisms,
        subkeyCertification
      )

      const botPrivateSeed = createPrivateSeed(
        data.botInfo.cards,
        data.botInfo.heroAbility,
        data.botInfo.prisms,
        createCertification(
          botWallet.address,
          botSubkey.address,
          botSubkeySignature
        )
      )
      const privateSeeds: [PrivateSeed, PrivateSeed] = [
        playerPrivateSeed,
        botPrivateSeed
      ]

      if (clientPlayerID === 1) {
        privateSeeds.reverse()
      }
      const state = sw.create_new_skyweaver_game(
        data.gameParams,
        privateSeeds[0],
        privateSeeds[1]
      )

      return [
        state,
        clientPlayerID,
        privateSeeds.map((seed, i: Player) => createSecret(i, seed)),
        privateSeeds
      ]
    }
  }
  const [state, clientPlayerID, secrets, privateSeeds] = setupBotGame()

  const useTimer = data.useTimer

  const getBotName = () => {
    if (data.botAlias) {
      return data.botAlias
    }
    const { tutorial } = additionalWorkerState
    if (tutorial) {
      if ('playerInfo' in data) {
        const deckClass = getDeckClassFromPrisms(
          data.botInfo.prisms.map(str => str.toUpperCase()) as PrismClass[]
        )
        if (deckClass) {
          const botName = DECKCLASS_HEROES[deckClass].toLowerCase()
          return capitalize(botName)
        }
      }
    }
    return data.botAlias ?? 'AI-WEAVER'
  }

  const accounts: [
    AccountWithPrismsAndCosmeticsInfo,
    AccountWithPrismsAndCosmeticsInfo
  ] = [
    {
      ...initMessage.account,
      prisms: privateSeeds[clientPlayerID].prisms,
      deckEquipment: data.deckEquipment
    },
    {
      id: 0,
      address: botWallet.address,
      createdAt: new Date().toISOString(),
      experience: 0,
      level: 0,
      seasonLevel: 0,
      levelUpXP: 0,
      locale: 'en',
      warmUps: 0,
      name: getBotName(),
      updatedAt: new Date().toISOString(),
      prisms: privateSeeds[1 - clientPlayerID].prisms,
      region: '',
      deckEquipment: data.deckEquipment,
      ...data.botAccount
    }
  ]

  for (const [i, account] of accounts.entries()) {
    const thisSkin = [...HeroSkinLibrary.values()].find(
      s => account.deckEquipment?.heroSkin == s.id
    )
    const skinRarity = thisSkin?.grade ?? 'base'
    const params =
      state.state.gameParams.playerParams[
        i === 0 ? clientPlayerID : 1 - clientPlayerID
      ]
    params.cardsAddedToHandAfterMulligan.forEach(card =>
      card[1].push({
        SetRarity: skinRarity
      })
    )
    params.heroSpell?.[1].push({
      SetRarity: skinRarity
    })
    params.heroModifiers.push({
      SetRarity: skinRarity
    })
  }

  // send client account ID message
  sendMessage(worker, {
    type: 'SetClientAccountID',
    player: clientPlayerID
  })

  if (clientPlayerID) {
    accounts.reverse()
  }

  // send fake "accounts"
  sendMessage(worker, {
    type: 'AccountInfo',
    accounts
  })

  const quest:
    | { record: QuestImplTestJson; manager: PlayerQuestManager }
    | undefined = data.recordGameForQuestTest
    ? {
        record: {
          players: [
            {
              cards: privateSeeds[clientPlayerID].cards,
              prisms: privateSeeds[clientPlayerID].prisms as [Prism, Prism]
            },
            {
              cards: privateSeeds[1 - clientPlayerID].cards,
              prisms: privateSeeds[1 - clientPlayerID].prisms as [Prism, Prism]
            }
          ],
          actions: []
        },
        manager: new PlayerQuestManager({
          deck: privateSeeds[clientPlayerID].cards,
          gameMode: GameMode.RANKED_CONSTRUCTED,
          hero: DECKCLASS_HEROES[
            prismsToDeckClass(privateSeeds[clientPlayerID].prisms)
          ],
          player: clientPlayerID,
          quests: [
            {
              id: 0,
              impl:
                getQuestImpl(data.recordGameForQuestTest) ??
                (() => {
                  throw new Error(
                    'Invalid quest ' + data.recordGameForQuestTest
                  )
                })(),
              progress: 0,
              endProgress: 99999,
              questType: data.recordGameForQuestTest
            }
          ],
          onProgress: ({ prevProgress, currProgress }) => {
            console.log('quest progerss!')
            sendMessage(worker, {
              type: 'QuestProgress',
              prevProgress,
              currProgress,
              endProgress: 99999,
              quest: data.recordGameForQuestTest as QuestType
            })
          }
        })
      }
    : undefined

  try {
    const getValidActions =
      additionalWorkerState.customValidators?.getValidActions ||
      sw.getValidActions
    const validatePlayerAction =
      additionalWorkerState.customValidators?.validatePlayerAction ||
      ((...args) => {
        return sw.validatePlayerAction(...args) as T
      })

    const bot = new WasmStateBotOpponent<T>(
      (1 - clientPlayerID) as Player,
      () => {
        return [
          new sw.WasmState(
            state,
            secrets,
            (target: Player | undefined, event: CardEvent<SkyWeaver>) => {
              sendMessage(worker, { type: 'CardEvent', event })
              if (workerState.quest) {
                workerState.quest.manager.onProcessEvent(event)
              }
            },
            data.recordGameForQuestTest ? getNonRandomBytes : getRandomBytes
          ),
          getValidActions,
          validatePlayerAction,
          CardLibrary,
          additionalWorkerState.customValidators?.afterActionApplied ??
            (() => {
              //noop
            })
        ]
      },
      {
        difficulty: data.botDifficulty,
        waitBetweenMoves: data.waitBetweenMoves,
        logger: console.log,
        dispatchEvenIfSuperceded: data.dispatchEvenIfSuperceded,
        onStateChange: (
          state: GameState<SkyWeaver>,
          secrets: Array<PlayerSecret<SkyWeaver>>
        ) => {
          let player: Player | undefined
          let endTime = 0
          if (useTimer) {
            if (state.state.currentPlayer !== player) {
              player = state.state.currentPlayer
              endTime = Date.now() + initMessage.env.TURN_TIMER_MAX
            } else {
              endTime += 3000
            }
            sendMessage(worker, {
              type: 'TurnTimer',
              endTime,
              player
            })
          }
          const secret = secrets[clientPlayerID]

          const getValidActions = additionalWorkerState.customValidators
            ? additionalWorkerState.customValidators.getValidActions
            : sw.getValidActions

          setTimeout(
            () =>
              sendMessage(worker, {
                type: 'StateChange',
                state: {
                  state,
                  secret
                },
                validActions: getValidActions(state, clientPlayerID, secret),
                undraggableIDs: sw.getUndraggableIDs(
                  state,
                  clientPlayerID,
                  secret
                )
              }),
            1
          )

          const botSecret = secrets[bot.playerId]
          bot.handleStateChange(state, botSecret)
          sendMessage(worker, {
            type: 'BotSecret',
            secret: botSecret
          })
          setTimeout(() => {
            if (additionalWorkerState.onStateChange) {
              additionalWorkerState.onStateChange(state, secrets)
            }
            if (data.playerIsBot) {
              // let bot play as both players!
              bot.playerId = state.state.currentPlayer
            }
          }, 1)
          if (workerState.quest) {
            workerState.quest.manager.onStateUpdated(
              state,
              secrets[clientPlayerID],
              secrets[1 - clientPlayerID]
            )
          }
        }
      }
    )
    if (quest) {
      const orig = bot.apply.bind(bot)
      bot.apply = function (player, action) {
        quest?.record.actions.push([player, action])
        orig(player, action)
      }
    }

    console.log({ quest })

    const workerState: BotWorkerState<T> = {
      type: 'bot',
      bot,
      player: clientPlayerID,
      teardown: () => {
        bot.rawState.free()
      },
      quest,
      ...additionalWorkerState
    }
    if ('serializedGame' in data) {
      bot.onStateChange(bot.state.state, [bot.secret(0), bot.secret(1)])
      connectECSToState(worker, workerState, sw, clientPlayerID, bot.rawState)
    } else {
      // eslint-disable-next-line prefer-spread
      bot.apply(undefined, { type: 'Setup' })
    }
    return workerState
  } catch (err) {
    console.log('failed to start bot match. data:', data)
    sendMessage(worker, {
      type: 'Error',
      level: 'client',
      error: {
        name: 'BotGameLoadError',
        message:
          ('serializedGame' in data
            ? 'Failed to load serialized bot game.'
            : 'Failed to start bot match.') +
          '\n' +
          (err || '')
      }
    })

    throw err
  }
}
