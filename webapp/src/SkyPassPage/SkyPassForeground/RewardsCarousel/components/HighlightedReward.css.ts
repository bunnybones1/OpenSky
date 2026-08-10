import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

export const HighlightedRewardWrapper = style({
  bottom: '-20px',
  right: '-36px',
  ...responsiveStyle({
    tabletWide: {
      bottom: 0,
      right: 0
    }
  })
})

export const HighlightedRewardContainer = style({
  padding: '10px 8px 27px',
  borderWidth: '2px',
  borderStyle: 'solid',
  borderImage:
    'linear-gradient(to bottom, rgba(255,255,255,0) 10%, rgba(172,143,255,1)) 1 100%',
  background:
    'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(12,6,29,1) 10%, rgba(35,20,69,1) 100%)',
  borderTop: 'none'
})

export const LeftLinesOverlay = style({
  height: '125px',
  width: '125px',
  position: 'absolute',
  bottom: '0',
  left: '-105px',
  cursor: 'pointer',
  background:
    'linear-gradient(238deg, rgba(255, 255, 255, 0) 28%, rgb(12, 6, 30) 68%)',
  transform: 'matrix(-1, 0, 0, 1, 0, 0)',
  pointerEvents: 'none'
})

export const RightArrow = style({
  width: '75px',
  height: '75px',
  zIndex: 3
})
