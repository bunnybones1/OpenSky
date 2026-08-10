import { style } from '@vanilla-extract/css'

import { ThemeVars } from '~/shared/style/Theme.css'

export const VsStructureStyle = style({
  left: '50%',
  transform: 'translateX(-50%)'
})

export const VsStructureLine = style({
  backgroundImage: `linear-gradient(to left, ${ThemeVars.color.purple7}, rgba(112, 91, 171, 0))`,
  height: '1px',
  left: '1px'
})

export const VsStructureRightSide = style({
  marginLeft: '-1px',
  transform: 'scaleX(-1)'
})
