import { i18n } from '@opensky/language-manager'
import { Reward, RewardType } from '@opensky/proto'
import { groupSizes } from '@opensky/shared/utils/math'
import { Prism } from '@skyweaver/state-metadata'

import { makeCardEntitiesFromSimpleRewards } from '~/helpers/cardHelpers'
import { Pin } from '~/helpers/LayoutHelpers'
import {
  rewardCardToSimpleRewardCard,
  SimpleRewardCard
} from '~/helpers/typeHelpers'
import Mesh2D from '~/meshes/Mesh2D'
import queryParams from '~/queryParams'
import { matchEnded, storeHelper } from '~/state/index'
import CardRewardSystem from '~/systems/cardPositioning/CardRewardSystem'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import { toggleForceDayTime } from '~/userSettings'
import { animationDelay } from '~/utils/asyncUtils'
import { waitForNextFrame } from '~/utils/onNextFrame'
import { removeFromParent } from '~/utils/threeUtils'
import { createSkipButton, SkipButton } from '~/utils/ui'
import { world } from '~/world'

import { UI } from '..'
import PinnedButton from '../components/PinnedButton'
import { RewardScreenContainer } from './rewardScreen'

export default class RewardCardContainer extends RewardScreenContainer {
  headingText: UITextMesh
  rewards: SimpleRewardCard[]
  prisms: Mesh2D[]
  skipButton?: SkipButton
  continueButton?: PinnedButton
  label: string

  constructor(ui: UI, priority: number) {
    super(ui, 'reward-card', priority)
  }

  async prepare(rewards: Reward[]) {
    const allCardRewards = rewards
      .filter(reward => reward.type === RewardType.CARD)
      .map(reward => reward.card!)

    this.rewards = allCardRewards
      .map(rewardCardToSimpleRewardCard)
      .filter(c => c.rarity === 'base')
    this.label = i18n.t('ui.rewardCard.youUnlockedCards', {
      count: this.rewards.length
    })
    await animationDelay(0)
  }

  async present(onSkipButton: SkipButton) {
    onSkipButton.button.mesh.visible = false
    const chunks = groupSizes(queryParams.rewardsPerPage, this.rewards.length)
    const rewardChunks = chunks.map(num => this.rewards.splice(0, num))
    for (const chunk of rewardChunks) {
      const basicRewardCards = makeCardEntitiesFromSimpleRewards(
        chunk,
        'DisabledReward'
      )
      await waitForNextFrame()
      for (const reward of basicRewardCards) {
        await animationDelay(100)
        reward.get('zone').setUserZone('Reward')
      }
      const isLastChunk = chunk === rewardChunks[rewardChunks.length - 1]

      const noLongerInterested = new Promise<void>(resolve => {
        this.skipButton = createSkipButton(this, () => {
          world.getSystem(CardRewardSystem).flipAll()
          resolve()
        })
      })
      const prisms = (await storeHelper.getPlayerState()).prisms
      if (
        this.rewards.length > 1 &&
        (prisms.length > 1 || !rewardsMatchHeroPrisms(this.rewards, prisms))
      ) {
        this.label = i18n.t('ui.rewardCard.congratsYouUnlockedCard', {
          count: this.rewards.length
        })
      } else if (this.rewards.length > 1 && prisms.length === 1) {
        this.label = i18n.t(`ui.rewardCard.multiCardUnlock.${prisms[0]}`)
      } else if (
        this.rewards.length === 1 &&
        (prisms.length > 1 || !rewardsMatchHeroPrisms(this.rewards, prisms))
      ) {
        this.label = i18n.t('ui.rewardCard.congratsYouUnlockedACard')
      } else if (this.rewards.length === 1 && prisms.length === 1) {
        this.label = i18n.t(`ui.rewardCard.singleCardUnlock.${prisms[0]}`)
      }

      this.headingText.text = this.label
      toggleForceDayTime.value = true
      await Promise.all([
        world.getSystem(CardRewardSystem).allFlipped,
        noLongerInterested
      ])
      if (this.skipButton) {
        removeFromParent(this.skipButton.button.mesh)
      }

      if (!isLastChunk) {
        for (const reward of basicRewardCards) {
          const zone = reward.get('zone')
          zone.setUserZone('DisabledReward')
        }
      }
      await animationDelay(500)
    }
    onSkipButton.button.mesh.visible = true

    await onSkipButton.onSkip
  }

  update(dt: number) {
    super.update(dt)
  }

  protected async init() {
    await matchEnded()

    this.headingText = new UITextMesh('', {
      ...textOptions.buttonText,
      color: 0xc3b7f2,
      size: 36,
      vAlign: 'top'
    })

    this.add(this.headingText)
    this.headingText.matrix.setConstraintsPosition(new Pin(0.5, 0.05))
  }
  async fadeOut(duration = 800) {
    world.getSystem(CardRewardSystem).nukeAll()
    return super.fadeOut(duration)
  }
}
function getPrismFromID(id: number) {
  if (id <= 999) {
    return i18n.t(`cardMeta:prisms.str`)
  } else if (id <= 1999) {
    return i18n.t(`cardMeta:prisms.agy`)
  } else if (id <= 2999) {
    return i18n.t(`cardMeta:prisms.wis`)
  } else if (id <= 3999) {
    return i18n.t(`cardMeta:prisms.hrt`)
  } else if (id <= 4999) {
    return i18n.t(`cardMeta:prisms.int`)
  }
  return ''
}

function rewardsMatchHeroPrisms(rewards: SimpleRewardCard[], prisms: Prism[]) {
  const prismNames = prisms.map(p => i18n.t(`cardMeta:prisms.${p}`))
  for (const reward of rewards) {
    if (!prismNames.includes(getPrismFromID(parseInt(reward.id)))) {
      return false
    }
  }
  return true
}
