import { RewardConquestV2TreasureProgress } from '@opensky/proto'
import { Color, Vector2 } from 'three'

import { getAssetsManager } from '~/assets/index'
import {
  COLOR_CONQUEST_REWARDS_RED,
  COLOR_NERFED_TEXT,
  COLOR_WHITE
} from '~/colors/colorLibrary'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import Mesh2D from '~/meshes/Mesh2D'
import Object2D from '~/meshes/Object2D'
import { buttonText, rankResultText } from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import { AnimatedBool } from '~/utils/AnimatedBool'
import { animationDelay } from '~/utils/asyncUtils'
import { removeFromParent } from '~/utils/threeUtils'

import { ConquestRewardChest } from './conquestRewardChest'
import ProgressBarContinuous from './ProgressBarContinuous'
import ProgressBarSegmented from './ProgressBarSegmented'
import { CONTAINER_HEIGHT } from './RankBar'
import { BADGE_SIZE, GOAL_BADGE_SIZE, lightPurple } from './rankConstants'
import RewardsPanel, { CONTAINER_WIDTH } from './rewardsPanel'

const SEGMENT_CONTAINER_WIDTH = 440 //372
const SEGMENT_CONTAINER_OFFSET = (CONTAINER_WIDTH - SEGMENT_CONTAINER_WIDTH) / 2
const SEGMENT_HEIGHT = 14

const __glowColor = new Color(6, 6, 4)
const __glowColorGood = new Color(6, 6, 4)
const __glowColorBad = new Color(2, -1, -1)
type tempCPData = {
  treasureLevel: number
  treasurePoints: number
  treasurePointsRequired: number
}
type PointsBeforeChangeCallback = (
  pointsDelta: number,
  rankChange?: boolean
) => Promise<void>

class ConquestPointsProgress {
  currentPoints: number
  currentChestLevel: number
  nextChestLevel?: number
  pointsRequired: number
  start: number
  end: number
  rankAboutToChange: boolean = false

  constructor(data: tempCPData) {
    this.currentPoints = data.treasurePoints
    this.currentChestLevel = data.treasureLevel
    this.pointsRequired = data.treasurePoints + data.treasurePointsRequired

    if (this.currentChestLevel !== 10) {
      this.nextChestLevel = this.currentChestLevel + 1
    }
  }
}
function __getProgressFromConquestPointsData(
  reward: RewardConquestV2TreasureProgress
): ConquestPointsProgress[] {
  const beforePoints = new ConquestPointsProgress(reward.beforeMatch)
  const afterPoints = new ConquestPointsProgress(reward.afterMatch)

  if (beforePoints.currentChestLevel < afterPoints.currentChestLevel) {
    beforePoints.rankAboutToChange = true
    afterPoints.rankAboutToChange = false

    beforePoints.start = beforePoints.currentPoints
    beforePoints.end = beforePoints.currentPoints + beforePoints.pointsRequired
    afterPoints.start = 0
    afterPoints.end = afterPoints.currentPoints
    return [beforePoints, afterPoints]
  }
  beforePoints.start = beforePoints.currentPoints
  beforePoints.end = afterPoints.currentPoints
  return [beforePoints]
}

export default class ConquestPointsBar extends Object2D {
  private _rankPointsBeforeChangeCallbacks: Set<PointsBeforeChangeCallback> =
    new Set()

  private _progressQueue: ConquestPointsProgress[]
  private _progressBar: ProgressBarSegmented | ProgressBarContinuous
  private _progressBarSubContainer: Object2D
  private _isMaxLevel: boolean
  private _conquestPointsText: UITextMesh
  private _rankTitleText: UITextMesh

  private _rewardChestGoal: ConquestRewardChest
  private _rewardChest: ConquestRewardChest

  private _flashRankBarController: AnimatedBool
  private _flashWholeBarController: AnimatedBool
  private _performSignal: Promise<void>
  private _unblockPerformance: () => void
  private _performanceComplete: Promise<void>
  private _flashRankBar: Mesh2D
  private _flashWholeBar: Mesh2D

  constructor() {
    super()
    const panelContainer = new RewardsPanel()

    this.add(panelContainer)

    const progressBarContainer = new Object2D()
    panelContainer.add(progressBarContainer)

    const progressBarSubContainer = new Object2D()
    progressBarContainer.matrix.setConstraints(
      Pin.fromPixels(SEGMENT_CONTAINER_WIDTH, SEGMENT_HEIGHT),
      ReadonlyPin.Center,
      ReadonlyPin.Center.cloneOffset(2, 15)
    )
    progressBarContainer.add(progressBarSubContainer)

    const flashRankBar = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'rectangle-soft-round'
    )
    flashRankBar.matrix.prescale = new Vector2(10, 4)
    flashRankBar.matrix.opacity = 0
    progressBarContainer.add(flashRankBar)

    const flashWholeBar = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'rectangle-soft-round'
    )

    flashWholeBar.matrix.setConstraints(
      Pin.fromPixels(SEGMENT_CONTAINER_WIDTH, SEGMENT_HEIGHT + 20),
      ReadonlyPin.Center,
      ReadonlyPin.Center.cloneOffset(0, 4 - 10)
    )
    flashWholeBar.matrix.prescale = new Vector2(100, 20)
    flashWholeBar.matrix.opacity = 0

    const flashRankBarController = new AnimatedBool(
      v => {
        flashRankBar.matrix.opacity = v
        progressBarSubContainer.matrix.setColorRGB(
          v * __glowColor.r + 1,
          v * __glowColor.g + 1,
          v * __glowColor.b + 1
        )
      },
      false,
      200
    )
    const flashWholeBarController = new AnimatedBool(
      v => {
        flashWholeBar.matrix.opacity = v
        panelContainer.matrix.setColorRGB(
          v * __glowColor.r + 1,
          v * __glowColor.g + 1,
          v * __glowColor.b + 1
        )
      },
      false,
      200,
      undefined,
      600
    )

    const rankTitleText = new UITextMesh('CONQUEST TREASURE', {
      ...buttonText,
      size: 24,
      align: 'left'
    })
    panelContainer.add(rankTitleText)
    rankTitleText.matrix.setConstraintsPosition(
      ReadonlyPin.TopLeft.cloneOffset(SEGMENT_CONTAINER_OFFSET, 32)
    )

    const rankPointText = new UITextMesh(
      [
        { text: '0', color: 0x00000a },
        { text: '/0', color: 0x00000b }
      ],
      {
        ...rankResultText,
        size: 24,
        align: 'right'
      }
    )
    panelContainer.add(rankPointText)
    rankPointText.matrix.setConstraintsPosition(
      ReadonlyPin.TopLeft.cloneOffset(
        CONTAINER_WIDTH - SEGMENT_CONTAINER_OFFSET,
        32
      )
    )
    const rewardChest = new ConquestRewardChest()
    const CURRENT_CHEST_SIZE = GOAL_BADGE_SIZE + 10
    rewardChest.matrix.setConstraints(
      Pin.fromPixels(CURRENT_CHEST_SIZE, CURRENT_CHEST_SIZE),
      ReadonlyPin.Center,
      Pin.fromPixels(
        SEGMENT_CONTAINER_OFFSET - CURRENT_CHEST_SIZE / 1.5,
        CONTAINER_HEIGHT / 2 + CURRENT_CHEST_SIZE / 8
      )
    )
    panelContainer.add(rewardChest)

    const rewardChestGoal = new ConquestRewardChest()

    rewardChestGoal.matrix.setConstraints(
      Pin.fromPixels(BADGE_SIZE, BADGE_SIZE),
      ReadonlyPin.Center,
      Pin.fromPixels(
        CONTAINER_WIDTH - SEGMENT_CONTAINER_OFFSET + BADGE_SIZE / 2,
        CONTAINER_HEIGHT / 2 + BADGE_SIZE / 32
      )
    )
    panelContainer.add(rewardChestGoal)
    panelContainer.add(flashWholeBar)

    this._progressBarSubContainer = progressBarSubContainer

    this._conquestPointsText = rankPointText
    this._rankTitleText = rankTitleText
    this._rewardChest = rewardChest
    this._rewardChestGoal = rewardChestGoal
    this._flashRankBar = flashRankBar
    this._flashWholeBar = flashWholeBar
    this._flashRankBarController = flashRankBarController
    this._flashWholeBarController = flashWholeBarController
  }

  onBeforeConquestPointsChange(callback: PointsBeforeChangeCallback) {
    this._rankPointsBeforeChangeCallbacks.add(callback)

    return () => {
      this._rankPointsBeforeChangeCallbacks.delete(callback)
    }
  }

  prepare(reward: RewardConquestV2TreasureProgress) {
    const pq = __getProgressFromConquestPointsData(reward)
    this._progressQueue = pq
    this._isMaxLevel = pq[pq.length - 1].currentChestLevel === 10
    this._conquestPointsText.text = [
      {
        text: `${Math.floor(reward.beforeMatch.treasurePoints)}`,
        color: COLOR_WHITE //TODO: get correct color
      },
      {
        text: ` / ${Math.floor(
          reward.beforeMatch.treasurePoints +
            reward.beforeMatch.treasurePointsRequired
        )}`,
        color: lightPurple
      }
    ]
    const rankChange = pq.find(p => p.rankAboutToChange)?.rankAboutToChange
    const pointsChange = rankChange
      ? pq[1].currentPoints + pq[0].pointsRequired - pq[0].currentPoints
      : pq[0].end - pq[0].start
    this._performSignal = new Promise<void>(resolve => {
      this._unblockPerformance = resolve
    }).then(() => {
      this._rankPointsBeforeChangeCallbacks.forEach(c =>
        c(pointsChange, this._isMaxLevel)
      )
    })
    this._performanceComplete = this._performEarlyAndWait()
  }

  async perform() {
    await animationDelay(1000)
    if (this._unblockPerformance) {
      this._unblockPerformance()
    }

    await this._performanceComplete
  }

  private async _performEarlyAndWait() {
    while (this._progressQueue.length > 0) {
      const progress = this._progressQueue.shift()!

      if (progress.currentChestLevel === 10) {
        await Promise.all([
          this._rewardChest.prepareChest(progress.currentChestLevel)
        ])
        this._rewardChest.matrix.size = Pin.fromPixels(
          GOAL_BADGE_SIZE + 30,
          GOAL_BADGE_SIZE + 30
        )
        this._rewardChest.matrix.offset.x.offset += 30
        this._rewardChest.matrix.offset.y.offset -= 10
        this._rankTitleText.matrix.offset.x.offset += 40
        this._rankTitleText.matrix.offset.y.offset += 15
        removeFromParent(this._rewardChestGoal)
      } else {
        await Promise.all([
          this._rewardChest.prepareChest(progress.currentChestLevel),
          this._rewardChestGoal.prepareChest(
            progress.nextChestLevel || progress.currentChestLevel
          )
        ])
      }
      const useBarFlash = progress.rankAboutToChange

      if (this._progressBar) {
        removeFromParent(this._progressBar)
      }

      const denominatorText = ` / ${progress.pointsRequired}`

      const updateConquestPointsText = (v: number) => {
        this._conquestPointsText.text = [
          {
            text: `${Math.floor(v)}`,
            color: COLOR_WHITE //TODO: get correct color
          },
          {
            text: denominatorText,
            color: lightPurple
          }
        ]
      }
      if (progress.currentChestLevel === 10) {
        this._rankTitleText.text = 'CONGRATS!\nMAX TREASURE LEVEL REACHED!'
        this._conquestPointsText.text = ''
      } else {
        this._progressBar = new ProgressBarContinuous(
          progress.start,
          0,
          progress.pointsRequired,
          0,
          progress.rankAboutToChange,
          updateConquestPointsText,
          undefined,
          COLOR_CONQUEST_REWARDS_RED
        )
        this._progressBarSubContainer.add(this._progressBar)
      }

      const pointsDelta = progress.end - progress.start
      if (pointsDelta !== 0) {
        const flashColor = pointsDelta > 0 ? COLOR_WHITE : COLOR_NERFED_TEXT
        this._flashRankBar.matrix.setColor(flashColor)
        this._flashWholeBar.matrix.setColor(flashColor)
        __glowColor.copy(pointsDelta > 0 ? __glowColorGood : __glowColorBad)
      }
      const flash = async () => {
        if (useBarFlash) {
          await this._flashWholeBarController.animateValue(true)
        }
        this._rewardChest.showNextChest(), this._rewardChestGoal.showNextChest()

        if (useBarFlash) {
          this._flashRankBarController.animateValue(false, 800)
          await this._flashWholeBarController.animateValue(false)
        }
      }

      const performFlash = flash()
      if (progress.rankAboutToChange) {
        await performFlash
      }
      await this._performSignal
      if (progress.currentChestLevel !== 10) {
        await this._progressBar.animateToValue(progress.end)
      }
    }
  }
}
