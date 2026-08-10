import { TFuncKey } from '@opensky/language-manager'
import { GameMode } from '@opensky/proto'
import { AssetPriority } from '@opensky/shared/assets'
import { PrismClass } from '@opensky/shared/constants'
import device from '@opensky/shared/device'
import { getDeckClassFromPrisms } from '@opensky/shared/helpers'
import { delayPromise } from '@opensky/shared/utils/async'
import { CardLibrary } from '@skyweaver/state-metadata'

import { getAssetsManager } from '~/assets'
import { getFakeRewards } from '~/debug/fakeRewards'
import { setHoveredCardAsync } from '~/helpers/cardPopupHelpers'
import {
  gameMode,
  isAuthenticatedGame,
  isBotGame,
  isOnlineGame,
  isReplayableGame,
  isReplayGame,
  LocalGameMode
} from '~/helpers/envGameModeHelpers'
import { showMatchEnd } from '~/helpers/matchEndHelpers'
import { getMusicPlayer } from '~/helpers/musicHelpers'
import { prismToPrismClass } from '~/helpers/prismHelper'
import { setupDone } from '~/helpers/setupHelper'
import { changeMusicToMatchEndSong, playSound } from '~/helpers/soundHelpers'
import { getTimeMarker } from '~/helpers/timeMarker'
import { tutorialEndPause } from '~/helpers/tutorialEndPause'
import { uiJump } from '~/helpers/uiJumpHelper'
import queryParams from '~/queryParams'
import { renderClouds, renderShadows } from '~/renderSettings'
import { matchInfoStore } from '~/state/stores/MatchInfoStore'
import WorkerProxyStore, { PlayerStatus } from '~/state/WorkerProxyStore'
import { hideCardSelection } from '~/systems/cardPositioning/ZoneSystem'
import { getTutorial } from '~/tutorial/Tutorial'
import { performanceWarning } from '~/userSettings'
import { kCombinations } from '~/utils/arrayUtils'
import { animationDelay, createResolvable } from '~/utils/asyncUtils'
import { NOOP, notEmpty } from '~/utils/jsUtils'
import { taskTimer, TimedTask } from '~/utils/taskTimer'

import {
  accountsLoaded,
  matchEnded,
  matchStarted,
  rewardsUpdated,
  store,
  storeHelper
} from '../../state'
import DialogContainer from './containers/dialog'
import ErrorDialogContainer from './containers/errorDialog'
import SplashContainer from './containers/splash'
import ErrorManager from './ErrorManager'
import { goBackToWebapp } from './helpers'
import { UI } from './index'
import { removeLoadingSpinner } from './removeLoadingSpinner'

if (import.meta.hot) {
  import.meta.hot.accept('./containers/dialog', () => {
    console.warn(
      'DialogContainer updated, not forcing a refresh via OpenSkyUI.ts'
    )
  })
}
if (import.meta.hot) {
  import.meta.hot.accept('./containers/splash', () => {
    console.warn(
      'SplashContainer updated, not forcing a refresh via OpenSkyUI.ts'
    )
  })
}
if (import.meta.hot) {
  import.meta.hot.accept('./containers/errorDialog', () => {
    console.warn(
      'ErrorDialogContainer updated, not forcing a refresh via OpenSkyUI.ts'
    )
  })
}
export class OpenSkyUI extends UI {
  gameReady = createResolvable()
  errorManager = new ErrorManager(this)
  showingMatchEnd = false
  lastStoreUpdate: Promise<void> = Promise.resolve()
  delayedButtonHighlight: TimedTask | undefined
  async onStoreUpdated(store: WorkerProxyStore) {
    const { playerStatus } = store
    this.lastStoreUpdate = this.lastStoreUpdate.then(async () => {
      await getAssetsManager().priorityPending(AssetPriority.Game)
      if (
        isOnlineGame &&
        playerStatus === PlayerStatus.DISCONNECTED_MID_MATCH
      ) {
        await this.errorManager.create(
          `Lost connection to the game server.
  Attempting to reconnect...\nAttempt #${store.reconnectAttempts}`
        )
      }
      if (
        this.errorManager.collection.size &&
        isOnlineGame &&
        playerStatus !== PlayerStatus.DISCONNECTED_MID_MATCH
      ) {
        // dismiss connection lost alert
        await this.errorManager.destroyAll()
      }

      if (playerStatus === PlayerStatus.ERROR) {
        await this.errorManager.destroyAll()
        const err = store.error!

        let errObj
        if (err.error instanceof Error) {
          errObj = err.error
        } else if (typeof err.error === 'object') {
          errObj = new Error(JSON.stringify(err.error))
        } else {
          errObj = new Error(err.error)
        }
        console.error(
          'UI: playerStatus is error, firing error dialog',
          errObj,
          { level: err.level, matchID: store.matchID }
        )

        const fireError = (msg: string, hasReload: boolean) =>
          ErrorDialogContainer.present(
            this,
            `${
              store.address === undefined ? '' : `Address: ${store.address}`
            }\n${
              store.matchID === undefined
                ? ''
                : `MatchID: ${store.matchID.toFixed()}\n`
            }${new Date().toISOString()}\n${msg.split('\\n').join('\n')}`,
            {
              label: 'Leave Game',
              onSelect: goBackToWebapp
            },
            hasReload
              ? {
                  label: 'Reload Game',
                  onSelect: () => {
                    window.location.reload()
                  }
                }
              : undefined
          )
        if (err.level === 'server') {
          await fireError(errObj.message, false)
        } else {
          await fireError(errObj.message, true)
        }
      }
      if (!performanceWarning.value && device.performance === 'low') {
        // Check again in 5 seconds to see if performance improved
        setTimeout(() => {
          if (!performanceWarning.value && device.performance === 'low') {
            performanceWarning.value = true
            DialogContainer.present(
              this,
              'You are experiencing poor performance. Try lowering graphic quality.',
              {
                label: 'AUTO ADJUST',
                onSelect: () => {
                  renderClouds.value = false
                  renderShadows.value = false
                  // downsamplePixels.value -= 1
                }
              },
              {
                label: 'DISMISS',
                onSelect: NOOP
              }
            )
          }
        }, 5000)
      }
    })
    await this.lastStoreUpdate
  }

  async onStateChange(store: WorkerProxyStore) {
    this.lastStoreUpdate = this.lastStoreUpdate.then(async () => {
      if (store.state) {
        const isReady = store.state.state.players.every(
          player => player.doneCardSelection
        )
        if (isReady) {
          matchInfoStore.cardSelectionsDone = true
        }

        const gameContainer = this.getContainer('game')
        const endTurnButtonContainer = this.getContainer('endTurnButton')
        const skyTagsContainer = this.getContainer('skyTags')

        await Promise.all([
          setupDone,
          gameContainer.ready,
          endTurnButtonContainer.ready,
          skyTagsContainer.ready
        ])

        if (isReady) {
          if (
            !store.isGameOver &&
            !endTurnButtonContainer.active &&
            !isReplayGame
          ) {
            endTurnButtonContainer.fadeIn()
          }
          if (!gameContainer.active) {
            gameContainer.show()
          }
          if (skyTagsContainer.opacityController.value === 0) {
            skyTagsContainer.setManaVialAndHandCounterVisibility(true)
          }
        }

        for (const player of [0, 1]) {
          const info =
            player === store.player!
              ? matchInfoStore.playerInfo
              : matchInfoStore.opponentInfo

          info.cardsInDeck = store.state.playerCards[player].deck
          info.cardsInGraveyard =
            store.state.playerCards[player].graveyard.length
          info.manaCrystals = store.state.state.players[player].maxMana
          info.mana = store.state.state.players[player].mana
          info.heroHitThisTurn =
            store.state.state.players[player].thisTurnStats.heroWasDamaged
        }

        if (store.isGameOver) {
          setHoveredCardAsync(undefined)
          if (isReplayableGame) {
            this.getContainer('settings').swapInReplayButton()
          } else if (
            gameMode !== LocalGameMode.REPLAY &&
            gameMode !== GameMode.TUTORIAL &&
            gameMode !== LocalGameMode.SPECTATE
          ) {
            this.getContainer('settings').concedeButton.disabled = true
          }
        }
      }
    })

    await this.lastStoreUpdate
  }

  setEndTurnButtonEnabled(enabled: boolean) {
    if (isReplayGame) {
      return
    }
    const button = this.getContainer('endTurnButton').endTurnButton

    if (button) {
      button.disabled = !enabled
    }
  }

  setEndTurnButtonHighlighted(enabled: boolean) {
    const button = this.getContainer('endTurnButton').endTurnButton
    if (this.delayedButtonHighlight) {
      taskTimer.cancel(this.delayedButtonHighlight)
    }
    if (button) {
      this.delayedButtonHighlight = taskTimer.add(
        () => {
          this.delayedButtonHighlight = undefined
          button.highlight = enabled
          if (enabled) {
            playSound('audioFxCommon', 'NoActionsLeft')
          }
        },
        enabled ? 2 : 0
      )
    }
  }

  async handleMatchEnd() {
    const winningPlayerID = await storeHelper.getWinner()

    if (
      winningPlayerID !== store.player &&
      gameMode === GameMode.TUTORIAL &&
      getTutorial().config?.allowTryAgainBeforeRewards
    ) {
      const tutFail = this.getContainer('tutorialChallengeFail')
      tutFail.ready.then(() => tutFail.fadeIn())
      return
    }

    if (!this.showingMatchEnd) {
      this.showingMatchEnd = true

      const matchEndType =
        winningPlayerID === undefined || winningPlayerID === store.player
          ? 'matchEndVictory'
          : 'matchEndDefeat'

      const musicType =
        matchEndType === 'matchEndVictory' ? 'musicVictory' : 'musicDefeat'

      await getAssetsManager().loadAsset(musicType, 1)

      if (this.hasContainer('cardSelection')) {
        const cs = this.getContainer('cardSelection')
        if (cs.initd) {
          cs.hide()
        }
      }

      changeMusicToMatchEndSong(musicType)

      if (gameMode === GameMode.TUTORIAL) {
        await tutorialEndPause
      }

      hideCardSelection()

      // Show Match end review stage
      if (uiJump('endReview')) {
        const matchEndReviewContainer = this.getContainer('matchEndReview')
        const matchEndContinueContainer = this.getContainer(
          'endMatchContinueButton'
        )

        await Promise.all([
          matchEndReviewContainer.ready,
          matchEndContinueContainer.ready
        ])

        await Promise.all([
          matchEndReviewContainer.fadeIn(),
          matchEndContinueContainer.fadeIn()
        ])

        await matchEndContinueContainer.continue
      }

      if (gameMode === LocalGameMode.SPECTATE) {
        window.location.reload()
      }
      if (this.hasContainer('cardSelectionDarkOverlay')) {
        this.getContainer('cardSelectionDarkOverlay').fadeOut()
      }
      const mightGetRewards = isAuthenticatedGame
      const fakeRewards = getFakeRewards(queryParams.fakeRewards)
      // Show Rewards
      await showMatchEnd(
        this,
        matchEndType,
        !mightGetRewards || fakeRewards ? matchEnded() : rewardsUpdated,
        () => {
          const rewards = fakeRewards || store.rewards! || []

          const cardRarity = [
            ...(store?.secret?.secret?.cardRarities?.entries() ?? [])
          ]

          const nftOwnedPrisms = cardRarity.reduce<Set<PrismClass>>(
            (set, curr) => {
              if (curr[1] === 'silver' || curr[1] === 'gold') {
                const card = CardLibrary.get(curr[0])
                if (!card) {
                  console.warn(
                    'Card in owned cards has no entry in card library: ',
                    curr[0]
                  )
                  return set
                }
                const prismClass = prismToPrismClass(card.prism)
                if (!prismClass) {
                  console.warn(
                    'Card in owned cards has prism',
                    card.prism,
                    'which has no corresponding prismClass.'
                  )
                  return set
                }
                set.add(prismClass)
              }
              return set
            },
            new Set()
          )
          const prisms = [...nftOwnedPrisms.values()]
          const skipTheseHeroUnlocks = [
            ...prisms.map(prism => [prism]),
            ...kCombinations(prisms, 2)
          ]
            .map(prismCombination => getDeckClassFromPrisms(prismCombination))
            .filter(notEmpty)

          return rewards.filter(
            r => !r.hero || !skipTheseHeroUnlocks.includes(r.hero.deckClass)
          )
        },
        store && storeHelper.getPlayerAccount()
      )
    }
  }

  protected async init() {
    const tm = getTimeMarker()
    const tm1 = tm.startTimeMark('start ui init')
    await super.init()
    tm1.complete()

    const preloadContainer = this.getContainer('preload')
    const tm2 = tm.startTimeMark('start preloadContainer.ready')
    await preloadContainer.ready
    tm2.complete()
    preloadContainer.fadeIn()
    if (queryParams.debugPreload) {
      await delayPromise(60000)
    }

    let splashContainer: SplashContainer | undefined
    const minDelay = animationDelay(1500)
    if (gameMode === GameMode.TUTORIAL && queryParams.lethalPuzzleURL) {
      splashContainer = this.getContainer('splash')
      await splashContainer.ready
      removeLoadingSpinner()
      splashContainer.fadeIn()
    }

    const tm3 = tm.startTimeMark('start accountsLoaded')
    await accountsLoaded
    tm3.complete()

    if (gameMode !== GameMode.TUTORIAL || !queryParams.lethalPuzzleURL) {
      removeLoadingSpinner()
    }

    if (
      gameMode === GameMode.TUTORIAL &&
      queryParams.lethalPuzzleURL &&
      !queryParams.skipTutorialTitle
    ) {
      const tutorialTitleContainer = this.getContainer('tutorialTitle')
      await tutorialTitleContainer.ready
      tutorialTitleContainer.tutorialTitle = getTutorial().config
        .title as TFuncKey
      tutorialTitleContainer.tutorialDescription = getTutorial().config
        .description as TFuncKey
      await minDelay
      await tutorialTitleContainer.fadeIn()
    }

    let vsScreen = false
    if (
      store.gameJoinMethod === 'first_join' &&
      !queryParams.skipVS &&
      gameMode !== LocalGameMode.SANDBOX
    ) {
      const vsContainer = this.getContainer('vs')
      vsScreen = true

      const tm4 = tm.startTimeMark('start vsContainer.ready')
      await vsContainer.ready
      tm4.complete()

      if (splashContainer) {
        splashContainer.fadeOut()
      }

      preloadContainer.fadeOut()
      vsContainer.fadeInHeros()

      const minimumTimeOnscreen = delayPromise(
        queryParams.holdUIDuration || gameMode === GameMode.TUTORIAL
          ? 5000
          : 3000
      ) // Wait on VS screen for minimum time

      const thingsThatDismissVS = [matchEnded()]
      if (isOnlineGame) {
        // the server won't fire match started until both players are loaded assets
        // so it's safe to close the VS screen here.
        thingsThatDismissVS.push(matchStarted)
      }
      const dismissPromises = Promise.race(thingsThatDismissVS)
      const weLoadedAndGameStateReady = Promise.all([
        vsContainer.myPlayerFinishedLoading,
        dismissPromises
      ])
      const tm1a = tm.startTimeMark('minimumTimeOnscreen')
      minimumTimeOnscreen.then(() => tm1a.complete())
      const tm1b = tm.startTimeMark('bothPlayersFinishedLoading')
      vsContainer.bothPlayersFinishedLoading.then(() => tm1b.complete())
      const tm1c = tm.startTimeMark('weLoadedAndGameStateReady')
      weLoadedAndGameStateReady.then(() => tm1c.complete())
      await Promise.all([
        minimumTimeOnscreen,
        Promise.race([
          vsContainer.bothPlayersFinishedLoading,
          weLoadedAndGameStateReady
        ])
      ])

      if (queryParams.debugVS) {
        return
      }
    } else {
      if (splashContainer) {
        await splashContainer.fadeOut()
      }
    }

    if (gameMode === LocalGameMode.REPLAY) {
      const replayContainer = this.getContainer('replay')
      await replayContainer.ready
      await replayContainer.fadeIn()
    }

    const tm4 = tm.startTimeMark('ui waiting for matchStarted')
    await matchStarted
    tm4.complete()

    getAssetsManager()
      .priorityPending(AssetPriority.PreGame)
      .then(() => {
        // Play Sound on Match start
        playSound('audioFxCommon', 'PlayerTurn')
        playSound('audioFxCommon', 'MatchStart')
      })

    getMusicPlayer().desiredSongName = 'musicGame'

    if (vsScreen) {
      const vsContainer = this.getContainer('vs')
      vsContainer.fadeOutHeros()
    }

    const hudContainer = this.getContainer('hud')
    const tm5 = tm.startTimeMark('hudContainer.ready')
    await hudContainer.ready
    tm5.complete()
    hudContainer.fadeIn()

    this.gameReady.resolve()

    if (isBotGame && queryParams.allowOfflineSpectating) {
      store.spectators = [
        { id: 1, address: 'dummy account', canSeeHand: false },
        { id: 2, address: 'dummy 2', canSeeHand: false },
        { id: 3, address: 'dummy 4 wow', canSeeHand: true },
        { id: 4, address: 'dummy 3', canSeeHand: true }
      ]
    }

    if (!isBotGame || queryParams.allowOfflineSpectating) {
      const spectators = this.getContainer('spectatorCount')
      spectators.ready.then(() => spectators.fadeIn())
    }

    if (queryParams.recordGameForQuestTest) {
      store.subscribeToQuestProgress(q =>
        this.getContainer('quests').ready.then(qc => qc.showQuestProgress(q))
      )
    } else {
      store.subscribeToQuestProgress(q => console.log('Quest Progress: ', q))
    }

    if (
      gameMode === LocalGameMode.SANDBOX ||
      gameMode === LocalGameMode.LOCAL_BOT
    ) {
      this.getContainer('cheats')
    }
  }
  async initSideBars() {
    const deckSidebarsContainer = this.getContainer('deckSidebars')
    await deckSidebarsContainer.ready
    deckSidebarsContainer.show()
    if (gameMode !== LocalGameMode.REPLAY) {
      const actionHistoryContainer = this.getContainer('actionHistory')
      await actionHistoryContainer.ready
      actionHistoryContainer.show()
    }
  }
}
