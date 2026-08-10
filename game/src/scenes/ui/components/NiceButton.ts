import { ReadonlyPin } from '~/helpers/LayoutHelpers'
import Mesh2D from '~/meshes/Mesh2D'
import { CursorType } from '~/systems/input/CursorType'
import IInteractive from '~/systems/input/IInteractive'
import * as textOptions from '~/systems/text/TextOptions'
import UITextMesh from '~/systems/text/UITextMesh'
import NiceMethod from '~/utils/NiceMethod'
import { createButtonText } from '~/utils/ui'
import { LABEL_SPACING } from '~/utils/uiSettings'

import Button from './Button'

export default class NiceButton implements IInteractive {
  mesh: Mesh2D
  cursor: CursorType = 'pointer'
  constructor(public parameter: NiceMethod) {
    const button: Button = new Button(() => parameter.onSelect(button, text))
    button.mesh.matrix.setConstraints(
      ReadonlyPin.FullSize,
      ReadonlyPin.Center,
      ReadonlyPin.Center
    )
    const text = createButtonText(
      button.mesh,
      typeof parameter.buttonLabel === 'string'
        ? parameter.buttonLabel
        : parameter.buttonLabel(),
      undefined,
      undefined,
      ReadonlyPin.Center.cloneOffset(0, -1.5)
    )
    if (parameter.label) {
      const labelTextMesh = new UITextMesh(
        typeof parameter.label === 'string'
          ? parameter.label
          : parameter.label(),
        textOptions.sliderLabelText
      )
      labelTextMesh.matrix.setConstraintsPosition(
        ReadonlyPin.Left.cloneOffset(-LABEL_SPACING, 0)
      )
      button.mesh.add(labelTextMesh)
    }
    this.mesh = button.mesh
  }
}
