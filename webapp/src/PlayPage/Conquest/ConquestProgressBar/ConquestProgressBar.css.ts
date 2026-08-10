import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

export const ConquestProgressBarStyle = style({
  minWidth: '200px',
  gap: '8px',
  gridTemplateColumns: '60px 1fr 60px',
  ...responsiveStyle({
    tabletWide: {
      gridTemplateColumns: '100px 1fr 100px'
    }
  })
})

export const ConquestProgressBarInfoWrapper = style({
  top: '-24px'
})

export const ConquestProgressBarBar = style({
  height: '6px',
  bottom: '3px',
  left: '-2px'
})

export const ConquestProgressBarInner = style({
  width: 'calc(100% - 4px)',
  bottom: '2px',
  left: '2px',
  backgroundColor: '#4D092E'
})

export const ConquestProgressBarRedBar = style({
  left: '2px',
  backgroundColor: '#EA343B',
  bottom: '2px'
})

export const ConquestProgressBarTick = style({
  height: '10px',
  top: '-4px',
  width: '2px'
})

export const ConquestProgressBarLevel10Grid = style({
  gap: '8px',
  minWidth: '200px',
  gridTemplateColumns: '60px 1fr',
  ...responsiveStyle({
    tabletWide: {
      gridTemplateColumns: '100px 1fr'
    }
  })
})
