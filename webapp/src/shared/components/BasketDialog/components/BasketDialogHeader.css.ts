import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

export const BasketDialogHeaderStyle = style({
  height: '40px',
  background: 'linear-gradient(180deg, #000 0%, rgba(0, 0, 0, 0.00) 78.13%), #170D30'
})

export const HeaderLeftSide = style({
  height: '42px'
})

export const BackButtonWrapper = style({
  width: '72px',
  zIndex: 6,
  ...responsiveStyle({
    tabletWide: {
      width: '92px'
    }
  })
})

export const HeaderText = style({
  paddingLeft: '0px'
})
