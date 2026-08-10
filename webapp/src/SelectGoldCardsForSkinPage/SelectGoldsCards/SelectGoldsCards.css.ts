import { style } from '@vanilla-extract/css'

import { NAVBAR_HEIGHT } from '~/shared/constants/ui'
import { responsiveStyle } from '~/shared/style/Theme'

export const SelectGoldsCardsWrapper = style({
  height: 'auto',
  minHeight: '100vh',
  ...responsiveStyle({
    tabletWide: {
      minHeight: `calc(100vh - ${NAVBAR_HEIGHT}px)`
    }
  })
})
