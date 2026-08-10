import { style, styleVariants } from '@vanilla-extract/css'

import { ThemeVars } from '~/shared/style/Theme.css'

export const SelectOptionStyle = style({
  height: '32px',
  width: '100%',
  padding: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  flexWrap: 'nowrap',
  cursor: 'pointer',
  position: 'relative',
  borderBottomWidth: '1px',
  borderBottomStyle: 'solid',
  transition: 'all 0.2s ease-in'
})

export const SelectOptionColorVariants = styleVariants({
  default: {
    backgroundColor: ThemeVars.color.purple3,
    borderBottom: `1px solid ${ThemeVars.color.purple5}`,
    selectors: {
      '&:hover': {
        backgroundColor: ThemeVars.color.purple5
      },
      '&.isActive': {
        backgroundColor: ThemeVars.color.purple7,
        borderColor: ThemeVars.color.purple9
      }
    }
  },
  secondary: {
    backgroundColor: ThemeVars.color.purple4,
    borderBottom: `1px solid ${ThemeVars.color.purple6}`,
    selectors: {
      '&:hover': {
        backgroundColor: ThemeVars.color.purple6
      },
      '&.isActive': {
        backgroundColor: ThemeVars.color.purple8,
        borderColor: ThemeVars.color.purple9
      }
    }
  },
  blue: {
    backgroundColor: ThemeVars.color.cold3,
    borderBottom: `1px solid ${ThemeVars.color.cold5}`,
    selectors: {
      '&:hover': {
        backgroundColor: ThemeVars.color.cold5
      },
      '&.isActive': {
        backgroundColor: ThemeVars.color.cold6,
        borderColor: ThemeVars.color.cold7
      }
    }
  },
  green: {
    backgroundColor: ThemeVars.color.forest3,
    borderBottom: `1px solid ${ThemeVars.color.forest4}`,
    selectors: {
      '&:hover': {
        backgroundColor: ThemeVars.color.forest4
      },
      '&.isActive': {
        backgroundColor: ThemeVars.color.forest5,
        borderColor: ThemeVars.color.forest7
      }
    }
  },
  orange: {
    backgroundColor: ThemeVars.color.warm4,
    borderBottom: `1px solid ${ThemeVars.color.warm5}`,
    selectors: {
      '&:hover': {
        backgroundColor: ThemeVars.color.warm5
      },
      '&.isActive': {
        backgroundColor: ThemeVars.color.warm6,
        borderColor: ThemeVars.color.warm7
      }
    }
  },
  red: {
    backgroundColor: ThemeVars.color.pink3,
    borderBottom: `1px solid ${ThemeVars.color.pink5}`,
    selectors: {
      '&:hover': {
        backgroundColor: ThemeVars.color.pink5
      },
      '&.isActive': {
        backgroundColor: ThemeVars.color.pink6,
        borderColor: ThemeVars.color.pink7
      }
    }
  }
})
