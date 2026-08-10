// import * as Sentry from '@sentry/browser'
import {
  i18nInit,
  isSupportedLanguage,
  LOCALE_LOCAL_STORAGE_KEY
} from '@opensky/language-manager'
import { GameMode } from '@opensky/proto'
import { questsI18nNamespaces } from '@opensky/quests'
import { listenForMessage } from '@opensky/shared/browserMessageListener'
import { getReconstructionEvents } from '@opensky/shared/cardCache'
import { isLocalTrackingAllowed } from '@opensky/shared/cookies'
import device from '@opensky/shared/device'
import { isDevMode } from '@opensky/shared/devMode'
import {
  isNativeOpenSkyMobileApp,
  makeCarefulMobileMessageListener
} from '@opensky/shared/native'
import { requestSizeChange } from '@opensky/shared/renderMetrics'
import { sharedBoilerplate } from '@opensky/shared/sharedBoilerplate'
import { getLocalStorageParam } from '@opensky/shared/utils/localStorage'
import { GameState, PlayerSecret, SkyWeaver } from '@skyweaver/state-metadata'
import { Mesh } from 'three'

import { cardSelectionFinished, firstState } from '~/state'

import { getAssetsManager } from './assets'
import { setupAutomation } from './automation'
import { getCardCache, initializeCardCache } from './cardCache'
import TransformComponent from './components/TransformComponent'
import {
  SHOULD_LOG_GAME_ACTIONS,
  TURN_TIMER_WARNING_FRACTION
} from './constants'
import env from './env'
import { initializeGame, startGame, waitForGameOver } from './gameLogic'
import { abort } from './helpers/abortError'
import { initTimerStoreBehaviours } from './helpers/autoEndTurn'
import { getCardBack, possiblyGetCardBackMesh } from './helpers/cardBacks'
import { changeAssetPriorityOfHeroAbilityMSAsAndLoadThem } from './helpers/changeAssetPriorityOfHeroAbilityMSAsAndLoadThem'
import {
  gameMode,
  isConquestGame,
  isOnlineGame,
  LocalGameMode
} from './helpers/envGameModeHelpers'
import { initMaterialShaderVariantCacheHack } from './helpers/materialShaderVariantCacheHack'
import { cameraParallaxHelper } from './helpers/parallaxHelpers'
import { queryWhichPrismsAreFighting } from './helpers/queryWhichPrismsAreFighting'
import { markSetupDone } from './helpers/setupHelper'
import { getTimeMarker } from './helpers/timeMarker'
import { tutorialIntroductionPause } from './helpers/tutorialIntroductionPause'
import { initVisualHooks } from './initVisualHooks'
import { load as loadAnalytics } from './helpers/analytics-old'
import { initMatLibEditor } from './lightCaches/materials/initMatLibEditor'
import { linkMaterialChangesToMeshes } from './lightCaches/materials/lightCacheMatLib'
import { startMainGameLoop } from './mainGameLoop'
import { prewarmParticleSystem } from './meshes/Particles/particleHelpers'
import queryParams from './queryParams'
import renderer from './renderer'
import { getDropTarget } from './scenes/arena/dropTargetsLib'
import { cloudControl } from './scenes/arena/helpers'
import { animateIntro, initScene, updateScene } from './scenes/arena/index'
import { scene } from './scenes/arena/scene'
import type DarkenCoverContainer from './scenes/ui/containers/darkenCover'
import { OpenSkyUI } from './scenes/ui/OpenSkyUI'
import { store } from './state'
import { loadProgressHelper } from './state/loadProgressHelper'
import { AppStatus, appStore } from './state/stores/AppStore'
import { matchInfoStore } from './state/stores/MatchInfoStore'
import { clearAllAttributionLines } from './systems/animation/attributionTracker'
import { emitParticlesFromGeometry } from './systems/animation/emitParticlesFromGeometry'
import { meshAnimationAssetNamesFromCardID } from './systems/animation/meshAnimationPlayer'
import { resetEverything } from './systems/animation/syncState'
import { registerZoneSystem } from './systems/animation/zoneAnimationLib'
import {
  AnimationOrchestrator,
  animationOrchestratorReadyForSetup,
  animationOrchestratorReadyToStartMatch,
  getAnimationOrchestrator,
  setAnimationOrchestrator
} from './systems/AnimationOrchestrator'
import AttachmentSystem from './systems/AttachmentSystem'
import AttachmentWreathSystem from './systems/AttachmentWreathSystem'
import CardArtGenerationSystem from './systems/CardArtGenerationSystem'
import CardFocusInspectionSystem from './systems/CardFocusInspectionSystem'
import CardRewardSystem from './systems/cardPositioning/CardRewardSystem'
import ChooseSystem from './systems/cardPositioning/ChooseSystem'
import DashVisualsSystem from './systems/cardPositioning/DashVisualsSystem'
import DeckSystem from './systems/cardPositioning/DeckSystem'
import ScreenSpaceSystem from './systems/cardPositioning/ScreenSpaceSystem'
import SleepingSystem from './systems/cardPositioning/SleepingSystem'
import StealthDropSystem from './systems/cardPositioning/StealthDropSystem'
import ZoneSystem from './systems/cardPositioning/ZoneSystem'
import CardVisualsSystem from './systems/CardVisualsSystem'
import DeckPreviewSystem from './systems/DeckPreviewSystem'
import DragSystem from './systems/DragSystem'
import EmoteSystem from './systems/EmoteSystem'
import EnchantmentBounceSystem from './systems/EnchantmentBounceSystem'
import FloatationSystem from './systems/FloatationSystem'
import FrameStyleSystem from './systems/FrameStyleSystem'
import FrontFaceHidingSystem from './systems/FrontFaceHidingSystem'
import FunPokeSystem from './systems/FunPokeSystem'
import GamePinSystem from './systems/GamePinSystem'
import HighlightMaterialSystem from './systems/HighlightMaterialSystem'
import HoveringDeckWidgetSystem from './systems/HoveringDeckWidgetSystem'
import inputProvider from './systems/input/input'
import { takeAction, updateTargets } from './systems/input/StateInteractions'
import InspectionSystem from './systems/InspectionSystem'
import InteractiveIndicatorsSystem from './systems/InteractiveIndicatorsSystem'
import RevealedHandCardsSystem from './systems/RevealedHandCardsSystem'
import RopeSystem from './systems/RopeSystem'
import ShadowSystem from './systems/ShadowSystem'
import * as textOptions from './systems/text/TextOptions'
import TextureAnimationSystem from './systems/TextureAnimationSystem'
import TraitsSystem from './systems/TraitsSystem'
import TriggersHolderSystem from './systems/TriggersHolderSystem'
import TwitchExtensionSystem from './systems/TwitchExtensionSystem'
import { changeReplaySpeed, showParallaxOption } from './userSettings'
import { animationDelay } from './utils/asyncUtils'
import { attachDebugGuiToScene } from './utils/attachDebugGuiToScene'
import { cameraShaker } from './utils/cameraShaker'
import { globalAccess } from './utils/globalAccess'
import { changeUrlParamAndReload } from './utils/location'
import { waitForNextFrame } from './utils/onNextFrame'
import { quickSave } from './utils/quickSaves'
import {
  FailedToFindObject3DByName,
  findObject3DByName,
  findObject3DsWhoseNamesInclude,
  removeFromParent
} from './utils/threeUtils'
import { timeWarp } from './utils/timeWarp'
import { world } from './world'

sharedBoilerplate()
;(() => {
  loadAnalytics(isLocalTrackingAllowed())
})()

const onOpenSkyMobileMessage = makeCarefulMobileMessageListener(
  function handler(data: any) {
    if (!isNativeOpenSkyMobileApp()) {
      return
    }

    if (data.type === 'AppStatus') {
      appStore.setStatus(data.status as AppStatus)
    }
  }
)

window.device = device

listenForMessage(onOpenSkyMobileMessage)

// prevent file drags from opening those files
renderer.domElement.addEventListener('dragover', ev => {
  ev.preventDefault()
})

// load json game states
renderer.domElement.addEventListener('drop', ev => {
  ev.preventDefault()
  const loadFile = (data: string) => {
    quickSave(0, data, gameMode)
    changeUrlParamAndReload('serializedGameQuickSlotSelector', '0')
  }
  if (ev.dataTransfer?.items?.length) {
    const file = ev.dataTransfer.items[0]
    if (file.kind === 'file') {
      file.getAsFile()?.text()?.then(loadFile)
    } else {
      file.getAsString(loadFile)
    }
  }
})

export default async function main() {
  const tm = getTimeMarker()
  document.addEventListener('gesturestart', e => e.preventDefault()) // disable zooming on mobile

  if (queryParams.editMaterials) {
    initMatLibEditor()
  }

  initVisualHooks()

  const ui = new OpenSkyUI()
  globalAccess.ui = ui
  scene.add(ui.allContainersInOne)

  queryWhichPrismsAreFighting() //start this early, but do not await

  const preloader = ui.getContainer('preload')
  await preloader.ready

  const isTutorial = gameMode === GameMode.TUTORIAL
  const localStorageLang = getLocalStorageParam(LOCALE_LOCAL_STORAGE_KEY) ?? ''
  const language =
    queryParams.language && isSupportedLanguage(queryParams.language)
      ? queryParams.language
      : isSupportedLanguage(localStorageLang)
      ? localStorageLang
      : 'en'

  await i18nInit({
    defaultNS: 'game',
    lng: language,
    extraNS: isTutorial
      ? (['tutorial'] as const)
      : queryParams.recordGameForQuestTest
      ? questsI18nNamespaces
      : [],
    version: env.GITCOMMIT
  })

  tm.instantTimeMark('start rendering')
  // Start loop
  startMainGameLoop(ui, cameraShaker.shakyCamera, scene, updateScene)
  const tm1 = tm.startTimeMark('initGame')
  await initializeGame()
  tm1.complete()
  const statusIndicators = ui.getContainer('statusIndicators')
  await statusIndicators.ready
  statusIndicators.show()

  let lastProgress = 0

  const tm4a = tm.startTimeMark('initScene()')

  let darkenCoverContainer: DarkenCoverContainer | undefined
  if (!isConquestGame) {
    darkenCoverContainer = globalAccess.ui!.getContainer('darkenCover')
    if (darkenCoverContainer) {
      await darkenCoverContainer.ready
      darkenCoverContainer.show()
    }
  }

  // Initialize scenes
  const arenaPromises = initScene()
  Promise.all([
    arenaPromises.promisedIsland,
    arenaPromises.promisedGameBoard
  ]).then(() => {
    attachDebugGuiToScene(arenaPromises.arena)
  })
  arenaPromises.promisedIsland.then(() => {
    tm4a.complete()
    if (darkenCoverContainer) {
      darkenCoverContainer.semiFade(3000)
    }
  })

  queryWhichPrismsAreFighting().then(prismsAboutToBattle =>
    changeAssetPriorityOfHeroAbilityMSAsAndLoadThem(prismsAboutToBattle)
  )
  getAssetsManager().loadAll(
    progress => {
      const loaded = progress.loaded
      const total = progress.total
      const value = loaded / total

      preloader.updateProgress(value)
      lastProgress = value
      if (store.isInitialized) {
        store.updateProgress(value)
      }
    },
    [arenaPromises.promisedIsland]
  )

  let safetyId: NodeJS.Timeout | undefined
  let bothPlayersAssetsLoadedCheckerInterval: NodeJS.Timeout | undefined
  if (isOnlineGame) {
    bothPlayersAssetsLoadedCheckerInterval = setInterval(() => {
      if (
        loadProgressHelper.playerLoadingProgress === 1 &&
        loadProgressHelper.opponentLoadingProgress === 1 &&
        bothPlayersAssetsLoadedCheckerInterval
      ) {
        clearInterval(bothPlayersAssetsLoadedCheckerInterval)
        bothPlayersAssetsLoadedCheckerInterval = undefined
        safetyId = setTimeout(() => {
          setTimeout(() => {
            window.location.reload()
          }, 1000)
          tm.logUnfinishedMarkedTimes()
          throw new Error(
            'client timeout waiting for match start:\n' +
              tm.reportUnfinishedMarkedTimes()
          )
        }, 20000)
      }
    }, 1000)
  }
  store.updateProgress(lastProgress)

  await arenaPromises.promisedGameBoard

  store.subscribeToPlayerIDEvents(player => {
    if (!getCardCache() || getCardCache().owner !== player) {
      initializeCardCache(player)
      setAnimationOrchestrator(
        new AnimationOrchestrator(
          globalAccess.ui! as OpenSkyUI,
          getCardCache()
        )
      )
    }
  })

  store.subscribeToReconnectEvents(
    (
      match: GameState<SkyWeaver> | undefined,
      secret: PlayerSecret<SkyWeaver> | undefined
    ) => {
      const subs = getAnimationOrchestrator().drainSubscribersAndReset()
      resetEverything(getCardCache())
      clearAllAttributionLines()
      initializeCardCache(store.player!)
      setAnimationOrchestrator(
        new AnimationOrchestrator(
          globalAccess.ui as OpenSkyUI,
          getCardCache()
        )
      )
      for (const sub of subs) {
        getAnimationOrchestrator().subscribe(sub)
      }
      store.clearStateForReconnect()

      const rootQueue = getAnimationOrchestrator().stagingStack[0]
      rootQueue.push(waitForNextFrame)
      rootQueue.push(waitForNextFrame)
      if (!match) {
        return
      }
      store.reconnectCount += 1
      matchInfoStore.cardSelectionsDone = match.state.players.every(
        player => player.doneCardSelection
      )
      matchInfoStore.pauseSky = !matchInfoStore.cardSelectionsDone

      const reloadEvents = getReconstructionEvents(match, secret)
      getAnimationOrchestrator().queueReconstructionEvents(reloadEvents)
      store.finishReconnect()
    }
  )

  store.subscribeToStateChanges(async store => {
    const player = store.player
    const state = store.state
    try {
      if (player !== undefined && state && store.secret) {
        // Sentry.configureScope(function (scope) {
        //   scope.setExtra('turnNonce', String(state.state.turnCount))
        // })

        if (
          gameMode === GameMode.TUTORIAL &&
          !tutorialIntroductionPause.isResolved
        ) {
          await tutorialIntroductionPause
        }
        getAnimationOrchestrator().syncState(
          player,
          state,
          store.secret.secret,
          store.validActions
        )

        // We subscribe to the store instead of the AnimationOrchestrator
        // because we want valid moves to update as soon as you do something,
        // even before the animations for that thing take place
        if (
          matchInfoStore.isPlayerTurn &&
          state.state.currentPlayer === store.player
        ) {
          updateTargets(ui, state, store.validActions)
        }
      }
      await ui.onStateChange(store)
    } catch (err) {
      store.fireClientError(err)
    }
  })

  store.subscribeToStoreEvents(store => {
    ui.onStoreUpdated(store)
  })

  // Fire it once to start! Otherwise we don't see state errors that occur before this line.
  ui.onStateChange(store)
  ui.onStoreUpdated(store)

  let indent = 0
  store.subscribeToCardEvents(event => {
    if (
      gameMode !== GameMode.TUTORIAL &&
      event.type === 'GameEvent' &&
      event.payload.event.type === 'ExitPhase' &&
      event.payload.event.payload.type === 'EndTurn' &&
      getAnimationOrchestrator().hasQueuedEvents()
    ) {
      timeWarp.setCustomScaler(
        `EndTurnFastForward-${event.payload.event.payload.payload.turnCount}`,
        changeReplaySpeed.value
      )
    }

    if (
      event.type === 'MoveCard' &&
      event.payload.instance &&
      event.payload.instance[0].base
    ) {
      const cardID = event.payload.instance[0].base
      const assetsToLoad = meshAnimationAssetNamesFromCardID(cardID)

      if (assetsToLoad.length > 0) {
        const am = getAssetsManager()

        for (const asset of assetsToLoad) {
          am.loadAsset(asset)

          if (isDevMode()) {
            console.log(`Loading {${asset}} from cardID: ${cardID}`)
          }
        }
      }
    }

    // Start loading card art textures ASAP, before we animate them in.
    // if (
    //   event.type === 'MoveCard' &&
    //   event.payload.instance &&
    //   event.payload.to.location[0].name !== 'Deck' &&
    //   event.payload.to.location[0].name !== 'Dust' &&
    //   event.payload.to.location[0].name !== 'Graveyard' &&
    //   event.payload.to.location[0].name !== 'Attachment'
    // ) {
    //   for (const c of event.payload.instance) {
    //     if (!c || c.state.view.type === 'Hero') {
    //       continue
    //     }
    //     const assetName = getCardAssetString(c.base)
    //     const bgAtlasKey = CardLibrary.get(c.base)?.backgroundAsset
    //     if (bgAtlasKey) {
    //       const bgUrl = `game/cards/art-full/bgs/${bgAtlasKey}.png`
    //       getAssetsManager().load('texture', bgUrl)
    //     }

    //     const fgUrl = getCardFgUrlFromAsset(assetName, c.state.view.type)

    //     getAssetsManager().load('texture', fgUrl)

    //     console.log(fgUrl, bgAtlasKey, event.payload.to.location[0].name)
    //   }
    // }
    getAnimationOrchestrator().queueAnimationsForEvent(event)
    if (SHOULD_LOG_GAME_ACTIONS) {
      if (
        event.type === 'GameEvent' &&
        event.payload.event.type.startsWith('Exit')
      ) {
        indent--
      }
      console.log(' '.repeat(2 * indent) + JSON.stringify(event))
      if (
        event.type === 'GameEvent' &&
        event.payload.event.type.startsWith('Enter')
      ) {
        indent++
      }
    }
  })

  initTimerStoreBehaviours(store)

  const tm2 = tm.startTimeMark('startGame')
  startGame()
    .then(() => tm2.complete)
    .catch(e => store.fireClientError(e))

  const particlesReady = prewarmParticleSystem(scene)

  // const tm3 = tm.startTimeMark('assetsManager.allPending')
  await getAssetsManager().allPending()
  // tm3.complete()

  const tm4b = tm.startTimeMark('particlesReady')
  particlesReady.then(() => {
    tm4b.complete()
  })
  await particlesReady

  const stableCamera = cameraShaker.camera
  const renderCamera = cameraShaker.shakyCamera
  TransformComponent.defaultScene = scene

  if (showParallaxOption.value) {
    cameraParallaxHelper.attemptToRigCameraParallax(cameraShaker.camera)
  }

  const tm5 = tm.startTimeMark('firstState')
  await firstState
  tm5.complete()

  world.addSystem(new InteractiveIndicatorsSystem())
  world.addSystem(new CardArtGenerationSystem())
  world.addSystem(new FrameStyleSystem())
  world.addSystem(new TriggersHolderSystem())
  world.addSystem(new TraitsSystem(renderCamera))
  world.addSystem(new StealthDropSystem())
  world.addSystem(new DashVisualsSystem())
  world.addSystem(new SleepingSystem())
  world.addSystem(new FrontFaceHidingSystem())
  world.addSystem(new RevealedHandCardsSystem())
  world.addSystem(new CardVisualsSystem())
  world.addSystem(new TextureAnimationSystem())
  world.addSystem(new ScreenSpaceSystem())
  world.addSystem(new FloatationSystem())
  world.addSystem(new ShadowSystem(scene))
  world.addSystem(new DeckPreviewSystem())
  world.addSystem(new GamePinSystem())
  world.addSystem(new HighlightMaterialSystem())

  if (env.TURN_TIMER_ENABLED) {
    world.addSystem(
      new RopeSystem(
        scene,
        env.TURN_TIMER_MAX * (1 - TURN_TIMER_WARNING_FRACTION)
      )
    )
  } else {
    findObject3DsWhoseNamesInclude(scene, 'field-rope').forEach(
      removeFromParent
    )
  }

  const tm6 = tm.startTimeMark('textOptions.emoteBubbleText.fontFace.init')
  await textOptions.emoteBubbleText.fontFace.init(language)
  tm6.complete()

  const tm7 = tm.startTimeMark('ui.gameReady')
  await ui.gameReady
  tm7.complete()
  if (gameMode === GameMode.TUTORIAL) {
    ;(queryParams.skipTutorialTitle || queryParams.lethalPuzzleURL
      ? Promise.resolve()
      : animationDelay(5000)
    ).then(async () => {
      const tutorialContainer = ui.getContainer('tutorial')
      await tutorialContainer.ready
      tutorialContainer.show()
    })
  }

  world.addSystem(new HoveringDeckWidgetSystem())

  window.focus()
  cloudControl.paused = false

  if (darkenCoverContainer) {
    darkenCoverContainer.fadeOut(2000)
  }

  if (safetyId) {
    clearTimeout(safetyId)
  }
  if (bothPlayersAssetsLoadedCheckerInterval) {
    clearInterval(bothPlayersAssetsLoadedCheckerInterval)
  }

  await possiblyGetCardBackMesh(getCardBack(0))
  await possiblyGetCardBackMesh(getCardBack(1))

  //these systems rely on the final camera position to layout properly,
  // so we have to fire their inits again after the animation finishes
  // by firing the resize handler.
  const zoneSystem = new ZoneSystem(scene, stableCamera)
  world.addSystem(zoneSystem)
  registerZoneSystem(zoneSystem)

  arenaPromises.promisedIsland.then(() => {
    world.addSystem(new DragSystem(inputProvider, getDropTarget('field')))
    // world.addSystem(
    //   new EndTurnButtonParticleSystem()
    // )
    try {
      function getFunCollider(baseName: string) {
        return findObject3DByName<Mesh>(scene, baseName + '-collider', true)
      }
      const grassCollider = getFunCollider('island-grass')
      world.addSystem(
        new FunPokeSystem(
          scene,
          stableCamera,
          inputProvider,
          getFunCollider('island-dust'),
          grassCollider,
          getFunCollider('island-stone')
        )
      )
      emitParticlesFromGeometry(grassCollider, 'ambientFireflies', 0.0001)
    } catch (e) {
      if (e instanceof FailedToFindObject3DByName) {
        console.warn(
          'could not initialize FunPokeSystem, due to missing colliders'
        )
        console.warn(e.message)
      } else {
        throw e
      }
    }
  })
  // This must be underneat the Zone & Drag systems to position attachments
  // without a frame of latency
  world.addSystem(new AttachmentSystem())
  world.addSystem(new AttachmentWreathSystem())

  arenaPromises.promisedIsland.then(() => {
    world.addSystem(new DeckSystem(scene))
  })

  world.addSystem(new CardRewardSystem())
  world.addSystem(new InspectionSystem())
  world.addSystem(new TwitchExtensionSystem())
  const cardFocusInspectionSystem = new CardFocusInspectionSystem(ui)
  cardSelectionFinished.then(async function delayedFocusablesStart() {
    await animationDelay(2000)
    cardFocusInspectionSystem.active = true
  })
  world.addSystem(cardFocusInspectionSystem)
  world.addSystem(new EmoteSystem())
  world.addSystem(new EnchantmentBounceSystem())
  world.addSystem(new ChooseSystem(ui, takeAction))
  initMaterialShaderVariantCacheHack(scene)

  // Setup animation handling
  animationOrchestratorReadyForSetup.resolve()

  const skipIntro =
    queryParams.skipIntro ||
    queryParams.serializedGameQuickSlotSelector() > -1 ||
    gameMode === LocalGameMode.SANDBOX

  const tm8 = tm.startTimeMark('start island intro animation')
  await animateIntro(
    skipIntro ? 0 : store.gameJoinMethod === 'first_join' ? 5000 : 1000
  )
  // fire a resize handler to fix positioning!
  requestSizeChange()
  tm8.complete()

  ui.initSideBars().catch(abort)
  const tm9 = tm.startTimeMark('init sky tags container')
  const c = ui.getContainer('skyTags')
  await c.ready
  c.show()
  tm9.complete()

  const tm10 = tm.startTimeMark('init arena')
  await arenaPromises
  tm10.complete()

  // Allow animations to progress past Decks & Hero Abilities & Heros.
  animationOrchestratorReadyToStartMatch.resolve()

  if (queryParams.editMaterials) {
    linkMaterialChangesToMeshes(scene)
    linkMaterialChangesToMeshes(
      getAssetsManager().getAsset('gamePiecesPhysical')
    )
  }
  if (queryParams.forceConcede) {
    takeAction({ type: 'Concede' })
  }
  if (queryParams.instantReconnect && store.reconnectCount === 1) {
    setTimeout(() => store.connectECSToState(), 3000)
  }

  setupAutomation()

  tm.instantTimeMark('everything in main ready')

  markSetupDone()
  await waitForGameOver()
}
