import device from '@opensky/shared/device'
import { Color } from 'three'

import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import RectangleMaterial from '~/materials/RectangleMaterial'
import RectangleMesh from '~/meshes/RectangleMesh'
import { CursorType } from '~/systems/input/CursorType'
import IInteractive from '~/systems/input/IInteractive'
import * as textOptions from '~/systems/text/TextOptions'
import ColliderMesh from '~/utils/ColliderMesh'
import { makeInteractive } from '~/utils/makeInteractive'
import { createButtonText } from '~/utils/ui'

enum ButtonState {
  Normal,
  Hover,
  Click,
  Selected,
  Disabled
}

const buttonStateColors: { [K in ButtonState]: Color } = {
  [ButtonState.Normal]: new Color(0, 0, 0),
  [ButtonState.Hover]: new Color(0.2, 0.1, 0),
  [ButtonState.Click]: new Color(0.2, 0.2, 0.2),
  [ButtonState.Selected]: new Color(0, 0, 0.1),
  [ButtonState.Disabled]: new Color(-0.2, -0.2, -0.2)
}
export default class SimpleButton implements IInteractive {
  mesh: RectangleMesh
  collider: ColliderMesh
  state: ButtonState
  cursor: CursorType = 'pointer'
  private _disabled: boolean = false

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
      this.setState(ButtonState.Normal)
    }
  }
  private _color: Color
  constructor(
    label: string,
    private baseColor: Color,
    private _onSelect: () => void
  ) {
    this._color = baseColor.clone()
    const buttonMesh = new RectangleMesh(new RectangleMaterial({}))
    buttonMesh.matrix.setColor(this._color)
    const pad = 0
    const collider = makeInteractive(
      buttonMesh,
      this,
      Pin.offsetFromParentSize(pad * 2, pad * 2)
    )
    buttonMesh.matrix.setConstraints(
      ReadonlyPin.FullSize.cloneOffset(-10, -10),
      ReadonlyPin.Center,
      ReadonlyPin.Center
    )
    createButtonText(
      buttonMesh,
      label,
      textOptions.buttonTextTopLeft,
      undefined, //tm => {},
      ReadonlyPin.TopLeft.cloneOffset(5, 5)
    )

    this.mesh = buttonMesh
    this.collider = collider
  }

  setState(state: ButtonState) {
    this.state = state
    this._color.copy(this.baseColor).add(buttonStateColors[state])
  }

  onSelect() {
    if (!this.disabled) {
      this.setState(ButtonState.Hover)

      this._onSelect()
    }
  }

  onOver() {
    if (!this.disabled && this.state !== ButtonState.Hover) {
      this.setState(device.isMobile ? ButtonState.Click : ButtonState.Hover)
    }
  }

  onOut() {
    if (!this.disabled && this.state !== ButtonState.Normal) {
      this.setState(ButtonState.Normal)
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
