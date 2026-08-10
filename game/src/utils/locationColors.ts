import { getUrlParam } from '@opensky/shared/utils/location'
import { Color } from 'three'

import { hexColor } from '~/colors/utils'

export function getUrlColor(param: string): Color | null {
  const value = getUrlParam(param)

  return value ? hexColor('#' + value) : null
}
