import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '../style/Theme'

export const SeasonSelectStyle = style({
  width: '148px'
})

export const SeasonSelectOptions = style({
  height: '128px',
  overflow: 'auto',
  ...responsiveStyle({
    tabletWide: {
      height: 'auto',
      overflow: 'visible'
    }
  })
})
