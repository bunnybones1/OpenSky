import { i18n } from '@opensky/language-manager'
import {
  Account,
  Reward,
  RewardCard,
  RewardExp,
  RewardType
} from '@opensky/proto'
import { delayPromise } from '@opensky/shared/utils/async'
import { ClampToEdgeWrapping, Color, Vector2 } from 'three'

import { getAssetsManager } from '~/assets'
import {
  COLOR_PRIZE_UPGRADE_CYAN,
  HEADING_GLOW_COLORS
} from '~/colors/colorLibrary'
import { Pin, ReadonlyPin, SizePin } from '~/helpers/LayoutHelpers'
import RectangleMaterial from '~/materials/RectangleMaterial'
import Object2D from '~/meshes/Object2D'
import RectangleMesh from '~/meshes/RectangleMesh'
import queryParams from '~/queryParams'
import { storeHelper } from '~/state'
import { simpleTweener } from '~/systems/animation/tweeners'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import AnimatedNumber from '~/utils/AnimatedNumber'
import { animationDelay } from '~/utils/asyncUtils'
import { safelyResetFlipY } from '~/utils/textureUtils'
import { SkipButton } from '~/utils/ui'

import XPBar from '../components/XPBar'
import { UI } from '../index'
import { RewardScreenContainer } from './rewardScreen'

const __rowWidth = 588
const __rowHeight = 54
const darkPurple = new Color(0x2a2251)

enum RowType {
  XP,
  Card
}
const INIT_HEIGHT = 200
export default class RewardXPContainer extends RewardScreenContainer {
  bar: XPBar
  heightPaddingRows = new AnimatedNumber(
    v => {
      this.comboBlockContainer.matrix.size.y.offset =
        INIT_HEIGHT + v * __rowHeight
    },
    0,
    250
  )
  rowCount: number = 0
  headingContainer: Object2D
  comboBlockContainer: Object2D
  mainContainer: Object2D
  xpRewards: RewardExp[]
  cardRewards: RewardCard[]
  account: Account

  constructor(ui: UI, priority: number) {
    super(ui, 'reward-xp', priority)
  }
  update(dt: number) {
    super.update(dt)

    const outer = this.mainContainer.matrixWorld.clipSpaceSizeY
    const inner = this.comboBlockContainer.matrixWorld.clipSpaceSizeY
    const s = this.mainContainer.matrix.prescale.y
    const s2 = Math.min(1, (s * outer) / inner)
    this.mainContainer.matrix.prescale = new Vector2(s2, s2)
  }
  async prepare(rewards: Reward[], account: Account) {
    this.account = account
    this.xpRewards = rewards
      .filter(reward => reward.type === RewardType.EXP)
      .map(reward => reward.exp!)
    this.cardRewards = rewards
      .filter(reward => reward.type === RewardType.CARD)
      .map(reward => reward.card!)
    this.heightPaddingRows.value = storeHelper.getPlayerConceded()
      ? 1
      : this.xpRewards.length + (this.cardRewards.length > 0 ? 1 : 0)
    await animationDelay(0)
  }
  async present(onSkipButton: SkipButton) {
    const regularAnimation = (async () => {
      if (this.xpRewards.length) {
        let initXP = this.xpRewards[0].beforeMatchExp
        for (let i = 0; i < this.xpRewards.length; i++) {
          const reward = this.xpRewards[i]
          const finalXP = initXP + reward.amount

          this.addRow(
            RowType.XP,
            i18n.t(`ui.rewardRank.xpReason.${reward.reason}`, {
              extraData: `${reward.reasonExtraData}`
            }),
            i18n.t(`ui.rewardRank.progress.xp`, {
              amount: `+${reward.amount}`
            }),
            undefined
          )
          await this.bar.perform(reward.requiredExp, initXP, finalXP)
          await delayPromise(500)

          initXP = finalXP
        }

        if (this.cardRewards.length) {
          await this.addRow(
            RowType.Card,
            i18n.t(`ui.rewardRank.levelUp`),
            i18n.t('ui.rewardCard.baseCard', {
              count: this.cardRewards.length
            })
          )
        }
      } else if (storeHelper.getPlayerConceded()) {
        const concedeGlow = getAssetsManager().fetchMeshDeepClone(
          'uiSmall',
          'glow-lines'
        )

        concedeGlow.matrix.setConstraints(
          Pin.fromPixels(640, 100),
          ReadonlyPin.Center,
          ReadonlyPin.Center
        )
        this.headingContainer.add(concedeGlow)
        concedeGlow.layers = this.headingContainer.layers

        const concedeText = new UITextMesh(i18n.t('ui.rewardRank.conceded'), {
          ...textOptions.rankResultText,
          color: new Color(0xffffff),
          size: 48,
          align: 'center'
        })
        concedeText.matrix.setConstraintsPosition(
          ReadonlyPin.Center.cloneOffset(0, -4)
        )
        concedeText.layers = this.headingContainer.layers
        this.headingContainer.add(concedeText)

        concedeGlow.matrix.opacity = 0
        simpleTweener.to({
          description: 'show concedeGlow',
          target: concedeGlow.material,
          propertyGoals: {
            opacity: 1
          },
          duration: 500
        })
        concedeText.opacity = 0
        simpleTweener.to({
          description: 'show concedeText',
          target: concedeText,
          propertyGoals: {
            opacity: 1
          },
          duration: 500
        })

        await this.addRow(
          RowType.XP,
          i18n.t('ui.rewardRank.concededTooEarly'),
          i18n.t('ui.rewardRank.progress.xp', { amount: '+0' }),
          false
        )
      }
      await delayPromise(queryParams.holdUIDuration || 4000)
    })()
    await Promise.race([regularAnimation, onSkipButton.onSkip])
  }

  async addRow(
    type: RowType,
    description: string,
    value: string,
    useIcon: boolean = true
  ) {
    const row = new Object2D()
    row.matrix.setConstraints(
      Pin.fromPixels(__rowWidth, __rowHeight),
      ReadonlyPin.Top,
      ReadonlyPin.Top.cloneOffset(0, this.rowCount * __rowHeight + INIT_HEIGHT)
    )
    this.rowCount++
    const descriptionText = new UITextMesh(description.toUpperCase(), {
      ...textOptions.rankResultText,
      color: new Color(0xc5b4f5),
      size: 20,
      align: 'left'
    })

    descriptionText.matrix.setConstraintsPosition(ReadonlyPin.Left)

    const xpText = new UITextMesh(value.toUpperCase(), {
      ...textOptions.rankResultText,
      color: COLOR_PRIZE_UPGRADE_CYAN,
      size: 20,
      align: 'right'
    })
    xpText.matrix.setConstraintsPosition(
      ReadonlyPin.Right.cloneOffset(type === RowType.Card ? -40 : -20, 0)
    )

    const icon = (await (async () => {
      if (type === RowType.Card) {
        return await getAssetsManager()
          .load('texture', `game/prize-icons/cards-base.png`)
          .then(iconTexture => {
            safelyResetFlipY(iconTexture)
            iconTexture.wrapS = ClampToEdgeWrapping
            iconTexture.wrapT = ClampToEdgeWrapping
            const icon = new RectangleMesh(
              new RectangleMaterial({
                map: iconTexture,
                forceTransparent: true
              })
            )
            icon.matrix.setConstraints(
              Pin.fromPixels(36, 36),
              ReadonlyPin.Right,
              ReadonlyPin.Right
            )
            return icon
          })
      } else if (type === RowType.XP) {
        const icon = getAssetsManager().fetchMeshDeepClone(
          'uiSmall',
          'ui-icon-arrow-up'
        )

        icon.matrix.setColor(COLOR_PRIZE_UPGRADE_CYAN)
        icon.matrix.setConstraints(
          Pin.fromPixels(18, 18),
          ReadonlyPin.Right,
          ReadonlyPin.Right.cloneOffset(10, 10),
          new Vector2(1.6, 1.1)
        )
        return icon
      }

      return
    })()) as RectangleMesh

    if (useIcon) {
      row.add(icon)
    }

    const divisor = getAssetsManager().fetchMeshDeepClone('uiSmall', 'line')
    divisor.matrix.setConstraints(
      new Pin(0.5, 0, 0, 1),
      ReadonlyPin.Bottom,
      ReadonlyPin.Bottom,
      new Vector2(10, 1)
    )
    divisor.matrix.setColor(darkPurple)

    row.add(descriptionText)
    row.add(xpText)
    row.add(divisor)
    this.comboBlockContainer.add(row)

    descriptionText.matrix.opacity = 0
    xpText.matrix.opacity = 0
    divisor.matrix.opacity = 0
    icon.matrix.opacity = 0
    await Promise.all([
      simpleTweener.to({
        description: 'show descriptionText',
        target: descriptionText.matrix,
        propertyGoals: { opacity: 1 },
        duration: 500
      }).finished,
      simpleTweener.to({
        description: 'show xpText',
        target: xpText.matrix,
        propertyGoals: { opacity: 1 },
        duration: 500
      }).finished,
      simpleTweener.to({
        description: 'show divisor',
        target: divisor.matrix,
        propertyGoals: { opacity: 1 },
        duration: 500
      }).finished,
      simpleTweener.to({
        description: 'show icon',
        target: icon.matrix,
        propertyGoals: { opacity: 1 },
        duration: 500
      }).finished
    ])
  }

  protected async init() {
    this.mainContainer = new Object2D()
    this.mainContainer.matrix.setConstraints(
      new Pin(1, 1, 0, -150),
      ReadonlyPin.Top.clone(),
      ReadonlyPin.Top.cloneOffset(0, 50)
    )
    this.add(this.mainContainer)
    this.headingContainer = new Object2D()
    this.headingContainer.matrix.setConstraints(
      Pin.fromPixels(640, 54),
      ReadonlyPin.Top,
      ReadonlyPin.Top
    )

    const headingGlow = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'glow-lines'
    )
    headingGlow.matrix.setColor(HEADING_GLOW_COLORS['victory'])
    headingGlow.matrix.setConstraints(
      new SizePin(1, 0.6, 9, 'y'),
      ReadonlyPin.Center,
      ReadonlyPin.Center
    )
    headingGlow.visible = false
    headingGlow.matrix.opacity = 1

    const headingText = new UITextMesh('', {
      ...textOptions.rankResultText,
      color: new Color(0xffffff),
      size: 48,
      align: 'center'
    })
    headingText.matrix.setConstraintsPosition(
      ReadonlyPin.Center.cloneOffset(0, -4)
    )
    this.headingContainer.add(headingGlow)
    this.headingContainer.add(headingText)

    const account = await storeHelper.getPlayerAccount()
    const xp = account.experience ?? 0
    const total = account.levelUpXP ?? 200
    const level = account.seasonLevel ?? 1
    this.bar = new XPBar(level, xp, total)
    this.bar.mesh.matrix.setConstraints(
      Pin.fromPixels(720, 84),
      ReadonlyPin.Top,
      ReadonlyPin.Top.cloneOffset(0, 100)
    )

    this.bar.onLevelUp(() => {
      headingGlow.visible = true
      this.headingContainer.matrix.opacity = 0
      simpleTweener.to({
        description: 'show level up glow',
        target: this.headingContainer.matrix,
        propertyGoals: {
          opacity: 1
        },
        duration: 500
      })

      headingText.text = i18n.t('ui.rewardRank.levelUp')
      // headingText.opacity = 0
      simpleTweener.to({
        description: 'show level up text',
        target: headingText,
        propertyGoals: {
          opacity: 1
        },
        duration: 500
      })
    })

    this.comboBlockContainer = new Object2D()
    this.comboBlockContainer.add(this.bar.mesh)
    this.comboBlockContainer.add(this.headingContainer)
    this.mainContainer.add(this.comboBlockContainer)
    this.comboBlockContainer.matrix.setConstraints(
      new Pin(0.8, 0, 0, 2),
      ReadonlyPin.Center,
      ReadonlyPin.Center
    )
  }
}
