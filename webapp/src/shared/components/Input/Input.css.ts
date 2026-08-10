import { style } from '@vanilla-extract/css'

import { ThemeVars } from '~/shared/style/Theme.css'

export const InputStyle = style({
  background: `linear-gradient(180deg, #070314 0%, ${ThemeVars.color.purple2} 100%)`,
  padding: '8.5px 8px',
  border: `1px solid ${ThemeVars.color.purple7}`,
  borderRadius: '3px',
  fontStyle: 'normal',
  lineHeight: '1em',
  outline: 'none',
  selectors: {
    '&:focus': {
      outline: `1px solid ${ThemeVars.color.purple9}`
    },
    '&:disabled': {
      cursor: 'not-allowed',
      borderColor: ThemeVars.color.purple6,
      background: ThemeVars.color.purple3
    },
    '&:disabled::placeholder': {
      opacity: 0
    },
    '&::placeholder': {
      color: ThemeVars.color.purple7,
      verticalAlign: 'middle',
      lineHeight: '1em'
    },
    '&.hasLeftIcon': {
      paddingLeft: '32px'
    },
    '&.hasClearButton, &.hasRightIcon': {
      paddingRight: '32px'
    },
    '&.hasRightIcon.hasClearButton': {
      paddingRight: '52px'
    },
    '&.hasError': {
      borderColor: ThemeVars.color.warm4
    },
    '&.hasError:focus': {
      outline: `1px solid ${ThemeVars.color.warm4}`
    }
  }
})

export const LeftIconStyle = style({
  left: '9px',
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)'
})

export const RightIconWrapperStyle = style({
  display: 'grid',
  gridAutoFlow: 'column',
  columnGap: '4px',
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  right: '9px'
})

export const TooltipWrapperStyle = style({
  padding: '8px 16px!important',
  display: 'flex',
  // @ts-ignore
  flexDirection: 'row!important',
  background: ThemeVars.color.warm4,
  borderColor: ThemeVars.color.warm4,
  alignItems: 'center',
  justifyContent: 'flex-start',
  zIndex: 99
})

export const TooltipArrowStyle = style({
  vars: {
    '--tooltipBorder': ThemeVars.color.warm4,
    '--tooltipBackground': ThemeVars.color.warm4
  }
})
