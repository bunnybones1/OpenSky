import { getUrlInt } from '@opensky/shared/utils/location'

export const bezierAnimTestParams = {
  repeats: getUrlInt('bezierRepeats', 1, 1, 200),
  repeatNth: getUrlInt('bezierRepeatNth', 0, 0, 200)
}
