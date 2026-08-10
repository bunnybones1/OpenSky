import {
  COLOR_BUFFED_TEXT,
  COLOR_DYNAMIC_COST_TEXT,
  COLOR_NERFED_TEXT
} from '~/colors/colorLibrary'
import Gradient from '~/colors/Gradient'

import TextMesh from './TextMesh'

export type TextMeshEffect = (textMesh: TextMesh, value: string) => void

export function makeAttackHealthNumberEffect(
  originalValue: number | undefined
): TextMeshEffect {
  return (textMesh: TextMesh, value: string) => {
    const num = +value
    if (num < 0) {
      textMesh.color = COLOR_NERFED_TEXT
    }
    if (originalValue === undefined) {
      return
    }
    if (num > originalValue) {
      textMesh.color = COLOR_BUFFED_TEXT
    } else if (num < originalValue) {
      textMesh.color = COLOR_NERFED_TEXT
    } else if (!(textMesh.options.color instanceof Gradient)) {
      textMesh.color = textMesh.options.color
    }
  }
}

export function makeCostNumberEffect(
  originalValue: number | string
): TextMeshEffect {
  return (textMesh: TextMesh, value: string) => {
    const num = +value

    if (originalValue === 'X') {
      textMesh.color = COLOR_DYNAMIC_COST_TEXT
    } else if (num < +originalValue) {
      textMesh.color = COLOR_BUFFED_TEXT
    } else if (num > +originalValue) {
      textMesh.color = COLOR_NERFED_TEXT
    } else if (!(textMesh.options.color instanceof Gradient)) {
      textMesh.color = textMesh.options.color
    }
  }
}

export function makeCostNumberShadowEffect(
  originalValue: number | string
): TextMeshEffect {
  return (textMesh: TextMesh, value: string) => {
    const num = +value

    let needsOutline = false
    if (originalValue === 'X') {
      needsOutline = true
    } else if (num < +originalValue) {
      needsOutline = true
    } else if (num > +originalValue) {
      needsOutline = true
    }
    textMesh.material.visible = needsOutline
  }
}

export function makeNullEffect() {
  return undefined
}
