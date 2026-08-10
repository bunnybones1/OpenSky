import { style } from '@vanilla-extract/css'

import { TOP_OFFSET_KEY } from '~/shared/style/constants'

export const HeightOneHundredVhMinusOffset = style({
  height: `calc(100vh - var(${TOP_OFFSET_KEY}))`
})
