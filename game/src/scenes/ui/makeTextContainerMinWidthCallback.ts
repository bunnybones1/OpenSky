import { BUTTON_PADDING, END_TURN_BUTTON_WIDTH } from '~/constants'
import { Pin } from '~/helpers/LayoutHelpers'
import TextMesh from '~/systems/text/TextMesh'

export function makeTextContainerMinWidthCallback(
  sizePin: Pin,
  padding: number = BUTTON_PADDING,
  minWidth = END_TURN_BUTTON_WIDTH
) {
  return (textMesh: TextMesh) => {
    sizePin.x.offset = Math.max(textMesh.width + padding, minWidth)
  }
}
