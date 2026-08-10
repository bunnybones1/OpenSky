import { i18n } from '@opensky/language-manager'
import { Color, Vector2 } from 'three'

import { getAssetsManager } from '~/assets'
import {
  COLOR_DUSTY_PURPLE,
  COLOR_RANK_XP_BAR_CYAN
} from '~/colors/colorLibrary'
import { PALETTE_ROW } from '~/constants'
import { Pin, ReadonlyPin, SizePin } from '~/helpers/LayoutHelpers'
import { playSound } from '~/helpers/soundHelpers'
import RectangleMaterial from '~/materials/RectangleMaterial'
import FireCracker from '~/meshes/FireCracker'
import Mesh2D from '~/meshes/Mesh2D'
import Object2D from '~/meshes/Object2D'
import RectangleMesh from '~/meshes/RectangleMesh'
import { Easing } from '~/systems/animation/Easing'
import { simpleTweener } from '~/systems/animation/tweeners'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import { animationDelay } from '~/utils/asyncUtils'

const flashColor = new Color(1, 1, 1)

type LevelUpListener = () => void
type PercentChangeListener = (percent: number) => void

export default class XPBar {
  mesh: Object2D = new Object2D()
  barContainer: Object2D
  levelContainer: Object2D

  levelText: UITextMesh
  xpText: UITextMesh

  private barInnerCurrentXP: Mesh2D
  private barInnerMesh: Mesh2D
  private cursorMesh: Mesh2D
  private cursorOffset: Pin = new Pin(0, 0.5)

  private percentChangeListeners: Set<PercentChangeListener> = new Set()
  private levelUpListeners: Set<LevelUpListener> = new Set()
  private barInitialXPSize: Pin = new Pin(0, 1)
  private barInnerSize: Pin = new Pin(0, 1, -1, 0)
  private _currentPercent: number = 0

  constructor(
    public currentLevel: number,
    public currentXP: number,
    public requiredXP: number
  ) {
    const bannerContainer = new Object2D()
    this.mesh.add(bannerContainer)
    const banner = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'panel-w-faded-sides'
    )

    banner.material.paletteRow = 8
    banner.matrix.setConstraints(
      Pin.fromPixels(720, 84),
      ReadonlyPin.Center,
      ReadonlyPin.Center,
      new Vector2(10, 1)
    )
    const innerContainer = new Object2D()
    innerContainer.matrix.setConstraints(
      Pin.fromPixels(574, 84),
      ReadonlyPin.Center,
      ReadonlyPin.Center
    )
    bannerContainer.add(banner)
    bannerContainer.add(innerContainer)

    const bar = new RectangleMesh(new RectangleMaterial({}))
    // this.bar.matrix.setConstraints(
    //   Pin.fromPixels(336, 12),
    //   ReadonlyPin.Left,
    //   ReadonlyPin.Left.cloneOffset(140, 0)
    // )
    bar.matrix.setColor(COLOR_DUSTY_PURPLE)
    const levelContainer = new Object2D()
    const levelSlant = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'panel-slanted'
    )
    this.levelContainer = levelContainer
    levelContainer.shouldRenderAsGroup = true
    levelSlant.matrix.setConstraints(
      Pin.fromPixels(126, 24),
      ReadonlyPin.Left,
      ReadonlyPin.Left,
      new Vector2(0.5, 1)
    )
    levelSlant.material.paletteRow = PALETTE_ROW.LEVEL_SLANT

    this.levelText = new UITextMesh(
      i18n.t('ui.rewardRank.playerLevel', {
        level: this.currentLevel
      }),
      {
        ...textOptions.rankResultText,
        color: new Color(0x000000),
        size: 18,
        align: 'left'
      }
    )
    this.levelText.matrix.setConstraintsPosition(
      ReadonlyPin.Left.cloneOffset(8, -1)
    )
    levelContainer.add(levelSlant)
    levelContainer.add(this.levelText)

    const barStartShadow = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'panel-slanted-shadow'
    )
    barStartShadow.matrix.setColor(new Color(0x31708d))
    barStartShadow.matrix.setConstraints(
      Pin.fromPixels(40, 12),
      ReadonlyPin.Left,
      ReadonlyPin.Left.cloneOffset(-46, 0),
      new Vector2(0.3, 1)
    )
    const barStart = new RectangleMesh(new RectangleMaterial({}))
    barStart.matrix.setColor(COLOR_RANK_XP_BAR_CYAN)
    barStart.matrix.setConstraints(
      Pin.fromPixels(40, 12),
      ReadonlyPin.Left,
      ReadonlyPin.Left.cloneOffset(-40, 0)
    )
    this.barContainer = new Object2D()
    this.barContainer.matrix.setConstraints(
      Pin.fromPixels(336, 12),
      ReadonlyPin.Left,
      ReadonlyPin.Left.cloneOffset(140, 0)
    )

    this.barInnerCurrentXP = new RectangleMesh(
      new RectangleMaterial({
        forceTransparent: true
      })
    )
    this.barInnerCurrentXP.matrix.setConstraints(
      this.barInitialXPSize,
      ReadonlyPin.Left,
      ReadonlyPin.Left
    )
    //TODO: Implement white bar for XP gain
    this.barInnerCurrentXP.matrix.setColor(COLOR_RANK_XP_BAR_CYAN)

    this.currentPercent = currentXP / requiredXP
    this.barInitialXPSize.x.scale = this.currentPercent

    this.xpText = new UITextMesh('0/100XP', {
      ...textOptions.rankResultText,
      color: new Color(0x705bab),
      size: 18,
      align: 'right'
    })
    this.xpText.matrix.setConstraintsPosition(
      ReadonlyPin.Right.cloneOffset(8, -1)
    )
    this.onPercentChange(p => {
      this.xpText.text = i18n.t('ui.rewardRank.progress.xp', {
        amount: `${~~(p * this.requiredXP)}/${this.requiredXP}`,
        interpolation: { escapeValue: false }
      })
    })

    this.cursorMesh = new RectangleMesh(new RectangleMaterial({}))
    this.cursorMesh.matrix.setConstraints(
      Pin.fromPixels(3, 20),
      ReadonlyPin.Center,
      this.cursorOffset
    )

    this.barContainer.add(bar)
    this.barContainer.add(barStart)
    this.barContainer.add(barStartShadow)
    this.barContainer.add(this.barInnerCurrentXP)
    this.makeNewBar()
    this.barContainer.add(this.cursorMesh)

    innerContainer.add(this.barContainer)
    innerContainer.add(this.xpText)
    innerContainer.add(levelContainer)
  }

  get currentPercent() {
    return this._currentPercent
  }

  set currentPercent(value: number) {
    if (value !== this._currentPercent) {
      this._currentPercent = value
      this.barInnerSize.x.scale = value
      this.cursorOffset.x.scale = value

      for (const listener of this.percentChangeListeners) {
        listener(value)
      }
    }
  }

  async perform(requiredXP: number, initXP: number, finalXP: number) {
    this.requiredXP = requiredXP

    //hotfix for free gift on first play
    if (requiredXP === 0) {
      if (finalXP === 0) {
        finalXP = 100
      }
      requiredXP = finalXP
    }

    playSound('audioFxMatchEnd', 'XP_Up')

    let cursor = initXP

    while (cursor < finalXP) {
      const nextCeiling = (1 + ~~(cursor / requiredXP)) * requiredXP
      const nextGoal = Math.min(nextCeiling, finalXP)
      const delta = Math.min(requiredXP, nextGoal - cursor)
      const xpChunk = (cursor % requiredXP) + delta
      const percent = xpChunk / requiredXP

      await this.animateBarTo(percent)

      cursor += delta
    }
  }

  onLevelUp(listener: LevelUpListener) {
    this.levelUpListeners.add(listener)
    return () => {
      this.levelUpListeners.delete(listener)
    }
  }

  onPercentChange(listener: PercentChangeListener) {
    this.percentChangeListeners.add(listener)
    listener(this._currentPercent)
    return () => {
      this.percentChangeListeners.delete(listener)
    }
  }

  private makeNewBar() {
    if (this.barInnerMesh) {
      this.barContainer.remove(this.barInnerMesh)
    }

    const barInnerMesh = new RectangleMesh(new RectangleMaterial({}))
    // mat.blending = AdditiveBlending
    barInnerMesh.matrix.setConstraints(
      this.barInnerSize,
      ReadonlyPin.TopLeft,
      ReadonlyPin.TopLeft
    )
    barInnerMesh.matrix.setColor(COLOR_RANK_XP_BAR_CYAN)

    this.barContainer.add(barInnerMesh)
    this.barInnerMesh = barInnerMesh
  }

  private async animateBarTo(goalPercent: number) {
    const delta = Math.abs(goalPercent - this._currentPercent)

    await simpleTweener.to({
      description: 'xpbar percentage',
      target: this as XPBar,
      propertyGoals: { currentPercent: goalPercent },
      duration: 1500 * delta,
      easing: Easing.Quartic.Out
    }).finished

    if (goalPercent === 1) {
      await this._handleLevelUp()
    }
  }

  private async _handleLevelUp() {
    playSound('audioFxMatchEnd', 'VicWings1')
    await animationDelay(1200)

    this.currentPercent = 0
    this.currentLevel++
    this.levelUpListeners.forEach(callback => callback())
    this.levelText.text = i18n.t('ui.rewardRank.playerLevel', {
      level: this.currentLevel
    })
    this.barInitialXPSize.x.scale = 0
    this.makeNewBar()

    const fc: FireCracker = new FireCracker(
      getAssetsManager().getAsset('particle'),
      () => fc.parent!.remove(fc),
      48,
      20000,
      20000,
      500,
      0,
      flashColor
    )
    fc.layers = this.mesh.layers
    fc.matrix.setConstraints(
      new SizePin(1, 1, 2, 'fit'),
      ReadonlyPin.Center,
      ReadonlyPin.Left.cloneOffset(60, 0)
    )
    this.levelContainer.add(fc)
  }
}
