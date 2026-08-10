import {
  BUTTON_MARGINS,
  END_TURN_BUTTON_HEIGHT,
  PALETTE_ROW
} from '~/constants'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import Object2D from '~/meshes/Object2D'
import * as textOptions from '~/systems/text/TextOptions'
import { createButton, createButtonText } from '~/utils/ui'

import { DraftStatePlayer } from './DraftState'

export class DraftLookingAtUIElements extends Object2D {
  private buttonCursor = -BUTTON_MARGINS
  constructor(player: DraftStatePlayer) {
    super()
    const closeButton = this.makeButton(
      () => (player.lookingAt = 'none'),
      'x',
      50
    )
    closeButton.basePaletteRow = PALETTE_ROW.RED
  }
  protected makeButton(cb: () => void, label: string, width: number) {
    const button = createButton(
      this,
      cb,
      Pin.fromPixels(width, END_TURN_BUTTON_HEIGHT),
      ReadonlyPin.TopRight,
      ReadonlyPin.TopRight.cloneOffset(this.buttonCursor, BUTTON_MARGINS),
      undefined,
      undefined,
      undefined,
      true
    )
    this.buttonCursor -= width + BUTTON_MARGINS
    createButtonText(button.mesh, label, textOptions.buttonText)
    return button
  }
}
