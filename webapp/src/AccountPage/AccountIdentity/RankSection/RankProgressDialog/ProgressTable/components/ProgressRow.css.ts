import { style } from '@vanilla-extract/css'

export const ProgressRowStyle = style({
  height: '54px',
  gridTemplateColumns: '2fr 1fr 1.1fr 1.1fr 1.1fr 1.1fr'
})

export const ProgressRowRankIcon = style({
  height: '50px'
})

export const ProgressRowPointsRequired = style({
  top: '-10px',
  left: '50%',
  transform: 'translateX(-50%)'
})

export const PointsRequiredText = style({ whiteSpace: 'nowrap' })
