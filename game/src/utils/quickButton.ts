import { Object3D } from 'three'

import { BUTTON_HEIGHT } from '~/constants'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'

import { createButton, createButtonText } from './ui'

export function makeQuickButtonColumn(
  parent: Object3D,
  bds: QuickButtonData[],
  pin: Pin = ReadonlyPin.Center,
  pin2?: Pin,
  buttonSpacing: number = 24,
  buttonWidth: number = 100
) {
  const recenter =
    pin.y.scale *
    (bds.length * BUTTON_HEIGHT + (bds.length - 1) * buttonSpacing)
  // void recenter
  return bds.map((bd, i) => {
    const p = (pin2 || pin).cloneOffset(
      0,
      (BUTTON_HEIGHT + buttonSpacing) * i - recenter
    )
    const button = createButton(
      parent,
      bd.onSelect,
      Pin.fromPixels(buttonWidth, BUTTON_HEIGHT),
      pin,
      p
    )
    createButtonText(button.mesh, bd.label)
    return button
  })
}

export class QuickButtonData {
  constructor(
    public label: string,
    public onSelect: () => void,
    public onHoldStart?: () => void,
    public onHoldEnd?: () => void
  ) {
    //
  }
}
