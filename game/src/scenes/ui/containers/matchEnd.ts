import { i18n } from '@opensky/language-manager'
import { Account, Reward, RewardType } from '@opensky/proto'

import { getAssetsManager } from '~/assets'
import ShadowComponent from '~/components/ShadowComponent'
import { BUTTON_HEIGHT, BUTTON_MARGINS } from '~/constants'
import { getDeck } from '~/factories/DeckFactory'
import CarvedWall from '~/helpers/CarvedWall'
import { nonRewardCards } from '~/helpers/compoundCollections'
import {
  gameMode,
  isConquestGame,
  LocalGameMode
} from '~/helpers/envGameModeHelpers'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import { hideMatchResolutionPlaque } from '~/helpers/MatchResolutionPlaque'
import { shouldShowTutorialContinueButton } from '~/helpers/tutorialContinueHelper'
import { MatchEndType } from '~/helpers/typeHelpers'
import queryParams from '~/queryParams'
import * as arena from '~/scenes/arena'
import { scene } from '~/scenes/arena/scene'
import { matchEnded, storeHelper } from '~/state/index'
import CardFocusInspectionSystem from '~/systems/CardFocusInspectionSystem'
import { hideHandAndCardSelection } from '~/systems/cardPositioning/ZoneSystem'
import { animationDelay } from '~/utils/asyncUtils'
import { cameraShaker } from '~/utils/cameraShaker'
import { globalAccess } from '~/utils/globalAccess'
import { findObject3DByName } from '~/utils/threeUtils'
import {
  createButton,
  createButtonIcon,
  createSkipButton,
  SkipButton
} from '~/utils/ui'
import { world } from '~/world'

import { UI } from '..'
import UIContainer from '../components/UIContainer'
import { continueHandler } from '../helpers'
import { UIContainerTypes } from '.'
import { RewardScreenContainer } from './rewardScreen'

type RewardScreenContainerNames = keyof {
  [K in keyof UIContainerTypes as UIContainerTypes[K] extends RewardScreenContainer
    ? K
    : never]: UIContainerTypes[K]
}

export class MatchEndContainer extends UIContainer {
  private _carvedWall: CarvedWall
  private _queue: Array<RewardScreenContainerNames> = []
  skipButton: SkipButton

  constructor(
    ui: UI,
    priority: number,
    private _endType: MatchEndType
  ) {
    super(ui, 'match-end', {
      priority
    })
  }

  async fadeIn(duration = 1500) {
    this.active = true
    hideHandAndCardSelection()
    hideMatchResolutionPlaque()
    await this._carvedWall.animateIn(duration, 200).finished
    const buttonHeight = BUTTON_HEIGHT
    const buttonWidth = BUTTON_HEIGHT * 1.2
    const marginX = BUTTON_MARGINS
    const marginY = BUTTON_MARGINS
    const buttonSettings = createButton(
      this,
      async () => {
        const settingsContainer = this.ui.getContainer('settings')
        await settingsContainer.ready
        settingsContainer.fadeIn()
      },
      Pin.fromPixels(buttonWidth, buttonHeight),
      ReadonlyPin.TopRight,
      ReadonlyPin.TopRight.cloneOffset(-marginX, marginY)
    )
    createButtonIcon(buttonSettings.mesh, 'ui-icon-settings')
    if (isConquestGame) {
      const cccc = this.ui.getContainer('conquestConclusionCover')
      cccc.ready.then(c => c.fadeIn())
      hideArena()
    } else {
      await animationDelay(1500).then(() => {
        hideArena()
      })
    }
    super.fadeIn()
  }

  async present(account: Account, rewards: Reward[]) {
    const openWallToStarsAtNight = async () => {
      if (this.ui.hasContainer('conquestConclusionCover')) {
        const cccc = this.ui.getContainer('conquestConclusionCover')
        cccc.hide()
      }
      const sanc = this.ui.getContainer('starsAtNightCover')
      await sanc.ready
      sanc.show()
      hideArena()

      await this._carvedWall.animateOut(1000)
      const fireworksContainer = this.ui.getContainer('fireworks')
      await fireworksContainer.ready
      fireworksContainer.fadeIn()
    }
    if (world.hasSystem(CardFocusInspectionSystem)) {
      world.getSystem(CardFocusInspectionSystem).active = false
    }

    if (this.ui.hasContainer('endMatchContinueButton')) {
      const button = this.ui.getContainer('endMatchContinueButton')
      button.fadeOut()
    }
    if (this.ui.hasContainer('skyTags')) {
      const skytags = this.ui.getContainer('skyTags')
      skytags.fadeOut()
    }

    if (rewards.length || storeHelper.getPlayerConceded() || isConquestGame) {
      const xpRewards = rewards
        .filter(reward => reward.type === RewardType.EXP)
        .map(reward => reward.exp!)
      const rankRewards = rewards
        .filter(reward => reward.type === RewardType.RANK)
        .map(reward => reward.rank!)

      const allCardRewards = rewards
        .filter(reward => reward.type === RewardType.CARD)
        .map(reward => reward.card!)
      const heroRewards = rewards
        .filter(reward => reward.type === RewardType.HERO)
        .map(reward => reward.hero!)
      const deckRewards = rewards
        .filter(reward => reward.type === RewardType.DECK)
        .map(reward => reward.deck!)
      const heroSkinRewards = rewards
        .filter(reward => reward.type === RewardType.HERO_SKIN)
        .map(reward => reward.heroSkin!)
      const conquestPointsRewards = rewards
        .filter(reward => reward.type === RewardType.CONQUEST_POINTS)
        .map(reward => reward.conquestV2TreasureProgress!)

      if (!isConquestGame && queryParams.fakeConquest === -1) {
        if (rankRewards.length > 0) {
          this._queue.push('rewardRank')
        }
      } else {
        if (conquestPointsRewards.length) {
          this._queue.push('rewardConquestPoints')
        }
        this._queue.push('conquestSummary')
        if (this._endType !== 'tie') {
          if (allCardRewards.length) {
            this._queue.push('conquestRewardCard')
          }
        }
      }

      if (heroSkinRewards.length) {
        this._queue.push('rewardHero')
      }
      if (
        storeHelper.getPlayerConceded() ||
        (xpRewards.length && xpRewards.some(x => x.amount !== 0))
      ) {
        this._queue.push('rewardXp')
      }
      if (!isConquestGame && allCardRewards.length) {
        this._queue.push('rewardCard')
      }
      if (heroRewards.length || deckRewards.length) {
        this._queue.push('rewardHero')
      }

      this._queue.reverse()
      if (isConquestGame || queryParams.fakeConquest !== -1) {
        await getAssetsManager().loadAsset('gameHolographicGlow')
        const cccc = this.ui.getContainer('conquestConclusionCover') // 'stars-at-night-bg'
        await cccc.ready
        cccc.fadeIn()
        hideArena()

        this._carvedWall.animateOut(1000)
      } else {
        this._carvedWall.animateIn(1000)
        await animationDelay(1500).then(() => {
          hideArena()
        })
      }
      while (this._queue.length) {
        const screen = this._queue.pop()!
        const activeRewardScreen = this.ui.getContainer(screen)
        await activeRewardScreen.ready
        const isLastReward = this._queue.length === 0
        const shouldShowTutButton =
          isLastReward && (await shouldShowTutorialContinueButton())
        const playerLost = (await storeHelper.getMatchEndType()) === 'defeat'
        this.skipButton = createSkipButton(
          this,
          undefined,
          shouldShowTutButton,
          shouldShowTutButton
            ? playerLost
              ? i18n.t('ui.endTurnButton.retryTutorial')
              : i18n.t('ui.endTurnButton.playNextTutorial')
            : i18n.t('ui.endTurnButton.continue')
        )
        if (screen === 'rewardCard' || screen === 'conquestRewardCard') {
          this.skipButton.button.mesh.visible = false
        }

        await activeRewardScreen.prepare(rewards, account)
        await activeRewardScreen.fadeIn()
        if (screen === 'rewardCard') {
          openWallToStarsAtNight()
        }
        await activeRewardScreen.present(this.skipButton)
        if (screen === 'conquestRewardCard') {
          this._carvedWall.animateIn(1000)
          await animationDelay(1500).then(() => {
            const crcc = this.ui.getContainer('conquestRewardCard')
            if (crcc.newPotentialOrRealRewardCards!) {
              for (const card of crcc.newPotentialOrRealRewardCards!) {
                world.removeEntity(card.id)
              }
            }
            const cccc = this.ui.getContainer('conquestConclusionCover')
            cccc.ready.then(cccc => {
              cccc.fadeOut(100)
            })
          })
        }
        await activeRewardScreen.fadeOut()
      }

      if (!(await shouldShowTutorialContinueButton())) {
        continueHandler()
      }
    } else {
      const shouldShowTutButton = await shouldShowTutorialContinueButton()
      const playerLost = (await storeHelper.getMatchEndType()) === 'defeat'
      this.skipButton = createSkipButton(
        this,
        undefined,
        shouldShowTutButton,
        shouldShowTutButton
          ? playerLost
            ? i18n.t('ui.endTurnButton.retryTutorial')
            : i18n.t('ui.endTurnButton.playNextTutorial')
          : i18n.t('ui.endTurnButton.continue')
      )
      // rewards is empty, not enough info to display rewardRank
      if (rewards.length) {
        const rewardRankContainer = this.ui.getContainer('rewardRank')
        await rewardRankContainer.ready
        await rewardRankContainer.prepare(rewards, account)
        await rewardRankContainer.fadeIn()
        await rewardRankContainer.present(this.skipButton)
        await rewardRankContainer.fadeOut()
      }
      if (!shouldShowTutButton) {
        continueHandler()
      }
    }
  }

  protected async init() {
    if (gameMode !== LocalGameMode.LOCAL_BOT) {
      await matchEnded()
    }

    const carvedWall = new CarvedWall(cameraShaker)
    const mesh = await carvedWall.mesh
    scene.add(mesh)
    this._carvedWall = carvedWall

    if (isConquestGame) {
      await getAssetsManager().loadAsset('gameHolographicGlow')
    }

    await getAssetsManager().loadAsset('audioFxMatchEnd')
    if (isConquestGame) {
      const cccc = this.ui.getContainer('conquestConclusionCover')
      await cccc.ready
    }
  }
}
function hideArena() {
  const artBucket = findObject3DByName(scene, 'art-bucket')
  artBucket.visible = false
  globalAccess.sky!.visible = false
  arena.clouds.visible = false
  for (const e of nonRewardCards.items) {
    if (e.has('transform')) {
      e.get('transform')!.visible = false
    }
  }
  nonRewardCards.listenForAdd(e => {
    if (e.has('transform')) {
      e.get('transform').visible = false
    }
  })
  nonRewardCards.listenForRemove(e => {
    if (e.has('transform')) {
      e.get('transform').visible = true
    }
  })
  const tut =
    globalAccess.ui!.hasContainer('tutorial') &&
    globalAccess.ui!.getContainer('tutorial')
  if (tut && tut.helperCube) {
    tut.helperCube.hideHelperCube()
  }
  const playerDeckEntity = getDeck('Deck', 'Player').entity
  const opponentDeckEntity = getDeck('Deck', 'Opponent').entity
  playerDeckEntity.remove('collidable')
  opponentDeckEntity.remove('collidable')
  while (ShadowComponent.entities.length > 0) {
    ShadowComponent.entities.items[0].remove('shadow')
  }
}
