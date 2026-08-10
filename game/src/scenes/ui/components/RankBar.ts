import { i18n } from '@opensky/language-manager'
import {
  PlayerRank,
  PlayerRankStage,
  RankData,
  RewardRank
} from '@opensky/proto'
import { Color, Vector2 } from 'three'

import { getAssetsManager } from '~/assets/index'
import { COLOR_NERFED_TEXT, COLOR_WHITE } from '~/colors/colorLibrary'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import Mesh2D from '~/meshes/Mesh2D'
import Object2D from '~/meshes/Object2D'
import { storeHelper } from '~/state/index'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import { AnimatedBool } from '~/utils/AnimatedBool'
import { animationDelay } from '~/utils/asyncUtils'
import {
  nextRank,
  nextRankStage,
  playerRankOrder,
  playerRankStageOrder,
  rankNames
} from '~/utils/ranks'
import { removeFromParent } from '~/utils/threeUtils'

import ProgressBarContinuous from './ProgressBarContinuous'
import ProgressBarSegmented from './ProgressBarSegmented'
import { RankBadge } from './RankBadge'
import {
  BADGE_SIZE,
  getRankColor,
  GOAL_BADGE_SIZE,
  lightPurple,
  RankedGameMode
} from './rankConstants'
import RewardsPanel from './rewardsPanel'

export const CONTAINER_WIDTH = 720
export const CONTAINER_HEIGHT = 84
const SEGMENT_CONTAINER_WIDTH = 372
const SEGMENT_CONTAINER_OFFSET = (CONTAINER_WIDTH - SEGMENT_CONTAINER_WIDTH) / 2
const SEGMENT_HEIGHT = 12
const SEGMENT_PADDING = 4
const RP_PER_RANK = 100

const __glowColor = new Color(6, 6, 4)
const __glowColorGood = new Color(6, 6, 4)
const __glowColorBad = new Color(2, -1, -1)

type RankChangeCallback = () => void
type PointsBeforeChangeCallback = (
  pointsDelta: number,
  rankChange?: 'up' | 'down' | false,
  xpReason?: string
) => Promise<void>

class RankProgress {
  points: number
  convertedPoints: number
  min: number = 0
  max: number = 100
  start: number = 25
  end: number = 75
  currentRank: PlayerRank = PlayerRank.UNKNOWN
  currentRankStage: PlayerRankStage = PlayerRankStage.STAGE_NONE
  rankPosition: number
  nextRankPosition: number | string
  nextRank?: PlayerRank
  rankJustChanged: false | 'up' | 'down' = false
  rankAboutToChange: boolean = false
  isMasterOrAbove: boolean
  get rankIndex() {
    const rankOrder = playerRankOrder.indexOf(this.currentRank)
    const rankStageOrder = playerRankStageOrder.indexOf(this.currentRankStage)
    return [rankOrder, rankStageOrder]
  }
  //maybe split into two constructors?
  constructor(rankData: RankData) {
    this.points = rankData!.score
    this.convertedPoints =
      this.points - (rankData!.requiredRankPoints - RP_PER_RANK)
    this.isMasterOrAbove =
      rankData?.rank === PlayerRank.GRANDWEAVER ||
      rankData?.rank === PlayerRank.MASTER
    this.min = this.isMasterOrAbove
      ? rankData!.scoreBelow > 0
        ? rankData!.scoreBelow
        : rankData!.requiredRankPoints
      : 0
    this.max = this.isMasterOrAbove ? rankData!.scoreAbove : RP_PER_RANK

    this.currentRank = rankData!.rank
    this.currentRankStage = rankData!.rankStage
    this.rankPosition = rankData!.rankPosition
    this.nextRankPosition = this.rankPosition - 1
    this.nextRank = this.isMasterOrAbove
      ? PlayerRank.GRANDWEAVER
      : this.currentRankStage === PlayerRankStage.STAGE_III ||
        this.currentRank === PlayerRank.WANDERER
      ? nextRank(rankData!.rank)
      : this.currentRank
    if (this.currentRank === PlayerRank.MASTER && this.rankPosition === 1) {
      this.nextRank = PlayerRank.GRANDWEAVER
      this.nextRankPosition = 100
    }
  }
}
function __getProgressFromRankData(
  before: RankData,
  after: RankData
): RankProgress[] {
  const beforeRank = new RankProgress(before)
  const afterRank = new RankProgress(after)
  const rankUp = beforeRank.rankIndex[0] < afterRank.rankIndex[0] // rank
  const rankDown = beforeRank.rankIndex[0] > afterRank.rankIndex[0] //stage
  const stageDown = beforeRank.rankIndex[1] > afterRank.rankIndex[1]
  const stageUp =
    beforeRank.rankIndex[0] === afterRank.rankIndex[0] &&
    beforeRank.rankIndex[1] < afterRank.rankIndex[1]
  const gwRankUp =
    beforeRank.currentRank === PlayerRank.GRANDWEAVER &&
    afterRank.currentRank === PlayerRank.GRANDWEAVER &&
    beforeRank.rankPosition > afterRank.rankPosition
  const gwRankDown =
    beforeRank.currentRank === PlayerRank.GRANDWEAVER &&
    afterRank.currentRank === PlayerRank.GRANDWEAVER &&
    beforeRank.rankPosition < afterRank.rankPosition

  if (
    beforeRank.currentRankStage !== afterRank.currentRankStage ||
    rankUp ||
    rankDown ||
    gwRankUp ||
    gwRankDown
  ) {
    const isTwoBarsRankUp = rankUp || stageUp || gwRankUp
    const isTwoBarsRankDown = rankDown || stageDown || gwRankDown
    if (isTwoBarsRankUp) {
      beforeRank.start = beforeRank.isMasterOrAbove
        ? beforeRank.points
        : beforeRank.convertedPoints
      beforeRank.end = beforeRank.max
      afterRank.start = afterRank.isMasterOrAbove
        ? afterRank.points
        : afterRank.min
      afterRank.end = afterRank.isMasterOrAbove
        ? afterRank.points
        : afterRank.convertedPoints
      beforeRank.rankAboutToChange = true
      afterRank.rankJustChanged = 'up'
    } else if (isTwoBarsRankDown) {
      beforeRank.max = Math.max(beforeRank.convertedPoints, beforeRank.max)
      beforeRank.start = beforeRank.isMasterOrAbove
        ? beforeRank.points
        : beforeRank.convertedPoints
      beforeRank.end = beforeRank.min
      afterRank.start = afterRank.max
      afterRank.end = afterRank.isMasterOrAbove
        ? afterRank.points
        : afterRank.convertedPoints
      beforeRank.rankAboutToChange = true
      afterRank.rankJustChanged = 'down'
    }
    return [beforeRank, afterRank]
  } else if (
    before.rank === PlayerRank.GRANDWEAVER &&
    beforeRank.rankPosition === 1
  ) {
    afterRank.start = beforeRank.points
    afterRank.end = afterRank.points
    afterRank.max = Math.max(beforeRank.points, afterRank.max)
    return [afterRank]
  } else {
    beforeRank.start = beforeRank.isMasterOrAbove
      ? beforeRank.points
      : beforeRank.convertedPoints
    beforeRank.end = afterRank.isMasterOrAbove
      ? afterRank.points
      : afterRank.convertedPoints
    if (beforeRank.isMasterOrAbove) {
      beforeRank.rankAboutToChange = true
      beforeRank.nextRankPosition = afterRank.rankPosition
      if (
        beforeRank.currentRank === PlayerRank.GRANDWEAVER &&
        beforeRank.rankPosition < afterRank.rankPosition
      ) {
        beforeRank.rankJustChanged = 'down'
      } else if (
        beforeRank.currentRank === PlayerRank.GRANDWEAVER &&
        beforeRank.rankPosition > afterRank.rankPosition
      ) {
        beforeRank.rankJustChanged = 'up'
      }
    }
    return [beforeRank]
  }
}

export default class RankBar extends Object2D {
  private _rankUpCallbacks: Set<RankChangeCallback> = new Set()
  private _rankDownCallbacks: Set<RankChangeCallback> = new Set()
  private _scoreBeforeChangeCallbacks: Set<PointsBeforeChangeCallback> =
    new Set()
  private _xpBeforeChangeCallbacks: Set<PointsBeforeChangeCallback> = new Set()

  private _progressQueue: RankProgress[]
  private _progressBar: ProgressBarSegmented | ProgressBarContinuous
  private _progressBarSubContainer: Object2D

  private _rankPointText: UITextMesh
  private _rankTitleText: UITextMesh

  private _rankGoalBadge: RankBadge
  private _rankBadge: RankBadge

  private _direction: 'up' | 'down' = 'up'
  private _flashRankBarController: AnimatedBool
  private _flashWholeBarController: AnimatedBool
  private _performSignal: Promise<void>
  private _unblockPerformance: () => void
  private _performanceComplete: Promise<void>
  private _flashRankBar: Mesh2D
  private _flashWholeBar: Mesh2D

  constructor(gameMode: RankedGameMode) {
    super()
    const panelContainer = new RewardsPanel(CONTAINER_HEIGHT)

    this.add(panelContainer)

    const progressBarContainer = new Object2D()
    panelContainer.add(progressBarContainer)

    const progressBarSubContainer = new Object2D()
    progressBarContainer.matrix.setConstraints(
      Pin.fromPixels(SEGMENT_CONTAINER_WIDTH, SEGMENT_HEIGHT),
      ReadonlyPin.Center,
      ReadonlyPin.Center.cloneOffset(2, 12)
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

    const rankTitleText = new UITextMesh('...', {
      ...textOptions.buttonText,
      size: 20,
      align: 'left'
    })
    panelContainer.add(rankTitleText)
    rankTitleText.matrix.setConstraintsPosition(
      ReadonlyPin.TopLeft.cloneOffset(SEGMENT_CONTAINER_OFFSET, 24)
    )

    const rankPointText = new UITextMesh(
      [
        { text: '0', color: 0x00000a },
        { text: '/0', color: 0x00000b }
      ],
      {
        ...textOptions.buttonText,
        size: 20,
        align: 'right'
      }
    )
    panelContainer.add(rankPointText)
    rankPointText.matrix.setConstraintsPosition(
      ReadonlyPin.TopLeft.cloneOffset(
        CONTAINER_WIDTH - SEGMENT_CONTAINER_OFFSET,
        24
      )
    )

    const rankBadge = new RankBadge(gameMode)

    rankBadge.matrix.setConstraints(
      Pin.fromPixels(BADGE_SIZE, BADGE_SIZE),
      ReadonlyPin.Center,
      Pin.fromPixels(
        SEGMENT_CONTAINER_OFFSET - BADGE_SIZE / 2 + SEGMENT_PADDING,
        CONTAINER_HEIGHT / 2
      )
    )
    panelContainer.add(rankBadge)

    const rankGoalBadge = new RankBadge(gameMode)

    rankGoalBadge.matrix.setConstraints(
      Pin.fromPixels(GOAL_BADGE_SIZE, GOAL_BADGE_SIZE),
      ReadonlyPin.Center,
      Pin.fromPixels(
        CONTAINER_WIDTH -
          SEGMENT_CONTAINER_OFFSET +
          SEGMENT_PADDING * 2 +
          GOAL_BADGE_SIZE / 2,
        CONTAINER_HEIGHT / 2 - GOAL_BADGE_SIZE / 16
      )
    )
    panelContainer.add(rankGoalBadge)

    panelContainer.add(flashWholeBar)

    this._progressBarSubContainer = progressBarSubContainer

    this._rankPointText = rankPointText
    this._rankTitleText = rankTitleText

    this._rankGoalBadge = rankGoalBadge
    this._rankBadge = rankBadge
    this._flashRankBar = flashRankBar
    this._flashWholeBar = flashWholeBar
    this._flashRankBarController = flashRankBarController
    this._flashWholeBarController = flashWholeBarController
  }

  onRankUp(callback: RankChangeCallback) {
    this._rankUpCallbacks.add(callback)

    return () => {
      this._rankUpCallbacks.delete(callback)
    }
  }

  onRankDown(callback: RankChangeCallback) {
    this._rankDownCallbacks.add(callback)

    return () => {
      this._rankDownCallbacks.delete(callback)
    }
  }

  onBeforeRankPointsChange(callback: PointsBeforeChangeCallback) {
    this._scoreBeforeChangeCallbacks.add(callback)

    return () => {
      this._scoreBeforeChangeCallbacks.delete(callback)
    }
  }

  onBeforeEloChange(callback: PointsBeforeChangeCallback) {
    this._xpBeforeChangeCallbacks.add(callback)

    return () => {
      this._xpBeforeChangeCallbacks.delete(callback)
    }
  }

  prepare(rewardRank: RewardRank) {
    const pq = __getProgressFromRankData(
      rewardRank.beforeMatch,
      rewardRank.afterMatch
    )

    console.log(rewardRank, pq)
    this._progressQueue = pq
    const rankDelta =
      pq.length === 2
        ? pq[1].rankIndex[1] - pq[0].rankIndex[1]
        : pq[0].end - pq[0].start
    this._direction = rankDelta >= 0 ? 'up' : 'down'

    const pointsChangeEvent = pq.length > 0
    const pointsChange = pointsChangeEvent
      ? pq.length === 2
        ? pq[pq.length - 1].points - pq[0].points
        : pq[0].end - pq[0].start
      : null
    const rankChange = pq.find(p => p.rankJustChanged)?.rankJustChanged
    this._performSignal = new Promise<void>(resolve => {
      this._unblockPerformance = resolve
    }).then(() => {
      if (rankChange === 'up') {
        this._rankUpCallbacks.forEach(r => r())
      } else if (rankChange === 'down') {
        this._rankDownCallbacks.forEach(r => r())
      }
      if (pointsChange !== null) {
        this._scoreBeforeChangeCallbacks.forEach(c =>
          c(pointsChange, rankChange)
        )
      }
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
    await storeHelper.getPlayerAccount()
    const progressLen = this._progressQueue.length
    while (this._progressQueue.length > 0) {
      const progress = this._progressQueue.shift()!
      const nextRank = progress.nextRank || progress.currentRank
      await Promise.all([
        this._rankBadge.prepareRank(
          progress.currentRank,
          progress.currentRankStage
        ),
        this._rankGoalBadge.prepareRank(
          progress.currentRankStage === PlayerRankStage.STAGE_III ||
            progress.currentRankStage === PlayerRankStage.STAGE_NONE
            ? nextRank
            : progress.currentRank,
          nextRank === PlayerRank.GRANDWEAVER || nextRank === PlayerRank.MASTER
            ? PlayerRankStage.STAGE_NONE
            : nextRankStage(progress.currentRankStage) ||
                progress.currentRankStage
        )
      ])
      const useBarFlash = progress.rankJustChanged
      if (useBarFlash) {
        await this._flashRankBarController.animateValue(true)
      }

      if (this._progressBar) {
        removeFromParent(this._progressBar)
      }

      const denominatorText = progress.isMasterOrAbove
        ? ''
        : ` / ${i18n.t('ui.rewardRank.progress.rp', {
            amount: progress.max
          })}`

      const updateRankPointText = (v: number) => {
        this._rankPointText.text = [
          {
            text: `${
              progress.isMasterOrAbove
                ? i18n.t(`ui.rewardRank.progress.masterRP`, {
                    count: Math.floor(v)
                  })
                : `${Math.round(v)}`
            }`,
            color: getRankColor(progress.currentRank, this._direction)
          },
          {
            text: denominatorText,
            color: lightPurple
          }
        ]
      }
      this._progressBar = new ProgressBarContinuous(
        progress.start,
        progress.min,
        progress.max,
        progress.isMasterOrAbove ? 0 : 3,
        progress.rankJustChanged
          ? 'end'
          : progress.rankAboutToChange
          ? 'begin'
          : false,
        updateRankPointText,
        undefined
      )

      this._progressBarSubContainer.add(this._progressBar)

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
        await this._rankBadge.showNextRank()
        await this._rankGoalBadge.showNextRank()
        updateRankPointText(progress.start)
        this._rankTitleText.text = rankNames[progress.currentRank]
        this._rankBadge.text = progress.isMasterOrAbove
          ? progress.rankPosition
          : ''
        this._rankGoalBadge.text =
          progress.currentRank === PlayerRank.GRANDWEAVER
            ? progress.rankPosition === 1 &&
              progress.currentRank === PlayerRank.GRANDWEAVER
              ? ':)'
              : progress.nextRankPosition
            : ''
        if (progress.isMasterOrAbove && useBarFlash) {
          await this._rankBadge.flashRank()
        }
        if (useBarFlash) {
          await this._flashRankBarController.animateValue(false, 300)
          await this._flashWholeBarController.animateValue(false)
        }
      }
      const performFlash = flash()
      await performFlash

      await this._performSignal

      await this._progressBar.animateToValue(progress.end)
      if (
        progress.isMasterOrAbove &&
        progressLen === 1 &&
        progress.rankPosition !== 1
      ) {
        await this._rankBadge.flashRank()
        this._rankBadge.text = progress.nextRankPosition
      }
    }
  }
}
