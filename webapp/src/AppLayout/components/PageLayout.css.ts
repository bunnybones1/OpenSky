import { style } from '@vanilla-extract/css'

import { TOP_OFFSET_KEY } from '~/shared/style/constants'

export const PageLayoutStyle = style({
  paddingTop: `var(${TOP_OFFSET_KEY})`,
  selectors: {
    '&.hidePadding': {
      paddingTop: '0px'
    }
  }
})
