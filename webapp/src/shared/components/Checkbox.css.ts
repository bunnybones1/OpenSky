import { style } from '@vanilla-extract/css'

import { ThemeVars } from '../style/Theme.css'

export const CheckboxWrapperStyle = style({
  userSelect: 'none',
  cursor: 'pointer',
  selectors: {
    '&.isDisabled': {
      cursor: 'not-allowed'
    }
  }
})

export const CheckboxStyle = style({
  width: '20px',
  height: '20px',
  borderRadius: '2px',
  borderStyle: 'solid',
  borderWidth: '1px',
  borderColor: ThemeVars.color.purple8,
  background: `linear-gradient(180deg, ${ThemeVars.color.black} 0%, #261747 100%)`,
  transition: 'all 0.2s ease-out',
  boxShadow: `0px 0px 5px 1px ${ThemeVars.color.black}`,
  selectors: {
    '&.isRounded': {
      borderRadius: '50%'
    },
    '&.isDisabled': {
      borderColor: ThemeVars.color.purple6
    },
    '&.isActive:not(.isDisabled)': {
      borderColor: ThemeVars.color.purple9,
      background: ThemeVars.color.purple10,
      boxShadow: `0px 0px 10px ${ThemeVars.color.purple10}`
    },
    '&.isActive.isBlue:not(.isDisabled)': {
      borderColor: ThemeVars.color.cold7,
      background: ThemeVars.color.cold10,
      boxShadow: `0px 0px 10px ${ThemeVars.color.cold3}`
    },
    [`${CheckboxWrapperStyle}:hover:not(.isDisabled) &`]: {
      borderColor: ThemeVars.color.white
    }
  }
})

export const RoundedCheckmark = style({
  height: '8px',
  width: '8px',
  borderRadius: '50%',
  backgroundColor: ThemeVars.color.white,
  selectors: {
    '&.isDisabled': {
      backgroundColor: ThemeVars.color.purple6
    }
  }
})
