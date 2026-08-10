import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

export const ActiveConquestProgressChecksStyle = style({
  bottom: '100px',
  right: '12px',
  width: '148px',
  height: '34px',
  ...responsiveStyle({
    tablet: {
      right: '205px'
    },
    tabletWide: {
      height: '50px',
      width: '276px',
      right: '22px',
      bottom: '132px'
    }
  })
})

export const ActiveConquestProgressChecksLine = style({
  background: `linear-gradient(
    90deg,
    rgba(112, 91, 171, 0) 0%,
    rgba(112, 91, 171, 1) 15.42%,
    rgba(112, 91, 171, 1) 75.94%,
    rgba(112, 91, 171, 0) 100%
  )`,
  top: '50%',
  transform: 'translateY(-50%)',
  height: '12px',
  ...responsiveStyle({
    tabletWide: {
      height: '18px'
    }
  })
})

export const ActiveConquestProgressChecksGradient = style({
  height: '10px',
  background: `linear-gradient(
    90deg,
    rgba(23, 13, 48, 0) 0%,
    #170d30 10.42%,
    #170d30 85.94%,
    rgba(23, 13, 48, 0) 100%
  )`,
  top: '50%',
  transform: 'translateY(-50%)',
  filter: 'drop-shadow(0px 4px 4px rgba(0, 0, 0, 0.25))',
  ...responsiveStyle({
    tabletWide: {
      height: '16px'
    }
  })
})

export const ActiveConquestProgressChecksGrid = style({
  gridTemplateColumns: '32px 32px 32px',
  columnGap: '12px',
  ...responsiveStyle({
    tabletWide: {
      columnGap: '16px',
      gridTemplateColumns: '48px 48px 48px'
    }
  })
})
