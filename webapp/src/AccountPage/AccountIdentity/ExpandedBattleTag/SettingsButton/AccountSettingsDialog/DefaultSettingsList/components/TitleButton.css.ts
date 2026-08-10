import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

export const TitleButtonStyle = style({
  height: '50px',
  borderRadius: '4px'
})

export const TitleButtonButtonWrapper = style({
  right: '6px',
  top: '50%',
  transform: 'translateY(-50%)',
  width: '96px',
  ...responsiveStyle({
    tabletWide: {
      width: '104px'
    }
  })
})

export const TitleButtonSkyTag = style({
  width: '127px'
})
