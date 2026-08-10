import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

export const SharedPlayPageStyle = style({
  height: '94vh',
  maxHeight: '708px',
  minHeight: '300px',
  ...responsiveStyle({
    tabletWide: {
      height: 'calc(94vh + 8px)'
    },
    desktop: {
      paddingBottom: '20px',
      minHeight: '408px',
      height: '708px'
    }
  })
})

export const SharedPlayPageBottomStyle = style({
  bottom: '30px',
  gridTemplateColumns: '2fr 148px',
  columnGap: '8px',
  ...responsiveStyle({
    tablet: { gridTemplateColumns: '3fr 148px' },
    tabletWide: { gridTemplateColumns: '4fr 1fr' }
  })
})

export const SharedProgressBarGradient = style({
  height: '16px',
  background: `linear-gradient(
    270deg,
    rgba(23, 13, 48, 0) 0%,
    rgba(23, 13, 48, 0) 98%,
    rgb(12, 6, 30) 100%
  )`,
  selectors: {
    '&.isRight': {
      background: `linear-gradient(
        90deg,
        rgba(23, 13, 48, 0) 0%,
        rgba(23, 13, 48, 0) 75%,
        #0c061e 95%
      )`
    },
    '&.isSmall': {
      height: '6px'
    }
  }
})

export const SharedProgressBarBorder = style({
  height: '16px'
})

export const SharedProgressBarRewardWrapper = style({
  width: '95px'
})

export const SharedProgressBarRewardInner = style({
  top: '-7px',
  minHeight: '25px'
})

export const SharedProgressBarRewardGlow = style({
  width: '80px',
  height: '80px',
  left: '6px'
})

export const SharedProgressBarRewardText = style({
  top: '-24px',
  selectors: {
    '&.isBottom': {
      top: '36px'
    }
  }
})

export const SharedPlayButtonStyle = style({
  maxWidth: '200px',
  ...responsiveStyle({
    tabletWide: {
      maxWidth: '276px'
    }
  })
})

export const SharedButtonSectionStyle = style({
  rowGap: '16px'
})
