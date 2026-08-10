import {
  DECK_CLASS_MAPPINGS,
  decode,
  encode,
  VERSION
} from '@opensky/deck-string-codec'
import {
  Account,
  DeckClass,
  DeckEquipment,
  GameMode,
  MatchStatus,
  PlayerRank,
  PlayerRankStage,
  TutorialLevel
} from '@opensky/proto'
import {
  DECKCLASS_ABILITIES,
  DECKCLASS_HEROES,
  DUAL_PRISM_DECK_SIZE,
  HeroIDs,
  SINGLE_PRISM_DECK_SIZE,
  SKYWEAVER_JWT_KEY
} from '@opensky/shared/constants'
import { gameStateStringify } from '@opensky/shared/gameStateSerializer'
import { prismsToDeckClass } from '@opensky/shared/helpers'
import { getOrCreateSubkey } from '@opensky/shared/subkey'
import {
  BaseCard,
  CardLibrary,
  GameParams,
  getDiscoveryOdds,
  isPrism,
  Player,
  TavernMode
} from '@skyweaver/state-metadata'
import * as ethers from 'ethers'

import env from '~/env'

import apiClient from './apiClient'
import { conquestDataHelper } from './helpers/conquestDataHelper'
import {
  gameMode,
  isAuthenticatedGame,
  isConquestGame,
  LocalGameMode
} from './helpers/envGameModeHelpers'
import { getTimeMarker } from './helpers/timeMarker'
import queryParams from './queryParams'
import { matchEnded, store } from './state'
import { statePlayer } from './state/StatePlayer'
import { downloadJson } from './utils/jsonDownloader'
import {
  quickLoadFromQueryParams,
  quickStartTutorialFromQueryParams
} from './utils/quickSaves'

const shouldSkipAuth = queryParams.skipAuth || queryParams.lethalPuzzleURL

export async function initializeGame() {
  const defaultAccount: Account = {
    id: 0,
    address: '',
    createdAt: new Date().toISOString(),
    experience: 0,
    level: 0,
    seasonLevel: 0,
    levelUpXP: 0,
    locale: 'en',
    warmUps: 0,
    name: queryParams.playerAlias,
    updatedAt: new Date().toISOString(),
    region: 'ca',
    stats: {
      rankedConstructed: {
        winCount: 0,
        winStreak: 0,
        lossCount: 0,
        lossStreak: 0,
        tieCount: 0,
        forfeitCount: 0,
        abandonCount: 0,
        score: 0,
        createdAt: new Date().toISOString(),
        gameMode: GameMode.RANKED_CONSTRUCTED,
        playerRank: PlayerRank.UNRANKED,
        playerRankStage: PlayerRankStage.STAGE_NONE,
        winRatio: 0,
        playerRankState: '',
        gamesPlayed: 0
      },
      rankedDiscovery: {
        winCount: 0,
        winStreak: 0,
        lossCount: 0,
        lossStreak: 0,
        tieCount: 0,
        forfeitCount: 0,
        abandonCount: 0,
        score: 0,
        createdAt: new Date().toISOString(),
        gameMode: GameMode.RANKED_DISCOVERY,
        playerRank: PlayerRank.UNRANKED,
        playerRankStage: PlayerRankStage.STAGE_NONE,
        winRatio: 0,
        playerRankState: '',
        gamesPlayed: 0
      }
    }
  }

  let wallet: ethers.providers.JsonRpcSigner | ethers.Wallet =
    ethers.Wallet.createRandom()
  let account: Account = {
    ...defaultAccount,
    address: await wallet.getAddress()
  }

  if (
    !shouldSkipAuth &&
    (isAuthenticatedGame || gameMode === LocalGameMode.SPECTATE)
  ) {
    // Fetch account if jwt found
    try {
      if (window.localStorage.getItem(SKYWEAVER_JWT_KEY)) {
        const session = await apiClient.getSession()

        if (!session.account) {
          throw new Error('No OpenSky account found for this session.')
        }

        account = session.account
      } else {
        throw new Error('cannot find opensky JWT')
      }
    } catch (err) {
      if (gameMode !== LocalGameMode.SPECTATE) {
        store.fireClientError(
          new Error('Failed to load your OpenSky account. Please reload.')
        )
        console.error(err)
        return
      }
    }
  } else {
    // non-authenticated game mode
    wallet = getOrCreateSubkey()
    account.address = wallet.address
  }

  if (!account.address) {
    // something wrong
    console.warn('Invalid wallet address')
    store.fireClientError(
      new Error('Failed to load your OpenSky account. Please reload.')
    )
    return
  }

  const subkey = getOrCreateSubkey()

  if (!subkey) {
    // subkey is generated on webapp side and stored in localstorage,
    // if not available during game client initializatoin, throw.
    throw new Error('Invalid Subkey! please request match again from webapp')
  }

  // offline authenticated game modes needs to sign subkey certification
  // with an EOA wallet, arcadeum signatures not supported
  //message content does not matter here
  const subkeyCert = await wallet.signMessage(subkey.address)
  // account address does not match player address here, because state
  // message verification needs to recover against signer ... but its ok.
  // bot mode API calls are getting player ID from jwt ...

  if (isConquestGame) {
    await conquestDataHelper.getPrematchConquestStatus()
  }

  const tm = getTimeMarker().startTimeMark('init game store')
  await store.init(env, account, subkey, subkeyCert!)
  if (queryParams.recordGameForQuestTest) {
    store.subscribeToStateChanges(async () => {
      if (store.state?.state.status.type !== 'GameOver') {
        return
      }
      const { quest } = await store.serializeBotGame()
      if (!quest) {
        throw new Error('no quest data downloaded..')
      }
      downloadJson(gameStateStringify(quest), 'recorded_game_for_quest.json')
    })
  }
  tm.complete()
  window.store = store
}

const getRandomDeckClass = () => {
  const deckClasses: Set<DeckClass> = new Set(Object.keys(DeckClass) as any)
  deckClasses.delete(DeckClass.UNKNOWN_CLASS)
  return [...deckClasses][Math.floor(Math.random() * deckClasses.size)]
}

export async function startGame() {
  const defaultDeck: [string, DeckClass, string[]] = [
    VERSION,
    getRandomDeckClass(),
    []
  ]

  const [playerDeck, botDeck] = [queryParams.deck, queryParams.botDeck].map(
    d => {
      const decodedDeck = d ? decode(CardLibrary, d) : defaultDeck

      if (!Array.isArray(decodedDeck)) {
        throw Error(decodedDeck)
      }

      const [, deckClass, deck] = decodedDeck

      const prismList = DECK_CLASS_MAPPINGS[deckClass]
        .map((dc: DeckClass) => dc.toLowerCase())
        .filter(isPrism)

      if (
        !prismList ||
        prismList.length !== DECK_CLASS_MAPPINGS[deckClass].length
      ) {
        throw new Error(`Invalid prisms ${deckClass} returned from decode`)
      }

      const deckList = deck.filter(c =>
        CardLibrary.has(c as BaseCard)
      ) as BaseCard[]

      if (deckList.length !== deck.length) {
        throw new Error(`Invalid deck ${deck} returned from decode.`)
      }
      return { deckList, prismList }
    }
  )

  const deckType = playerDeck.deckList.length > 0 ? 'constructed' : 'random'
  console.log(
    `Using ${deckType} ${playerDeck.prismList} deck ${playerDeck.deckList}`
  )

  console.log(`Starting game in ${gameMode} mode`)

  if (
    queryParams.serializedGameQuickSlotSelector() > -1 &&
    gameMode !== GameMode.TUTORIAL
  ) {
    quickLoadFromQueryParams()
  } else if (gameMode === LocalGameMode.LOCAL_BOT) {
    document.title = 'OpenSky | Local Bot'

    const defaultParams: GameParams = {
      season: 999,
      skipFirstTurnStart: false,
      fillDecksToPrismSize: true,
      maxBoardUnits: 7,
      maxHandSize: 9,
      maxTurnCount: 60,
      maxManaCrystals: 255,
      cheatsAllowed: true,
      skipMulligan: env.SKIP_CARD_SELECTION,
      cardWhitelist: undefined,
      singlePrismDeckSize: SINGLE_PRISM_DECK_SIZE,
      dualPrismDeckSize: DUAL_PRISM_DECK_SIZE,
      rigDeckOrder: false,
      allowBeyondDeckDrawOutsidePrisms: false,
      krampusMode: false,
      tavernMode: queryParams.tavernMode as TavernMode,
      randomDeckOdds: getDiscoveryOdds(),
      playerParams: [
        {
          field: [],
          graveyard: [],
          mulliganChoiceSize: 4,
          mulliganPoolSize: 7,
          heroModifiers: [],
          heroSpell: undefined,
          cardsAddedToHandAfterMulligan: [['20017', []]],
          startingMana: 1,
          skipFirstDraw: false,
          deck: []
        },
        {
          field: [],
          graveyard: [],
          mulliganChoiceSize: 4,
          mulliganPoolSize: 7,
          heroModifiers: [],
          heroSpell: undefined,
          cardsAddedToHandAfterMulligan: [],
          startingMana: 1,
          skipFirstDraw: false,
          deck: []
        }
      ]
    }
    const gameParams: GameParams =
      queryParams.gameParamsURL && queryParams.gameParamsURL.length > 0
        ? await fetch(queryParams.gameParamsURL).then(res => res.json())
        : defaultParams

    const allPrisms = Object.values(DECK_CLASS_MAPPINGS).filter(
      x => !x.some(p => p === DeckClass.UNKNOWN_CLASS)
    )
    const botPrisms = queryParams.botDeck
      ? botDeck.prismList
      : allPrisms[Math.floor(Math.random() * allPrisms.length)]
          .map(dc => dc.toLowerCase())
          .filter(isPrism)
    const hordeDeck = [
      '20027' as BaseCard, //chains unplayable
      '20027' as BaseCard, //chains unplayable
      '20027' as BaseCard, //chains unplayable
      '20027' as BaseCard, //chains unplayable
      '20027' as BaseCard, //chains unplayable
      '20027' as BaseCard, //chains unplayable
      '20027' as BaseCard, //chains unplayable
      '20027' as BaseCard, //chains unplayable
      '20027' as BaseCard, //chains unplayable
      '20027' as BaseCard, //chains unplayable
      '20027' as BaseCard, //chains unplayable
      '20027' as BaseCard, //chains unplayable
      '20027' as BaseCard, //chains unplayable
      '20027' as BaseCard, //chains unplayable
      '20027' as BaseCard, //chains unplayable
      '20027' as BaseCard, //chains unplayable
      '20027' as BaseCard, //chains unplayable
      '20027' as BaseCard, //chains unplayable
      '20027' as BaseCard, //chains unplayable
      '20027' as BaseCard, //chains unplayable
      '20027' as BaseCard, //chains unplayable
      '20027' as BaseCard, //chains unplayable
      '20027' as BaseCard, //chains unplayable
      '20027' as BaseCard, //chains unplayable
      '20027' as BaseCard, //chains unplayable
      '20027' as BaseCard, //chains unplayable
      '20027' as BaseCard //chains unplayable
    ]

    const gameDeckEquipment: DeckEquipment = {}

    gameDeckEquipment.stickers =
      queryParams.fakeStickers && queryParams.fakeStickers.length
        ? queryParams.fakeStickers
            .split(',')
            .map(num => Number.parseInt(num, 10))
        : []
    gameDeckEquipment.heroSkin =
      queryParams.fakeHeroSkins && queryParams.fakeHeroSkins.length
        ? queryParams.fakeHeroSkins
            .split(',')
            .map(num => Number.parseInt(num, 10))
            .find(
              s =>
                HeroIDs[
                  DECKCLASS_HEROES[prismsToDeckClass(playerDeck.prismList)]
                ] == s
            )
        : undefined
    gameDeckEquipment.cardBack =
      queryParams.fakeCardBacks && queryParams.fakeCardBacks.length
        ? queryParams.fakeCardBacks
            .split(',')
            .map(num => Number.parseInt(num, 10))[0]
        : undefined

    if (!shouldSkipAuth && window.localStorage.getItem(SKYWEAVER_JWT_KEY)) {
      const deckString =
        encode(
          VERSION,
          playerDeck.deckList,
          prismsToDeckClass(playerDeck.prismList)
        ) ?? ''

      const { deckEquipment } = await apiClient.getDeckEquipmentByDeckString({
        deckString
      })

      gameDeckEquipment.stickers =
        deckEquipment.stickers ?? gameDeckEquipment.stickers
      gameDeckEquipment.heroSkin =
        deckEquipment.heroSkin ?? gameDeckEquipment.heroSkin
      gameDeckEquipment.cardBack =
        deckEquipment.cardBack ?? gameDeckEquipment.cardBack
    }
    await store.startBotMatch(
      {
        cards: playerDeck.deckList,
        heroAbility: DECKCLASS_ABILITIES[
          prismsToDeckClass(playerDeck.prismList)
        ] as BaseCard,
        prisms: playerDeck.prismList
      },
      {
        cards: queryParams.botDeck
          ? botDeck.deckList
          : (queryParams.tavernMode as TavernMode) === 'horde'
          ? hordeDeck
          : [],
        heroAbility: DECKCLASS_ABILITIES[
          prismsToDeckClass(botPrisms)
        ] as BaseCard,
        prisms: botPrisms
      },
      gameParams,
      {
        deckEquipment: gameDeckEquipment,
        botAlias: queryParams.botAlias,
        botDifficulty: queryParams.botDifficulty,
        playerIsBot: queryParams.playerIsBot,
        playerGoesFirst: queryParams.playerGoesFirst
      }
    )
  } else if (gameMode === LocalGameMode.SANDBOX) {
    document.title = 'OpenSky | Sandbox'
    const gameParams: GameParams = {
      season: queryParams.skipAuth
        ? 9999
        : (await apiClient.getCurrentSeason()).res,
      skipFirstTurnStart: true,
      fillDecksToPrismSize: false,
      maxBoardUnits: 7,
      maxHandSize: 9,
      maxTurnCount: 60,
      maxManaCrystals: 255,
      cheatsAllowed: true,
      skipMulligan: true,
      cardWhitelist: undefined,
      singlePrismDeckSize: 0,
      dualPrismDeckSize: 0,
      rigDeckOrder: false,
      allowBeyondDeckDrawOutsidePrisms: false,
      krampusMode: false,
      tavernMode: undefined,
      randomDeckOdds: undefined,
      playerParams: [
        {
          field: [],
          graveyard: [],
          mulliganChoiceSize: 0,
          mulliganPoolSize: 0,
          heroModifiers: [],
          heroSpell: undefined,
          startingMana: 1,
          skipFirstDraw: true,
          cardsAddedToHandAfterMulligan: [],
          deck: []
        },
        {
          field: [],
          graveyard: [],
          mulliganChoiceSize: 0,
          mulliganPoolSize: 0,
          heroModifiers: [],
          heroSpell: undefined,
          startingMana: 0,
          skipFirstDraw: false,
          cardsAddedToHandAfterMulligan: [],
          deck: []
        }
      ]
    }
    await store.startBotMatch(
      {
        cards: [],
        heroAbility: undefined,
        prisms: playerDeck.prismList
      },
      {
        cards: [],
        heroAbility: undefined,
        prisms: botDeck.prismList
      },
      gameParams,
      {
        playerGoesFirst: true,
        deckEquipment: {
          stickers: []
        },
        botDifficulty: -1
      }
    )
  } else if (gameMode === GameMode.TUTORIAL) {
    await quickStartTutorialFromQueryParams()
  } else if (
    gameMode === GameMode.UNKNOWN &&
    queryParams.serializedGameURL &&
    queryParams.serializedGameURL.length > 0
  ) {
    const player = Number.parseInt(queryParams.serializedGamePlayer() || '', 10)
    await store.loadSerializedGame(
      queryParams.serializedGameURL,
      Number.isNaN(player) ? 0 : (player as Player)
    )
  } else if (gameMode === LocalGameMode.REPLAY) {
    const matchID = Number.parseInt(queryParams.replayMatchID || '', 10)
    if (!matchID) {
      store.fireClientError(new Error('mode=replay requires a replayMatchID'))
      return
    }
    const replayID = queryParams.replayID || ''
    if (!replayID) {
      store.fireClientError(new Error('mode=replay requires a replayID'))
      return
    }
    const timestamp =
      Number.parseInt(queryParams.replayTimestamp || '0') || undefined
    const p = Number.parseInt(queryParams.serializedGamePlayer() || '0', 10)
    const player = Number.isInteger(p) && (p === 0 || p === 1) ? p : 0
    await statePlayer.load(matchID, replayID, player as Player, timestamp)
  } else if (gameMode === LocalGameMode.SPECTATE) {
    if (!queryParams.spectateCode) {
      store.fireClientError(new Error('mode=spectate requires a spectateCode'))
      return
    }
    const authToken = window.localStorage.getItem(SKYWEAVER_JWT_KEY)
    store.spectateMatch(authToken, queryParams.spectateCode)
  } else {
    const subkey = getOrCreateSubkey()
    if (!subkey) {
      throw new Error('Missing subkey')
    }
    if (!(gameMode in GameMode)) {
      throw new Error(`Invalid game mode ${gameMode}`)
    }
    const authToken = window.localStorage.getItem(SKYWEAVER_JWT_KEY)
    if (!authToken) {
      throw new Error(`Authentication token missing`)
    }
    store.joinMatch(authToken)
    console.warn('FINDING OPPONENT...')
  }
}

export async function waitForGameOver() {
  if (gameMode === GameMode.TUTORIAL) {
    await matchEnded()
    if (!store.state) {
      throw new Error('Bot game ended, but store.state is undefined.')
    }
    if (!store.secret) {
      throw new Error('Bot game ended, but store.secret is undefined.')
    }
    if (store.player === undefined) {
      throw new Error('Bot game ended, but store.player is undefined.')
    }
    if (store.state.state.status.type !== 'GameOver') {
      throw new Error(
        'Bot game ended, but store.state.status.type is not GameOver.'
      )
    }
    const deckClass = prismsToDeckClass(
      store.state.state.players[store.player].prisms
    )

    const deck = store.secret.secret.filledDeck.filter(baseCard => {
      const meta = CardLibrary.get(baseCard)
      // If the deck string has any invalid cards, filter them out,
      // since bot match XP is a farce anyways :)
      return !!meta && meta.prism !== 'tok' && meta.prism !== 'tut'
    })

    const deckString = encode(VERSION, deck, deckClass)
    if (!deckString) {
      throw new Error(
        `Failed to encode deck string from filled deck ${
          store.secret.secret.filledDeck
        } with prisms ${store.state.state.players[store.player].prisms}`
      )
    }

    let startTimestamp = store.matchStartTime
    if (!startTimestamp) {
      console.error(`No timestamp for bot match start.`)
      startTimestamp = new Date()
    }

    const status =
      store.lastPlayerAction?.[1].type === 'Concede'
        ? MatchStatus.FORFEITED
        : MatchStatus.COMPLETED

    const tutorialLevelValue = Number.parseInt(
      queryParams.tutorialLevel ?? '',
      10
    )

    let tutorialLevel: TutorialLevel = TutorialLevel.UNKNOWN
    switch (tutorialLevelValue) {
      case 1:
        tutorialLevel = TutorialLevel.LEVEL_1
        break
      case 2:
        tutorialLevel = TutorialLevel.LEVEL_2
        break
      case 3:
        tutorialLevel = TutorialLevel.LEVEL_3
        break
      case 4:
        tutorialLevel = TutorialLevel.LEVEL_4
        break
    }

    const { rewards } = shouldSkipAuth
      ? { rewards: [] }
      : await apiClient.botMatchEnd({
          req: {
            mode: GameMode.TUTORIAL,
            metrics: {},
            status,
            turnNonce: store.state.state.turnCount,
            tutorialLevel: tutorialLevel,
            winningPlayer:
              store.state.state.status.winner === undefined
                ? 0 // 0 for ties
                : store.state.state.status.winner === store.player
                ? 1 // 1 if player wins
                : 2, // 2 if bot wins
            deckString,
            playerSessionId: window.sessStorage?.sessionId,
            matchStartedAt: startTimestamp.toISOString(),
            playerQuestProgressUpdates: {}
          }
        })
    store.applyRewards(rewards || [])
  }
}
