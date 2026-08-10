import {
  getLocalStorageParam,
  setLocalStorageParam
} from '@opensky/shared/utils/localStorage'
import { Color, Vector2 } from 'three'

import { hexColor } from '~/colors/utils'

export function getLocalStorageColor(key: string, defaultColor: Color) {
  const str = getLocalStorageParam(key)
  if (str) {
    const chunks = str.split(';').map(s => parseFloat(s))
    if (chunks.length === 3) {
      return new Color(chunks[0], chunks[1], chunks[2])
    }
    return hexColor('#' + str)
  } else {
    return defaultColor
  }
}

export function setLocalStorageColor(key: string, color: Color) {
  setLocalStorageParam(key, `${color.r};${color.g};${color.b}`)
}

export function getLocalStorageVector2(key: string, defaultV2: Vector2) {
  const str = getLocalStorageParam(key)
  if (str) {
    const chunks = str.split(';').map(s => parseFloat(s))
    return new Vector2(chunks[0], chunks[1])
  } else {
    return defaultV2
  }
}

export function setLocalStorageVector2(key: string, v2: Vector2) {
  setLocalStorageParam(key, `${v2.x};${v2.y}`)
}
