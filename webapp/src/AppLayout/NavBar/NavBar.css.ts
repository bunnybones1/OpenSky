import { style } from '@vanilla-extract/css'

import { NAVBAR_HEIGHT, NAVBAR_WIDTH } from '~/shared/constants/ui'

export const NavBarStyle = style({
  width: `${NAVBAR_WIDTH}px`,
  height: '100%',
  zIndex: 18,
  top: 'unset',
  bottom: '0px',
  selectors: {
    '&.isHorizontal': {
      height: `${NAVBAR_HEIGHT}px`,
      width: '100%',
      top: 'env(safe-area-inset-top, 0px)',
      bottom: 'unset'
    }
  }
})
