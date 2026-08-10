import { Account, Reward, RewardType } from '@opensky/proto'
import {
  getUrlFlag,
  getUrlInt,
  getUrlParam
} from '@opensky/shared/utils/location'
import { lerp } from '@opensky/shared/utils/math'
import { Entity } from 'gg'
import { Color, Mesh, Vector3 } from 'three'

import { getFrameStyleFromItem } from '~/components/FrameStyleComponent'
import { Components } from '~/components/index'
import PublicRarityComponent from '~/components/PublicRarityComponent'
import { ARENA_ANGLE } from '~/constants'
import { getBlendModeParamsByIndices } from '~/helpers/blendModeHelpers'
import { makeCardEntitiesFromSimpleRewards } from '~/helpers/cardHelpers'
import { getPrematchConquestProgress } from '~/helpers/conquestProgressHelpers'
import { Pin } from '~/helpers/LayoutHelpers'
import { getGoldenPortal, showGoldenPortal } from '~/helpers/matchEndVFX'
import { playSound, playSoundLoop, stopSoundLoop } from '~/helpers/soundHelpers'
import {
  MatchEndType,
  rewardCardToSimpleRewardCard,
  SimpleRewardCard
} from '~/helpers/typeHelpers'
import RGBAVertexColorMeshMaterial from '~/materials/RGBAVertexColorMeshMaterial/index'
import { getFlareGeometry } from '~/meshes/Particles/flareGeometryLibrary'
import { getBeamLauncher } from '~/meshes/Particles/particleLauncherFactory'
import { scene } from '~/scenes/arena/scene'
import { matchEnded, storeHelper } from '~/state'
import { Easing } from '~/systems/animation/Easing'
import { simpleTweener } from '~/systems/animation/tweeners'
import CardRewardSystem from '~/systems/cardPositioning/CardRewardSystem'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import { toggleForceDayTime } from '~/userSettings'
import { animationDelay } from '~/utils/asyncUtils'
import { cameraShaker } from '~/utils/cameraShaker'
import { waitForNextFrame } from '~/utils/onNextFrame'
import { removeFromParent } from '~/utils/threeUtils'
import { createSkipButton, SkipButton } from '~/utils/ui'
import { world } from '~/world'

import { UI } from '..'
import { RewardScreenContainer } from './rewardScreen'

export default class ConquestRewardCardContainer extends RewardScreenContainer {
  headingText: UITextMesh

  skipButton?: SkipButton
  label: string
  endType: MatchEndType
  newPotentialOrRealRewardCards: Entity<Components>[] | undefined
  conquestCardRewards: Reward[]
  conquestSimpleCardRewards: SimpleRewardCard[]

  constructor(ui: UI, priority: number) {
    super(ui, 'conquest-reward-card', priority)
  }

  async prepare(rewards: Reward[], _account: Account) {
    this.endType = await storeHelper.getMatchEndType()
    const allCardRewards = rewards
      .filter(reward => reward.type === RewardType.CARD)
      .map(reward => reward.card!)

    const allSimpleCardRewards = allCardRewards.map(
      rewardCardToSimpleRewardCard
    )
    this.conquestCardRewards = rewards.filter(
      reward =>
        reward.type === RewardType.CARD &&
        getFrameStyleFromItem(reward.card!.item?.itemType) !== 'base'
    )
    this.conquestSimpleCardRewards = allSimpleCardRewards.filter(
      card => card.rarity === 'silver' || card.rarity === 'gold'
    )

    const prematchConquestProgress = await getPrematchConquestProgress()
    if (this.endType !== 'tie') {
      if (
        prematchConquestProgress!.currentMatch > 0 ||
        this.endType === 'victory'
      ) {
        const oldPotentialRewards: SimpleRewardCard[] = []
        playSoundLoop('audioFxMatchEnd', 'HolographicHumContinuous')
        if (this.endType === 'victory') {
          for (let i = 0; i < prematchConquestProgress!.currentMatch; i++) {
            oldPotentialRewards.push({ id: '1', rarity: 'silver' })
          }
        }
        const oldPotentialRewardCards = makeCardEntitiesFromSimpleRewards(
          oldPotentialRewards,
          'ConquestPotentialReward',
          true
        )
        const newPotentialOrRealRewards: SimpleRewardCard[] = []
        this.label =
          getUrlParam('conquestRewardMessage1') ||
          `UPGRADING YOUR CONQUEST REWARD${
            this.conquestSimpleCardRewards.length > 1 ? 'S' : ''
          }!`

        if (oldPotentialRewardCards.length > 0) {
          await animationDelay(2000)
        }
        playSound('audioFxMatchEnd', 'HolographicCardAppear')
        if (this.conquestSimpleCardRewards.length > 0) {
          for (const r of this.conquestSimpleCardRewards) {
            newPotentialOrRealRewards.push(r)
          }
        } else {
          if (prematchConquestProgress!.currentMatch < 2) {
            for (let i = 0; i <= prematchConquestProgress!.currentMatch; i++) {
              newPotentialOrRealRewards.push({
                id: '1',
                rarity: 'silver'
              })
            }
          }
        }
        if (oldPotentialRewardCards.length > 0) {
          for (const reward of oldPotentialRewardCards) {
            reward.get('zone').setUserZone('DisabledReward')
          }
          await animationDelay(500)

          const flareMat = new RGBAVertexColorMeshMaterial(
            {
              screenspaceMode: true,
              blendMode: 'customAddAlpha',
              premultiplyAlpha: true,
              opacity: 0.7
            },
            {
              transparent: true,
              depthWrite: false,
              ...getBlendModeParamsByIndices(1, 1)
            }
          )
          const flareEnd = new Mesh(
            getFlareGeometry(
              'holographicUpgrade',
              new Color(2, 3, 4),
              new Color(-6, -5, -5)
            ),
            flareMat
          )
          flareEnd.renderOrder = -100000
          const flareScale = { val: 0 }
          flareEnd.scale.setScalar(0.001)
          simpleTweener.to({
            description: 'anim flareScale',
            target: flareScale,
            propertyGoals: { val: 1 },
            duration: 2000,
            onUpdate() {
              flareEnd.scale.setScalar(
                lerp(
                  0.001,
                  1,
                  Easing.Custom.Pulse(Easing.Quadratic.Out(flareScale.val))
                )
              )
            },
            onComplete() {
              removeFromParent(flareEnd)
            }
          })
          scene.add(flareEnd)
        }
        this.newPotentialOrRealRewardCards = makeCardEntitiesFromSimpleRewards(
          newPotentialOrRealRewards,
          'DisabledReward',
          true
        )
        await waitForNextFrame()
        for (const reward of this.newPotentialOrRealRewardCards) {
          reward.add(new PublicRarityComponent())
          reward.get('zone').setUserZone('ConquestReward')
        }
      }
    }
    if (this.conquestSimpleCardRewards.length === 0 && this.endType !== 'tie') {
      stopSoundLoop('audioFxMatchEnd', 'HolographicHumContinuous')
      await animationDelay(2500)

      if (this.newPotentialOrRealRewardCards) {
        for (const reward of this.newPotentialOrRealRewardCards) {
          world.removeEntity(reward.id)
        }
      }
    }
  }

  async present(onSkipButton: SkipButton) {
    toggleForceDayTime.value = true

    if (this.newPotentialOrRealRewardCards) {
      this.label =
        getUrlParam('conquestRewardMessage2') ||
        `CLAIM YOUR CONQUEST REWARD${
          this.conquestSimpleCardRewards.length > 1 ? 'S' : ''
        }!`
      this.headingText.text = this.label

      for (const card of this.newPotentialOrRealRewardCards!) {
        card.get('zone').setUserZone('ConquestReward')
      }
      const portalPos = new Vector3(0, -0.1, 0)
      getBeamLauncher('goldenPortalEmbers', scene).launch(portalPos, portalPos)
      showGoldenPortal(scene, 400)
      const goldenPortal = getGoldenPortal(scene)
      goldenPortal.pivot.scale.setScalar(8)
      goldenPortal.pivot.position.copy(portalPos)
      goldenPortal.pivot.rotateX(ARENA_ANGLE)
      goldenPortal.pivot.traverse(obj => (obj.renderOrder = -10000))
      goldenPortal.pivot.updateMatrix()

      playSound('audioFxMatchEnd', 'CardUpgrade')
      await animationDelay(2000)
      animationDelay(100).then(function boom() {
        cameraShaker.add(0.3)
      })
      for (const card of this.newPotentialOrRealRewardCards!) {
        card.remove('holographic')

        const p = card.get('transform').position
        getBeamLauncher('materializeCardFlash', scene).launch(
          p,
          new Vector3(0, 0.01, 0.01).add(p)
        )
      }
      stopSoundLoop('audioFxMatchEnd', 'HolographicHumContinuous')

      const rewardsDone = world.getSystem(CardRewardSystem).allFlipped
      world.getSystem(CardRewardSystem).enable()
      if (!getUrlFlag('autoFlipRewards')) {
        const autoFlipCards = createSkipButton(this, () => {
          world.getSystem(CardRewardSystem).flipAll()
        })
        world.getSystem(CardRewardSystem).allFlipped.then(() => {
          autoFlipCards.skip()
          removeFromParent(autoFlipCards.button.mesh)
        })
      } else {
        await animationDelay(2000)
        world.getSystem(CardRewardSystem).flipAll()
      }
      await rewardsDone
      await world.getSystem(CardRewardSystem).flipAll()
      await animationDelay(getUrlInt('rewardReviewDuration', 0, 0, 10000))

      await animationDelay(700)
    }
    onSkipButton.button.mesh.visible = true

    await animationDelay(1500)
    await Promise.race([animationDelay(4000), onSkipButton.onSkip])
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
}
