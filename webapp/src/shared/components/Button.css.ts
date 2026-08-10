import { createVar, style, styleVariants } from '@vanilla-extract/css'
import { recipe } from '@vanilla-extract/recipes'
import { mapValues, merge } from 'lodash-es'

import {
  backgroundColorVar,
  borderColorVar,
  filterVar
} from '~/shared/style/SharedButtonStyles.css'

import { ThemeVars } from '../style/Theme.css'

// Button Border
export const BUTTON_BORDER_TYPES = [
  'default',
  'defaultFlipped',
  'leftCorner',
  'rightCorner',
  'rounded',
  'roundedRight',
  'rightTopCorner',
  'roundedLeft',
  'square'
] as const

export type ButtonBorderTypes = (typeof BUTTON_BORDER_TYPES)[number]

export const borderSizeVar = createVar()
export const cornerSizeVar = createVar()

const INNER_CLIP_PATHS: {
  [key in Extract<
    ButtonBorderTypes,
    'default' | 'leftCorner' | 'rightCorner' | 'rightTopCorner' | 'defaultFlipped'
  >]: string
} = {
  default: `polygon(
    ${borderSizeVar} ${borderSizeVar},
    calc(100% - calc(${cornerSizeVar} + ${borderSizeVar} * 0.5)) ${borderSizeVar},
    calc(100% - ${borderSizeVar}) calc(${cornerSizeVar} + ${borderSizeVar} * 0.5),
    calc(100% - ${borderSizeVar}) calc(100% - ${borderSizeVar}),
    calc(${cornerSizeVar} + ${borderSizeVar} * 0.5) calc(100% - ${borderSizeVar}),
    ${borderSizeVar} calc(100% - calc(${cornerSizeVar} + ${borderSizeVar} * 0.5))
  )`,
  rightTopCorner: `polygon(
    ${borderSizeVar} ${borderSizeVar},
    calc(100% - calc(${cornerSizeVar} + ${borderSizeVar} * 0.5)) ${borderSizeVar},
    calc(100% - ${borderSizeVar}) calc(${cornerSizeVar} + ${borderSizeVar} * 0.5),
    calc(100% - ${borderSizeVar}) calc(100% - ${borderSizeVar}),
    calc(${cornerSizeVar} + ${borderSizeVar} * 0.5) calc(100% - ${borderSizeVar}),
    ${borderSizeVar} calc(100% - ${borderSizeVar})
  )`,
  defaultFlipped: `polygon(
    calc(0% + (${cornerSizeVar} + ${borderSizeVar} * 0.5)) ${borderSizeVar},
    calc(100% - ${borderSizeVar}) ${borderSizeVar},
    calc(100% - ${borderSizeVar}) calc(100% - ${cornerSizeVar}),
    calc(100% - (${cornerSizeVar} + ${borderSizeVar} * 0.5)) calc(100% - ${borderSizeVar}),
    ${borderSizeVar} calc(100% - ${borderSizeVar}),
    ${borderSizeVar} calc(0% + (${cornerSizeVar} + ${borderSizeVar} * 0.5))
  )`,
  rightCorner: `polygon(
    ${borderSizeVar} ${borderSizeVar},
    calc(100% - ${borderSizeVar}) ${borderSizeVar},
    calc(100% - ${borderSizeVar}) calc(${cornerSizeVar} + ${borderSizeVar} * 0.5),
    calc(100% - ${borderSizeVar}) calc(100% - ${borderSizeVar}),
    calc(${cornerSizeVar} + ${borderSizeVar} * 0.5) calc(100% - ${borderSizeVar}),
    ${borderSizeVar} calc(100% - calc(${cornerSizeVar} + ${borderSizeVar} * 0.5))
  )`,
  leftCorner: `polygon(
    ${borderSizeVar} ${borderSizeVar},
    calc(100% - ${borderSizeVar}) ${borderSizeVar},
    calc(100% - ${borderSizeVar}) calc(100% - calc(${cornerSizeVar} + ${borderSizeVar} * 0.5)),
    calc(100% - calc(${cornerSizeVar} + ${borderSizeVar} * 0.5)) calc(100% - ${borderSizeVar}),
    ${borderSizeVar} calc(100% - ${borderSizeVar})
  )`
}

const OUTER_CLIP_PATHS: {
  [key in Extract<
    ButtonBorderTypes,
    'default' | 'leftCorner' | 'rightCorner' | 'rightTopCorner' | 'defaultFlipped'
  >]: string
} = {
  default: `polygon(
    0 0,
    calc(100% - ${cornerSizeVar}) 0,
    100% ${cornerSizeVar},
    100% 100%,
    ${cornerSizeVar} 100%,
    0 calc(100% - ${cornerSizeVar})
  )`,
  defaultFlipped: `polygon(
    calc(0% + ${cornerSizeVar}) 0,
    100% 0,
    100% calc(100% - ${cornerSizeVar}),
    calc(100% - ${cornerSizeVar}) 100%,
    0 100%,
    0 calc(0% + ${cornerSizeVar})
  )`,
  rightCorner: `polygon(
    0 0,
    100% 0,
    100% 100%,
    ${cornerSizeVar} 100%,
    0 calc(100% - ${cornerSizeVar})
  )`,
  rightTopCorner: `polygon(
    0 0,
    calc(100% - ${cornerSizeVar}) 0,
    100% ${cornerSizeVar},
    100% 100%,
    0 100%,
    0% ${cornerSizeVar}
  )`,
  leftCorner: `polygon(
    0 0%,
    100% 0,
    100% calc(100% - ${cornerSizeVar}),
    calc(100% - ${cornerSizeVar}) 100%,
    0 100%,
    0% ${cornerSizeVar}
  )`
}
export const BaseButtonStyle = style({
  position: 'relative',
  transition: 'all 0.2s ease-in-out',
  background: backgroundColorVar,
  cursor: 'pointer',
  pointerEvents: 'all',
  selectors: {
    '&.isHighlighted': {
      vars: {
        [borderSizeVar]: '2px',
        [borderColorVar]: ThemeVars.color.warm7
      }
    },
    '&:disabled': {
      cursor: 'not-allowed',
      vars: {
        [borderColorVar]: ThemeVars.color.purple6,
        [backgroundColorVar]: ThemeVars.color.purple3
      }
    }
  },
  vars: {
    [cornerSizeVar]: '8px',
    [borderSizeVar]: '1px'
  }
})

export const ButtonOuterRecipe = recipe({
  base: [BaseButtonStyle],
  variants: {
    frameType: {
      square: {
        border: `${borderSizeVar} solid ${borderColorVar}`
      },
      rounded: {
        borderRadius: '4px',
        border: `${borderSizeVar} solid ${borderColorVar}`
      },
      roundedRight: {
        borderTopRightRadius: '4px',
        borderBottomRightRadius: '4px',
        border: `${borderSizeVar} solid ${borderColorVar}`
      },
      roundedLeft: {
        borderTopLeftRadius: '4px',
        borderBottomLeftRadius: '4px',
        border: `${borderSizeVar} solid ${borderColorVar}`
      },
      ...merge(
        mapValues(INNER_CLIP_PATHS, (value) => [
          {
            '::after': {
              transition: 'all 0.2s ease-in-out',
              WebkitClipPath: value,
              clipPath: value,
              content: '',
              position: 'absolute',
              inset: 0,
              background: backgroundColorVar,
              zIndex: -1
            },
            '::before': {
              transition: 'all 0.2s ease-in-out',
              content: '',
              position: 'absolute',
              inset: 0,
              background: borderColorVar,
              zIndex: -2
            }
          }
        ]),
        mapValues(OUTER_CLIP_PATHS, (value) => [
          { WebkitClipPath: value, clipPath: value }
        ])
      )
    }
  },
  defaultVariants: {
    frameType: 'default'
  }
})

export const ButtonWrapperStyle = style({
  display: 'inline-grid',
  transition: 'all 0.2s ease-in-out',
  pointerEvents: 'none',
  filter: filterVar,
  position: 'relative',
  selectors: {
    '&.isHighlighted': {
      vars: {
        [filterVar]: `drop-shadow(0px 0px 25px ${ThemeVars.color.warm6})`
      }
    },
    '&.isDisabled': {
      vars: {
        [filterVar]: `drop-shadow(0px 0px 0px rgba(0, 0, 0, 0))`
      }
    }
  },
  vars: {
    [filterVar]: `drop-shadow(0px 0px 0px rgba(0, 0, 0, 0))`
  }
})

const checkBoxBorderColorVar = createVar()
const checkBoxBackgroundColorVar = createVar()

export const ButtonCheckBoxStyle = style({
  left: '-8px',
  top: '-8px',
  zIndex: 2,
  width: '16px',
  height: '16px',
  borderRadius: '2px',
  borderStyle: 'solid',
  borderWidth: '1px',
  borderColor: checkBoxBorderColorVar,
  background: checkBoxBackgroundColorVar,
  transition: 'all 0.2s ease-out',
  boxShadow: `0px 0px 5px 1px ${ThemeVars.color.black}`,
  vars: {
    [checkBoxBorderColorVar]: ThemeVars.color.purple8,
    [checkBoxBackgroundColorVar]: `linear-gradient(180deg, ${ThemeVars.color.black} 0%, #261747 100%)`
  }
})

export const CheckBoxBgVariants = styleVariants({
  default: {
    selectors: {
      '&.isChecked': {
        vars: {
          [checkBoxBorderColorVar]: ThemeVars.color.purple9,
          [checkBoxBackgroundColorVar]: ThemeVars.color.purple10
        }
      }
    }
  },
  secondary: {
    selectors: {
      '&.isChecked': {
        vars: {
          [checkBoxBorderColorVar]: ThemeVars.color.purple9,
          [checkBoxBackgroundColorVar]: ThemeVars.color.purple10
        }
      }
    }
  },
  blue: {
    selectors: {
      '&.isChecked': {
        vars: {
          [checkBoxBorderColorVar]: ThemeVars.color.cold7,
          [checkBoxBackgroundColorVar]: ThemeVars.color.cold5
        }
      }
    }
  },
  green: {
    selectors: {
      '&.isChecked': {
        vars: {
          [checkBoxBorderColorVar]: ThemeVars.color.forest6,
          [checkBoxBackgroundColorVar]: ThemeVars.color.forest4
        }
      }
    }
  },
  orange: {
    selectors: {
      '&.isChecked': {
        vars: {
          [checkBoxBorderColorVar]: ThemeVars.color.warm7,
          [checkBoxBackgroundColorVar]: ThemeVars.color.warm3
        }
      }
    }
  },
  red: {
    selectors: {
      '&.isChecked': {
        vars: {
          [checkBoxBorderColorVar]: ThemeVars.color.pink7,
          [checkBoxBackgroundColorVar]: ThemeVars.color.pink5
        }
      }
    }
  }
})

export const ButtonText = style({
  whiteSpace: 'nowrap'
})
