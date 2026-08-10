import { keyframes, style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

const DropIn = keyframes({
  '0%': {
    opacity: 0,
    transform: 'translateY(-100%)'
  },
  '100%': {
    opacity: 1,
    transform: 'translateY(0%)'
  }
})

export const GameModeDialogClassName = style({
  selectors: {
    '&:modal': {
      top: '0px',
      left: '0px',
      maxWidth: 'unset',
      borderWidth: '0px',
      transform: 'none',
      animation: `${DropIn} 0.3s ease-in-out 1!important`
    }
  }
})

export const GameModeHeaderButtonWrapper = style({
  width: '125px',
  ...responsiveStyle({
    tabletWide: {
      width: '160px'
    }
  })
})
