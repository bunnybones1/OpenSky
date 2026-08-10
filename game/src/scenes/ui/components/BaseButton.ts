import device from '@opensky/shared/device'
import { lerp } from '@opensky/shared/utils/math'
import { Color, Vector2 } from 'three'

import { getAssetsManager } from '~/assets/index'
import {
  COLOR_HIGHLIGHT_GREEN,
  COLOR_HIGHLIGHT_YELLOW
} from '~/colors/colorLibrary'
import { addColor } from '~/colors/utils'
import { ButtonHighlightShape } from '~/helpers/buttonTypeHelpers'
import { getFireHighlightOptionOverrides } from '~/helpers/fireHighlightMaterialFactory'
import { ReadonlyPin } from '~/helpers/LayoutHelpers'
import { playSound } from '~/helpers/soundHelpers'
import MagicFireHighlightMeshMaterial from '~/materials/MagicFireHighlightMeshMaterial'
import Mesh2D from '~/meshes/Mesh2D'
import { CursorType } from '~/systems/input/CursorType'
import IInteractive from '~/systems/input/IInteractive'
import { AnimatedBool } from '~/utils/AnimatedBool'
import ColliderMesh from '~/utils/ColliderMesh'
import { makeInteractive } from '~/utils/makeInteractive'

export enum ButtonState {
  Normal,
  Hover,
  Click,
  Selected,
  Disabled
}
export type ButtonHighlightStyle = 'buttonBasic' | 'buttonReplay'
const HIGHLIGHT_COLOR = COLOR_HIGHLIGHT_GREEN
const HIGHLIGHT_URGENT_COLOR = COLOR_HIGHLIGHT_YELLOW

export default class BaseButton implements IInteractive {
  get selected() {
    return this._selected
  }
  set selected(value: boolean) {
    if (value === this._selected) {
      return
    }
    this._selected = value
    if (this._disabled) {
      return
    }
    if (value) {
      this.setState(ButtonState.Selected)
    } else {
      this.setState(ButtonState.Normal)
    }
  }
  get disabled() {
    return this._disabled
  }

  set disabled(value: boolean) {
    if (value === this._disabled) {
      // exit if we're not changing so we don't reset hover state
      return
    }
    this._disabled = value

    if (value) {
      this.setState(ButtonState.Disabled)
    } else {
      this.setState(this._selected ? ButtonState.Selected : ButtonState.Normal)
    }
  }
  get highlightMaterial(): MagicFireHighlightMeshMaterial | undefined {
    if (!this._highlightMaterial) {
      const bhPrototype = getAssetsManager().fetchMeshDeepClone(
        'uiSmall',
        this._highlightMeshName
      )
      const bhGeo = bhPrototype.geometry
      const bhMat = new MagicFireHighlightMeshMaterial(
        getAssetsManager(),
        getFireHighlightOptionOverrides(this._buttonHighlightStyle)
      )
      const bh = new Mesh2D(bhGeo, bhMat)
      this._highlightMaterial = bhMat
      this.mesh.add(bh)
    }
    return this._highlightMaterial
  }

  set highlight(val: boolean) {
    this._highlight.value = val
  }
  get highlight() {
    return this._highlight.value
  }
  set highlightUrgent(val: boolean) {
    this._highlightUrgency.value = val
  }
  get highlightUrgent() {
    return this._highlightUrgency.value
  }
  mesh: Mesh2D
  collider: ColliderMesh
  state: ButtonState
  cursor: CursorType = 'pointer'
  highlightColor = HIGHLIGHT_COLOR
  protected _highlight: AnimatedBool
  protected _highlightUrgency: AnimatedBool
  private _disabled: boolean = false
  private _selected: boolean = false
  private _highlightMaterial: MagicFireHighlightMeshMaterial
  constructor(
    buttonMesh: Mesh2D,
    private _onSelect: () => void,
    private _highlightMeshName: ButtonHighlightShape,
    private _buttonHighlightStyle: ButtonHighlightStyle = 'buttonBasic'
  ) {
    const collider = makeInteractive(buttonMesh, this, ReadonlyPin.FullSize)
    this.mesh = buttonMesh
    this.collider = collider
    const updateHighlight = () => {
      if (this.highlightMaterial) {
        const mixH = this._highlight.animatedValue
        const mixHU = this._highlightUrgency.animatedValue
        this.highlightMaterial.opacity = mixH * 0.25 + mixHU * 0.5
        this.highlightMaterial.thicknessRatio = mixH * 0.25 + mixHU * 0.75
        const color = this.highlightMaterial.uniforms.color1.value as Color
        const opacityRamp = this.highlightMaterial.uniforms.uOpacityRamp
          .value as Vector2
        color.setRGB(0, 0, 0)
        if (mixH !== 0) {
          addColor(color, this.highlightColor, mixH)
        }
        if (mixHU !== 0) {
          color.lerp(HIGHLIGHT_URGENT_COLOR, mixHU)
        }
        opacityRamp.x = lerp(6, 2.3, mixHU)
        opacityRamp.y = lerp(-0.8, -1.1, mixHU)
      }
    }

    this._highlight = new AnimatedBool(updateHighlight)
    this._highlightUrgency = new AnimatedBool(updateHighlight)
  }

  setState(state: ButtonState) {
    this.state = state
  }

  onSelect() {
    if (!this.disabled) {
      this.setState(ButtonState.Hover)
      playSound('audioFxCommon', 'BtClick')
      this._onSelect()
    }
  }

  onSelectEvenIfDisabled() {
    this._onSelect()
  }

  onOver() {
    if (!this.disabled && this.state !== ButtonState.Hover) {
      this.setState(device.isMobile ? ButtonState.Click : ButtonState.Hover)
      playSound('audioFxCommon', 'BtHover')
    }
  }

  onOut() {
    if (!this.disabled) {
      if (!this.selected && this.state !== ButtonState.Normal) {
        this.setState(ButtonState.Normal)
      } else if (this.selected && this.state !== ButtonState.Selected) {
        this.setState(ButtonState.Selected)
      }
    }
  }

  onDown() {
    if (!this.disabled && this.state !== ButtonState.Click) {
      this.setState(ButtonState.Click)
    }
  }

  onUp() {
    if (!this.disabled && this.state !== ButtonState.Hover) {
      this.setState(ButtonState.Hover)
    }
  }
}
