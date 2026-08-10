import { distributions } from '@opensky/shared/utils/distributions'
import NiceFloatParameter from '@opensky/shared/utils/NiceFloatParameter'
import { Color } from 'three'

import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import RectangleMaterial from '~/materials/RectangleMaterial'
import Object2D from '~/meshes/Object2D'
import RectangleMesh from '~/meshes/RectangleMesh'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'

const LABEL_SPACING = 5
function makeNiceFloat(total: number) {
  return new NiceFloatParameter(
    'test-low',
    'test',
    0,
    0,
    total,
    distributions.linear,
    v => v + '',
    'never',
    false,
    0.0001,
    0,
    false
  )
}

export default class NumberRangeDisplayBar {
  mesh: Object2D
  parameterLow: NiceFloatParameter
  parameterHigh: NiceFloatParameter
  set max(val: number) {
    this.parameterLow.max = val
    this.parameterHigh.max = val
  }
  constructor(total: number, label?: string) {
    this.mesh = new Object2D()
    const parameterLow = makeNiceFloat(total)
    const parameterHigh = makeNiceFloat(total)

    const backgroundMesh = new RectangleMesh(new RectangleMaterial({}))
    backgroundMesh.matrix.setColor(new Color(0x000000), 0.5)
    this.mesh.add(backgroundMesh)
    const sliderColor = new Color(0x00ffff)
    const innerBarMesh = new RectangleMesh(new RectangleMaterial({}))
    innerBarMesh.matrix.setColor(sliderColor, 0.9)
    const innerSize = new Pin(0, 1, -2, -2)
    const innerOffset = ReadonlyPin.TopLeft.cloneOffset(1, 1)
    innerBarMesh.matrix.setConstraints(
      innerSize,
      ReadonlyPin.TopLeft,
      innerOffset
    )

    const innerWrappedBarMesh = new RectangleMesh(new RectangleMaterial({}))
    innerWrappedBarMesh.matrix.setColor(sliderColor, 0.9)
    const innerWrappedSize = new Pin(0, 1, -2, -2)
    const innerWrappedOffset = ReadonlyPin.TopLeft.cloneOffset(1, 1)
    innerWrappedBarMesh.matrix.setConstraints(
      innerWrappedSize,
      ReadonlyPin.TopLeft,
      innerWrappedOffset
    )
    innerWrappedBarMesh.visible = false

    if (label) {
      const labelTextMesh = new UITextMesh(label, {
        ...textOptions.sliderLabelText,
        align: 'center'
      })
      labelTextMesh.matrix.setConstraintsPosition(ReadonlyPin.Center)
      this.mesh.add(labelTextMesh)
    }
    const labelTextMeshLow = new UITextMesh(
      parameterLow.valueString,
      textOptions.sliderLabelText
    )
    labelTextMeshLow.matrix.setConstraintsPosition(
      ReadonlyPin.Left.cloneOffset(-LABEL_SPACING, 0)
    )

    const labelTextMeshHigh = new UITextMesh(
      parameterHigh.valueString,
      textOptions.sliderValueText
    )
    labelTextMeshHigh.matrix.setConstraintsPosition(
      ReadonlyPin.Right.cloneOffset(LABEL_SPACING, 0)
    )
    this.mesh.add(innerBarMesh)
    this.mesh.add(innerWrappedBarMesh)
    this.mesh.add(labelTextMeshLow)
    this.mesh.add(labelTextMeshHigh)
    this.parameterLow = parameterLow
    this.parameterHigh = parameterHigh

    function updateBar() {
      const low = parameterLow.normalizedValue
      const high = parameterHigh.normalizedValue
      if (high < low) {
        innerOffset.x.scale = low
        innerSize.x.scale = 1 - low

        innerWrappedSize.x.scale = high
        innerWrappedBarMesh.visible = true
      } else {
        const scale = high - low
        sliderColor.setHSL(0.33 - scale / 3, 1.0, 0.5)

        innerBarMesh.matrix.setColor(sliderColor)
        innerWrappedBarMesh.matrix.setColor(sliderColor)

        innerOffset.x.scale = low
        innerSize.x.scale = scale
        innerWrappedBarMesh.visible = false
      }
    }

    parameterLow.listen(() => {
      labelTextMeshLow.text = parameterLow.valueString
      updateBar()
    })

    parameterHigh.listen(() => {
      labelTextMeshHigh.text = parameterHigh.valueString
      updateBar()
    })
  }
}
