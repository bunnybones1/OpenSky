import { clamp, lerp } from '@opensky/shared/utils/math'

import { getAssetsManager } from '~/assets/index'
import { COLOR_WHITE } from '~/colors/colorLibrary'
import { VIAL_SIZE } from '~/data/manaVialConstants'
import { HERO_ABILITY_UI_OFFSET_X } from '~/helpers/heroAbilityUIConstants'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import ManaVialMeshMaterial from '~/materials/ManaVialMeshMaterial'
import Object2D from '~/meshes/Object2D'
import { Easing } from '~/systems/animation/Easing'
import { simpleTweener } from '~/systems/animation/tweeners'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import AnimatedNumber from '~/utils/AnimatedNumber'
import { recursivelySetDepth, removeFromParent } from '~/utils/threeUtils'

export default class ManaVialController {
  private _vialMeshMaterial: ManaVialMeshMaterial
  private _previewMeshAnim: AnimatedNumber | undefined
  set mana(value: number) {
    this._mana = value
    this.updateManaWaterline()
    simpleTweener.to({
      description: 'mana vial liquid agitation',
      target: this as ManaVialController,
      propertyGoals: { agitation: 1 },
      duration: 1000,
      easing: Easing.Sinusoidal.InOut
    })
  }
  get mana() {
    return this._mana
  }
  set manaTotal(value: number) {
    this._manaTotal = value
    this.updateManaWaterline()
  }
  get manaTotal() {
    return this._manaTotal
  }
  agitation = 1
  wobblePhase = 0
  uiPivot: Object2D
  uiHeroAbilityPivot: Object2D
  uiHeroAbilityStagingPivot: Object2D
  private _textMesh: UITextMesh
  private _textShadowMesh: UITextMesh
  private _previewShadowMesh?: UITextMesh
  private _mana: number = 0
  private _manaTotal: number = 0
  constructor(private readonly previewDown: boolean = false) {
    const uiPivot = new Object2D()
    const uiHeroAbilityPivot = new Object2D()
    const uiHeroAbilityStagingPivot = new Object2D()
    const vialMesh = getAssetsManager().fetchMeshDeepClone(
      'manaVial',
      'mana-vial',
      true
    )
    const vialMeshMaterial = vialMesh.material as ManaVialMeshMaterial
    uiPivot.add(vialMesh)
    uiPivot.add(uiHeroAbilityPivot)
    uiHeroAbilityPivot.matrix.offset = new Pin(
      0,
      0,
      VIAL_SIZE + HERO_ABILITY_UI_OFFSET_X,
      VIAL_SIZE
    )
    uiPivot.add(uiHeroAbilityStagingPivot)
    uiHeroAbilityStagingPivot.matrix.offset = new Pin(
      0,
      0,
      VIAL_SIZE + HERO_ABILITY_UI_OFFSET_X,
      VIAL_SIZE * 1.5
    )
    const textShadowMesh = new UITextMesh('', textOptions.manaWheelTextShadow)
    vialMesh.add(textShadowMesh)
    const textMesh = new UITextMesh('', textOptions.manaWheelText)
    textShadowMesh.add(textMesh)
    this._textMesh = textMesh
    this._textShadowMesh = textShadowMesh
    this.uiPivot = uiPivot
    this.uiHeroAbilityPivot = uiHeroAbilityPivot
    this.uiHeroAbilityStagingPivot = uiHeroAbilityStagingPivot
    this._vialMeshMaterial = vialMeshMaterial
    recursivelySetDepth(uiPivot, 0.91)
  }
  showManaChange(change: number) {
    if (change > 0) {
      // TODO move previews to UI layer
      // return createBuffAnimation(this.vial, change, 50)
      return Promise.resolve()
    } else {
      return Promise.resolve()
    }
  }
  showPreview(preview?: [number, number]) {
    if (preview && (preview[0] || preview[1])) {
      this.attemptToCleanUpPreviousPreview()

      const manaDelta = (preview[0] > 0 ? '+' : '') + preview[0]
      const maxManaDelta = (preview[1] > 0 ? '+' : '') + preview[1]
      let previewShadowMesh: UITextMesh
      let previewMesh: UITextMesh
      if (preview[0] && preview[1]) {
        previewMesh = new UITextMesh(
          [
            {
              text: manaDelta,
              color:
                preview[0] > 0
                  ? textOptions.buffManaPreview.color
                  : textOptions.damageManaPreview.color
            },
            {
              text: '/',
              color: COLOR_WHITE
            },
            {
              text: maxManaDelta,
              color:
                preview[1] > 0
                  ? textOptions.buffManaPreview.color
                  : textOptions.damageManaPreview.color
            }
          ],
          textOptions.manaPreview
        )

        previewShadowMesh = new UITextMesh(
          `${manaDelta}/${maxManaDelta}`,
          textOptions.manaPreviewShadow
        )
      } else if (preview[1]) {
        const text = `MAX ${maxManaDelta}`

        previewMesh = new UITextMesh(
          text,
          preview[1] > 0
            ? textOptions.buffManaPreview
            : textOptions.damageManaPreview
        )

        previewShadowMesh = new UITextMesh(text, textOptions.manaPreviewShadow)
      } else {
        const text = manaDelta

        previewMesh = new UITextMesh(
          text,
          preview[0] > 0
            ? textOptions.buffManaPreview
            : textOptions.damageManaPreview
        )

        previewShadowMesh = new UITextMesh(text, textOptions.manaPreviewShadow)
      }

      this._previewShadowMesh = previewShadowMesh
      const previewShadowOffset = ReadonlyPin.Center.clone()
      previewShadowMesh.matrix.offset = previewShadowOffset
      this.uiPivot.add(previewShadowMesh)
      previewShadowMesh.add(previewMesh)
      const previewOffsetY = this.previewDown ? 50 : -50
      const previewMeshAnim = new AnimatedNumber(
        v => {
          previewShadowMesh.opacity = Math.cos((v + 1) * Math.PI) * 0.5 + 0.5
          previewShadowOffset.y.offset = Math.min(v, 1) * previewOffsetY
        },
        0,
        200,
        Easing.Cubic.Out
      )
      previewMeshAnim.animateToValue(1)
      this._previewMeshAnim = previewMeshAnim
    } else {
      this.attemptToCleanUpPreviousPreview()
    }
  }
  attemptToCleanUpPreviousPreview() {
    if (this._previewMeshAnim) {
      const animVal = this._previewMeshAnim
      this._previewMeshAnim = undefined
      const mesh = this._previewShadowMesh!
      this._previewShadowMesh = undefined
      const anim = animVal.animateToValue(2)
      const cleanup = () => {
        removeFromParent(mesh)
      }
      if (anim) {
        anim.then(cleanup)
      } else {
        cleanup()
      }
    }
  }
  private updateManaWaterline() {
    const text = `${this.mana}/${this.manaTotal}`
    this._textMesh.text = text
    this._textShadowMesh.text = text
    const h = this._manaTotal > 0 ? this._mana / this._manaTotal : 0
    simpleTweener.to({
      description: 'mana waterline',
      target: this._vialMeshMaterial,
      propertyGoals: { fillPercentage: lerp(0.9, 0.1, clamp(h, 0, 1)) },
      duration: 500,
      easing: Easing.Quartic.Out
    })
  }
}
