import { uiScale } from '@opensky/shared/userSettings'
import { clamp01 } from '@opensky/shared/utils/math'
import NiceFloatParameter from '@opensky/shared/utils/NiceFloatParameter'
import { Vector2 } from 'three'

import { getAssetsManager } from '~/assets/index'
import { PaletteMesh2D } from '~/assets/MeshTypes'
import { COLOR_SLIDER_INNER_LILAC } from '~/colors/colorLibrary'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import Matrix2DUI from '~/meshes/Matrix2DUI'
import { CursorType } from '~/systems/input/CursorType'
import IInteractive from '~/systems/input/IInteractive'
import input from '~/systems/input/input'
import inputProvider from '~/systems/input/input'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import { makeInteractive } from '~/utils/makeInteractive'
import { createButton, createButtonText } from '~/utils/ui'
import { LABEL_SPACING } from '~/utils/uiSettings'

export default class Slider implements IInteractive {
  static anyInteracting = false
  static lastKnownStableWorldMatrix = new Matrix2DUI()
  static lastKnownStableUIScale = 1
  static lastKnownX = 0
  mesh: PaletteMesh2D
  cursor: CursorType = 'col-resize'

  constructor(public parameter: NiceFloatParameter) {
    const backgroundMesh = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'rectangle',
      true
    )
    backgroundMesh.material.paletteRow = 0

    const innerBarMesh = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'rectangle',
      true
    )
    innerBarMesh.matrix.setColor(COLOR_SLIDER_INNER_LILAC)

    const pin = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'rectangle-rounded-exterior',
      true
    )
    for (const b of ['-', '+']) {
      let onIncrementHoldTimeout: NodeJS.Timeout
      const button = createButton(
        backgroundMesh,
        () => {
          const newVal = clamp01(
            this.parameter.distributedNormalizedValue +
              (b === '-' ? -parameter.increments : parameter.increments)
          )
          this.parameter.distributedNormalizedValue = newVal
        },
        new Pin(0, 0, 28, 28),
        ReadonlyPin.Center,
        b === '-'
          ? ReadonlyPin.Left.cloneOffset(-25, 0)
          : ReadonlyPin.Right.cloneOffset(25, 0),
        () => {
          onIncrementHoldTimeout = setInterval(() => {
            const newVal = clamp01(
              this.parameter.distributedNormalizedValue +
                (b === '-' ? -0.01 : 0.01)
            )
            this.parameter.distributedNormalizedValue = newVal
          }, 100)
        },
        () => {
          clearInterval(onIncrementHoldTimeout)
        },
        'button-diagonal'
      )
      const buttonText = createButtonText(button.mesh, b, {
        ...textOptions.optionsButtonText,
        size: 28
      })
      buttonText.matrix.offset.y.offset -= 3
    }
    const pinOffset = ReadonlyPin.Left.cloneOffset(0, 0)
    pin.matrix.setConstraints(
      new Pin(0, 0, 3, 20),
      ReadonlyPin.Center,
      pinOffset,
      new Vector2(2, 2)
    )
    const innerSize = new Pin(0, 1)
    innerBarMesh.matrix.setConstraints(
      innerSize,
      ReadonlyPin.TopLeft,
      ReadonlyPin.TopLeft
    )

    const labelTextMesh = new UITextMesh(
      typeof parameter.label === 'string' ? parameter.label : parameter.label(),
      textOptions.sliderLabelText
    )
    labelTextMesh.matrix.setConstraintsPosition(
      ReadonlyPin.Left.cloneOffset(-LABEL_SPACING - 165, -4)
    )
    const valueTextMesh = new UITextMesh(
      parameter.valueString,
      textOptions.sliderValueText
    )
    valueTextMesh.matrix.setConstraintsPosition(
      ReadonlyPin.Right.cloneOffset(LABEL_SPACING, 0)
    )

    makeInteractive(backgroundMesh, this)

    backgroundMesh.add(innerBarMesh)
    backgroundMesh.add(labelTextMesh)
    backgroundMesh.add(valueTextMesh)
    backgroundMesh.add(pin)
    this.mesh = backgroundMesh

    parameter.listen(() => {
      const scale = this.parameter.distributedNormalizedValue
      innerSize.x.scale = scale * 0.94 + 0.06
      pinOffset.x.scale = scale * 0.94 + 0.06
      valueTextMesh.text = this.parameter.valueString
    })
    input.onPressEnd.addListener(() => this.onPressEnd())
  }

  onPressEnd() {
    Slider.anyInteracting = false
    inputProvider.onDrag.removeListener(this.onDragMove)
  }

  onDown(x: number) {
    Slider.anyInteracting = true
    Slider.lastKnownStableWorldMatrix.copy(this.mesh.matrixWorld)
    Slider.lastKnownStableUIScale = uiScale.value
    Slider.lastKnownX = x
    this._updateValue(x)
    inputProvider.onDrag.addListener(this.onDragMove)
  }

  private onDragMove = (x: number) => {
    this._updateValue(x)
  }

  private _updateValue(x: number) {
    const mEls = Slider.lastKnownStableWorldMatrix.elements //remember these values are in clip space (-1.0 to 1.0)
    const localX =
      ((x / Slider.lastKnownStableUIScale) * mEls[7]) / mEls[0] -
      (mEls[2] * 0.5 + 0.5) / (mEls[0] * 0.5)
    this.parameter.distributedNormalizedValue = clamp01(localX)
  }
}
