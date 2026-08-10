import { i18n } from '@opensky/language-manager'
import {
  Account,
  DeckClass,
  Hero,
  Reward,
  RewardDeck,
  RewardHero,
  RewardType
} from '@opensky/proto'
import { BASE_HERO_SKINS } from '@opensky/shared/constants'
import { delayPromise } from '@opensky/shared/utils/async'
import { Entity } from 'gg'
import { Vector3 } from 'three'

import { createHeroCardInteractives } from '~/assemblages/HeroCardAssemblage'
import StarterDeckAssemblage from '~/assemblages/StarterDeckAssemblage'
import { getAssetsManager } from '~/assets'
import { Components } from '~/components'
import FloatationComponent from '~/components/FloatationComponent'
import { REWARD_FLOTATION_SPEED } from '~/constants'
import { createHeroCard } from '~/factories/HeroCardFactory'
import { Pin } from '~/helpers/LayoutHelpers'
import { playSound } from '~/helpers/soundHelpers'
import { createWorldEntity } from '~/helpers/worldHelpers'
import { matchEnded } from '~/state'
import CardRewardSystem from '~/systems/cardPositioning/CardRewardSystem'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import { animationDelay } from '~/utils/asyncUtils'
import { updateInteractivesForHeroCard } from '~/utils/helpers/HeroCardInteractivesHelpers'
import { SkipButton } from '~/utils/ui'
import { world } from '~/world'

import { UI } from '..'
import { RewardScreenContainer } from './rewardScreen'

export default class RewardHeroContainer extends RewardScreenContainer {
  headingTextTop: UITextMesh
  headingTextBottom: UITextMesh
  deckRewards: RewardDeck[]
  heroRewards: RewardHero[]
  private heroes: Array<Entity<Components>> = []

  constructor(ui: UI, priority: number) {
    super(ui, 'reward-hero', priority)
  }
  async prepare(rewards: Reward[], _account: Account) {
    this.heroRewards = rewards
      .filter(reward => reward.type === RewardType.HERO)
      .map(reward => reward.hero!)
    this.deckRewards = rewards
      .filter(reward => reward.type === RewardType.DECK)
      .map(reward => reward.deck!)
    await animationDelay(0)
  }

  async present(onSkipButton: SkipButton) {
    if (this.deckRewards.length) {
      this.headingTextTop.text = i18n.t('ui.rewardHero.heroAndStarterUnlock')
    } else if (rewardsContainDualPrisms(this.heroRewards)) {
      this.headingTextTop.text = i18n.t('ui.rewardHero.dualPrismUnlock')
      this.headingTextBottom.text = rewardsContainDualPrisms(this.heroRewards)
        ? i18n.t('ui.rewardHero.dualPrismBuildTip')
        : ''
    } else {
      i18n.t('ui.rewardHero.heroUnlock')
    }
    const regularAnimation = (async () => {
      if (this.heroRewards.length >= 3) {
        this.heroRewards = [
          { hero: Hero.SITTI, deckClass: DeckClass.HRI },
          { hero: Hero.FOX, deckClass: DeckClass.STA },
          { hero: Hero.MIRA, deckClass: DeckClass.STI }
        ]
      }
      for (const reward of [...this.heroRewards, ...this.deckRewards]) {
        let card = undefined
        if ('hero' in reward) {
          const hero = BASE_HERO_SKINS[reward.hero]
          card = createHeroCard(hero)
          updateInteractivesForHeroCard(card, createHeroCardInteractives)
        } else {
          card = createWorldEntity(StarterDeckAssemblage(reward.deckClass))
        }
        if (card) {
          card.add(
            new FloatationComponent(
              new Vector3(0, 0.005, 0),
              REWARD_FLOTATION_SPEED,
              -0.2
            )
          )
          world.getSystem(CardRewardSystem).enable()
          this.heroes.push(card)

          card.get('zone').setUserZone('DisabledReward')
          await animationDelay(100)
          if (this.heroRewards.length < 3) {
            // This case is for either 1 hero unlocked, or 1 hero + 1 starter deck.
            // In our new constructed flow, I think the latter is always the case.
            card.get('zone').setUserZone('HeroReward')
          } else {
            // This case happens when we get Dual prisms unlocekd, since they get 10 hero rewards at once
            card.get('zone').setUserZone('DualPrismHeroReward')
          }

          playSound('audioFxMatchEnd', 'CardUnlock')
        }
      }
      await delayPromise(30000)
    })()
    await Promise.race([regularAnimation, onSkipButton.onSkip])

    for (const h of this.heroes) {
      h.get('zone').setUserZone('DisabledReward')
      animationDelay(1000).then(() => {
        world.removeEntity(h.id)
      })
    }
  }

  protected async init() {
    await getAssetsManager().loadAsset('starterDeckFrame')

    const textTop = i18n.t('ui.rewardHero.heroUnlock')
    const textBottom = ''
    const headingTextTop = new UITextMesh(textTop, {
      ...textOptions.buttonText,
      color: 0xc3b7f2,
      size: 36,
      vAlign: 'top'
    })
    const headingTextBottom = new UITextMesh(textBottom, {
      ...textOptions.buttonText,
      color: 0xc3b7f2,
      size: 22,
      vAlign: 'top'
    })

    this.add(headingTextTop)
    this.add(headingTextBottom)
    headingTextTop.matrix.setConstraintsPosition(new Pin(0.5, 0.05))
    headingTextBottom.matrix.setConstraintsPosition(new Pin(0.5, 0.05, 0, 45))
    this.headingTextTop = headingTextTop
    this.headingTextBottom = headingTextBottom
    await matchEnded()
  }
}
function rewardsContainDualPrisms(rewards: RewardHero[]) {
  const SINGLE_PRISMS = ['STR', 'AGY', 'INT', 'WIS', 'HRT'] as DeckClass[]
  for (const r of rewards) {
    if (!SINGLE_PRISMS.includes(r.deckClass)) {
      return true
    }
  }
  return false
}
