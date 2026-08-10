import { style } from '@vanilla-extract/css'

export const DeckCurveGraph = style({
  gridTemplateColumns: 'repeat(11, 1fr)',
  gridAutoFlow: 'column',
  height: '68px'
})

export const GraphSeperator = style({
  height: '1px'
})

export const TotalBarStyle = style({
  width: '6px'
})

export const BarStyle = style({
  transition: '0.2s ease-in'
})
