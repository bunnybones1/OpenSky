import NiceBooleanParameter from '@opensky/shared/utils/NiceBooleanParameter'

import { getAssetsManager } from '~/assets/index'
import { PALETTE_ROW } from '~/constants'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import PaletteMappedVertexColorMeshMaterial from '~/materials/PaletteMappedVertexColorMeshMaterial'
import Mesh2D from '~/meshes/Mesh2D'
import Object2D from '~/meshes/Object2D'
import { CursorType } from '~/systems/input/CursorType'
import IInteractive from '~/systems/input/IInteractive'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import { makeInteractive } from '~/utils/makeInteractive'

const LABEL_SPACING = 5

export default class Checkbox implements IInteractive {
  mesh: Object2D
  cursor: CursorType = 'pointer'
  private checkBoxMaterial: PaletteMappedVertexColorMeshMaterial
  private valueTextMesh: UITextMesh | undefined
  private _state = false
  private _hovering = false
  private checkboxMesh: Mesh2D
  private _isDown: boolean
  boxOffset: Pin

  constructor(
    public parameter: NiceBooleanParameter,
    showLabels = true
  ) {
    const container = new Object2D()
    const checkboxMesh = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      parameter.value ? 'checkbox-on' : 'checkbox-off',
      true,
      true
    )
    this.boxOffset = ReadonlyPin.Left.cloneOffset(-39, 0)

    container.add(checkboxMesh)

    if (showLabels) {
      const longLabelText = parameter.label.length >= 19
      const labelTextMesh = new UITextMesh(
        typeof parameter.label === 'string'
          ? parameter.label
          : parameter.label(),
        {
          ...textOptions.sliderLabelText
        }
      )
      labelTextMesh.matrix.setConstraintsPosition(
        ReadonlyPin.Left.cloneOffset(-215, -4)
      )

      const valueTextMesh = new UITextMesh(
        parameter.valueString,
        textOptions.sliderValueText
      )
      valueTextMesh.matrix.setConstraintsPosition(
        ReadonlyPin.Left.cloneOffset(LABEL_SPACING, longLabelText ? -12 : -2)
      )
      if (longLabelText) {
        this.boxOffset = ReadonlyPin.TopLeft.cloneOffset(-39, 0)
      }
      // if (labelTextMesh.height)
      container.add(labelTextMesh)
      container.add(valueTextMesh)
      this.valueTextMesh = valueTextMesh
    }
    checkboxMesh.matrix.setConstraints(
      new Pin(0, 0, 24, 24),
      ReadonlyPin.Left,
      this.boxOffset
    )
    makeInteractive(checkboxMesh, this)

    this.mesh = container
    this.checkBoxMaterial =
      checkboxMesh.material as PaletteMappedVertexColorMeshMaterial

    this.checkboxMesh = checkboxMesh
    parameter.listen(v => (this.state = v))
  }
  onOver() {
    this.hovering = true
  }
  onOut() {
    this.hovering = false
    this.isDown = false
  }
  onDown() {
    this.isDown = true
  }
  onUp() {
    this.isDown = false
  }
  onSelect() {
    this.parameter.value = !this.parameter.value
  }
  private set state(value: boolean) {
    if (this._state === value) {
      return
    }
    this._state = value
    if (this.valueTextMesh) {
      this.valueTextMesh.text = this.parameter.valueString
    }
    this.checkboxMesh.geometry = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      value ? 'checkbox-on' : 'checkbox-off'
    ).geometry
    this.updateVisuals()
  }
  private set hovering(value: boolean) {
    if (this._hovering === value) {
      return
    }
    this._hovering = value
    this.updateVisuals()
  }

  private set isDown(value: boolean) {
    if (this._isDown === value) {
      return
    }
    this._isDown = value
    this.updateVisuals()
  }
  private updateVisuals() {
    this.checkBoxMaterial.paletteRow = this._isDown
      ? PALETTE_ROW.CHECKBOX_DOWN
      : this._hovering
      ? PALETTE_ROW.CHECKBOX_HOVERING
      : 0
  }
}
