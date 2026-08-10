import { style } from '@vanilla-extract/css'

import { TOP_OFFSET_KEY } from '~/shared/style/constants'

export const CacheInfoPageStyle = style({
  paddingTop: `var(${TOP_OFFSET_KEY})`
})
