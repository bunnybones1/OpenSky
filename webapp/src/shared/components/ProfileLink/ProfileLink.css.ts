import { style } from '@vanilla-extract/css'

import { NAVBAR_HEIGHT } from '~/shared/constants/ui'

export const ProfileLinkStyle = style({
  maxWidth: '562px',
  height: `${NAVBAR_HEIGHT}px`,
  paddingLeft: '30px',
  paddingRight: '30px'
})

export const RightFrame = style({
  transform: 'scaleX(-1)'
})

export const ProfileLinkHighlight = style({
  bottom: '4px',
  left: '50%',
  transform: 'translateX(-50%)',
  width: '57%',
  transition: 'opacity 0.2s ease-out',
  '@media': {
    '(hover)': {
      selectors: {
        [`${ProfileLinkStyle}:hover &`]: {
          opacity: 1
        }
      }
    }
  },
  selectors: {
    '&.isActive': {
      opacity: 1
    }
  }
})
