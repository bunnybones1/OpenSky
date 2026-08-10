import { ButtonShape } from '~/helpers/buttonTypeHelpers'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import { InputMethod } from '~/systems/input/IInteractive'

import { ButtonHighlightStyle } from './BaseButton'
import Button from './Button'

export default class PinnedButton extends Button {
  constructor(
    onSelect: () => void,
    public size: Pin = ReadonlyPin.FullSize,
    public anchor: Pin = ReadonlyPin.Center,
    public offset: Pin = ReadonlyPin.Center,
    public onHoldStart?: InputMethod,
    public onHoldEnd?: InputMethod,
    shape?: ButtonShape,
    useFancyHighlight?: boolean,
    hasTurnTimer = false,
    buttonHighlightStyle: ButtonHighlightStyle = 'buttonBasic'
  ) {
    super(
      onSelect,
      undefined,
      shape,
      useFancyHighlight,
      hasTurnTimer,
      buttonHighlightStyle
    )
    this.mesh.matrix.setConstraints(size, anchor, offset)
  }
}
