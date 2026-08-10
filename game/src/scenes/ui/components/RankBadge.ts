import { PlayerRank, PlayerRankStage } from '@opensky/proto'
import { Texture } from 'three'

import { getAssetsManager } from '~/assets'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import RectangleMaterial from '~/materials/RectangleMaterial'
import FireCracker from '~/meshes/FireCracker'
import Object2D from '~/meshes/Object2D'
import RectangleMesh from '~/meshes/RectangleMesh'
import { Easing } from '~/systems/animation/Easing'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import { AnimatedBool } from '~/utils/AnimatedBool'
import { safelyResetFlipY } from '~/utils/textureUtils'

import { flashColor, getGameModePath, RankedGameMode } from './rankConstants'

export class RankBadge extends Object2D {
  private _rank: PlayerRank | undefined
  private _rankStage: PlayerRankStage | undefined
  private _rankTexts: UITextMesh[] = []
  private _badgeMesh: RectangleMesh | undefined
  private _gameModePath: string
  private _newBadgeMesh: RectangleMesh | undefined
  private _nextRank: PlayerRank | undefined
  private _nextRankStage: PlayerRankStage | undefined
  private _preparingForNewRank: boolean

  constructor(gameMode: RankedGameMode) {
    super()
    this._gameModePath = getGameModePath(gameMode)
  }

  async prepareRank(rank: PlayerRank, stage: PlayerRankStage) {
    if (this._rank === rank && this._rankStage === stage) {
      return
    }
    this._preparingForNewRank = true
    this._nextRank = rank
    this._nextRankStage = stage
    const rankBadgeUrl =
      rank &&
      `game/rank-badges/${rank.toLowerCase()}${`-${this._gameModePath.toLowerCase()}`}${
        stage
          ? stage === PlayerRankStage.STAGE_NONE
            ? ''
            : `-${stage.replace('_', '-').toLowerCase()}`
          : ''
      }.png`
    const rankBadgeTexture = rankBadgeUrl
      ? ((await getAssetsManager().load('texture', rankBadgeUrl)) as Texture)
      : undefined

    safelyResetFlipY(rankBadgeTexture)
    const newBadgeMesh = new RectangleMesh(
      new RectangleMaterial({
        map: rankBadgeTexture,
        forceTransparent: true,
        colorMode: 'SCREEN'
      })
    )
    this._newBadgeMesh = newBadgeMesh
    this._preparingForNewRank = false
  }
  async flashRank() {
    if (this._badgeMesh !== undefined) {
      const growProxy = new AnimatedBool(
        v => {
          const s = v * 0.2 + 1
          this._badgeMesh!.matrix.size.x.scale = s
          this._badgeMesh!.matrix.size.y.scale = s
        },
        false,
        100,
        Easing.Quartic.Out,
        300
      )

      const tintProxy = new AnimatedBool(
        v => {
          this._badgeMesh!.matrix.setColorRGB(v * 1.2, v * 1.2, v * 0.8)
        },
        false,
        50,
        Easing.Quartic.Out,
        1000
      )

      await Promise.all([
        growProxy!.animateValue(true),
        tintProxy!.animateValue(true)
      ])

      const fireCracker = new FireCracker(
        getAssetsManager().getAsset('particle'),
        fc => {
          fc.parent!.remove(fc)
        },
        64,
        30000,
        40000,
        500,
        0,
        flashColor
      )
      fireCracker.matrix.setConstraints(new Pin(1.5, 1.5))

      this._badgeMesh.add(fireCracker)

      tintProxy!.animateValue(false)
      await growProxy!.animateValue(false)
    }
  }
  showNextRank() {
    const nextRank = this._nextRank
    const nextRankStage = this._nextRankStage
    if (!this._newBadgeMesh || !nextRank) {
      return
    }
    if (this._preparingForNewRank) {
      throw new Error('wait until preparation is complete')
    }

    const oldBadgeMesh = this._badgeMesh

    const newBadgeMesh = this._newBadgeMesh
    this._newBadgeMesh = undefined
    this._badgeMesh = newBadgeMesh
    this.add(newBadgeMesh)

    if (this._rankTexts.length > 0) {
      for (const text of this._rankTexts) {
        text.removeFromParent()
      }
      this._rankTexts = []
    }
    for (const style of [
      textOptions.rankBarBadgeNumberShadow,
      textOptions.rankBarBadgeNumber
    ] as const) {
      const text = new UITextMesh('', style)
      this.add(text)
      this._rankTexts.push(text)
    }

    const sizePin = new Pin(1, 1)
    newBadgeMesh.matrix.setConstraints(
      sizePin,
      ReadonlyPin.Center,
      ReadonlyPin.Center
    )
    newBadgeMesh.matrix.setColorRGB(0, 0, 0)
    if (oldBadgeMesh) {
      this.remove(oldBadgeMesh)
    }

    this._rank = nextRank
    this._rankStage = nextRankStage
    this._nextRank = undefined
    this._nextRankStage = undefined
  }
  set text(value: number | string) {
    for (const t of this._rankTexts) {
      t.text = value
    }
  }

  get texts() {
    const texts = []
    for (const t of this._rankTexts) {
      texts.push(t.text)
    }
    return texts
  }
}
