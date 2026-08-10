import { style, styleVariants } from '@vanilla-extract/css'

import { ThemeVars } from '~/shared/style/Theme.css'

const ThumbContainerBase = style({
  backgroundColor: ThemeVars.color.purple1,
  height: '18px',
  width: '34px',
  top: '-1px',
  position: 'relative'
})

export const ThumbContainer = styleVariants({
  free: [ThumbContainerBase, { borderTop: `1px solid ${ThemeVars.color.purple8}` }],
  claim: [ThumbContainerBase, { borderTop: `1px solid ${ThemeVars.color.cold5}` }]
})

const ThumbBorderBase = style({
  backgroundColor: ThemeVars.color.purple1,
  width: '100%',
  top: '0px',
  left: '0px',
  position: 'absolute'
})

export const ThumbBorder = styleVariants({
  free: [
    ThumbBorderBase,
    {
      selectors: {
        '&::after': {
          position: 'absolute',
          content: '',
          width: '20%',
          height: '15px',
          right: '-7px',
          top: '2.5px',
          backgroundColor: ThemeVars.color.purple1,
          boxSizing: 'border-box',
          transform: 'skewY(45deg)',
          borderTop: `1.5px solid ${ThemeVars.color.purple8}`,
          borderRight: `1px solid ${ThemeVars.color.purple8}`
        },
        '&:before': {
          position: 'absolute',
          content: '',
          width: '20%',
          height: '15px',
          top: '2.5px',
          backgroundColor: ThemeVars.color.purple1,
          boxSizing: 'border-box',
          left: '-7px',
          transform: 'skewY(-45deg)',
          borderTop: `1.5px solid ${ThemeVars.color.purple8}`,
          borderLeft: `1px solid ${ThemeVars.color.purple8}`
        }
      }
    }
  ],
  claim: [
    ThumbBorderBase,
    {
      selectors: {
        '&::after': {
          position: 'absolute',
          content: '',
          width: '20%',
          height: '15px',
          top: '2.5px',
          backgroundColor: ThemeVars.color.purple1,
          boxSizing: 'border-box',
          right: '-7px',
          transform: 'skewY(45deg)',
          borderTop: `1.5px solid ${ThemeVars.color.cold5}`,
          borderRight: `1px solid ${ThemeVars.color.cold5}`
        },
        '&:before': {
          position: 'absolute',
          content: '',
          width: '20%',
          height: '15px',
          top: '2.5px',
          backgroundColor: ThemeVars.color.purple1,
          boxSizing: 'border-box',
          left: '-7px',
          transform: 'skewY(-45deg)',
          borderTop: `1.5px solid ${ThemeVars.color.cold5}`,
          borderLeft: `1px solid ${ThemeVars.color.cold5}`
        }
      }
    }
  ]
})

export const ThumbOverlay = style({
  width: '48px',
  position: 'absolute',
  height: '32px',
  top: '-14px',
  left: '-7px',
  background:
    'linear-gradient(180deg,rgba(12, 6, 29, 0) 45%,rgba(12, 6, 29, 1) 100%)',
  zIndex: '2'
})
