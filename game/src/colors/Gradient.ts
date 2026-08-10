import { FindByTag } from '@skyweaver/state-metadata'
import { Color } from 'three'

import { ColorParameter } from './types'
import { toColor } from './utils'

export interface GradientOptions {
  topLeft?: ColorParameter
  topRight?: ColorParameter
  bottomLeft?: ColorParameter
  bottomRight?: ColorParameter
  top?: ColorParameter
  bottom?: ColorParameter
  left?: ColorParameter
  right?: ColorParameter
}

export default class Gradient {
  topLeft: Color
  topRight: Color
  bottomLeft: Color
  bottomRight: Color

  constructor(options: GradientOptions) {
    Object.keys(options).forEach(
      (key: FindByTag<keyof GradientOptions, string>) => {
        const option = options[key]
        if (option) {
          const color = toColor(option)
          this[key] = color
        }
      }
    )
  }

  set top(value: ColorParameter) {
    this.topLeft = toColor(value)
    this.topRight = toColor(value)
  }

  set bottom(value: ColorParameter) {
    this.bottomLeft = toColor(value)
    this.bottomRight = toColor(value)
  }

  set left(value: ColorParameter) {
    this.topLeft = toColor(value)
    this.bottomLeft = toColor(value)
  }

  set right(value: ColorParameter) {
    this.topRight = toColor(value)
    this.bottomRight = toColor(value)
  }
}
