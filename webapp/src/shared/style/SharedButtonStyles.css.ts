import '@vanilla-extract/sprinkles'

// import { createSprinkles } from '@vanilla-extract/sprinkles/declarations/src/index'
import { createVar, styleVariants } from '@vanilla-extract/css'
import { createSprinkles, defineProperties } from '@vanilla-extract/sprinkles'

import { ThemeVars } from './Theme.css'

// import { defineProperties } from '@vanilla-extract/sprinkles'

// Colors
export const BUTTON_COLOR_TYPES = [
  'default',
  'secondary',
  'blue',
  'green',
  'orange',
  'red'
] as const

export type ButtonColorTypes = (typeof BUTTON_COLOR_TYPES)[number]

export const borderColorVar = createVar()
export const filterVar = createVar()
export const backgroundColorVar = createVar()

export const toggleClassName = 'isToggled'

export const ButtonColorVariants = styleVariants({
  default: {
    vars: {
      [backgroundColorVar]: ThemeVars.buttons.backgrounds.default,
      [borderColorVar]: ThemeVars.color.purple7
    },
    selectors: {
      [`&:active:not(:disabled):not(.${toggleClassName})`]: {
        vars: {
          [backgroundColorVar]: ThemeVars.color.purple6,
          [borderColorVar]: ThemeVars.color.purple9
        }
      },
      [`&:hover:not(:active):not(:disabled):not(.${toggleClassName})`]: {
        vars: {
          [backgroundColorVar]: ThemeVars.buttons.hoverBackgrounds.default,
          [borderColorVar]: ThemeVars.color.purple9
        }
      },
      [`&.${toggleClassName}:not(:disabled)`]: {
        vars: {
          [backgroundColorVar]: ThemeVars.color.purple6,
          [borderColorVar]: ThemeVars.color.purple9
        }
      }
    }
  },
  secondary: {
    vars: {
      [backgroundColorVar]: ThemeVars.buttons.backgrounds.secondary,
      [borderColorVar]: ThemeVars.color.purple8
    },
    selectors: {
      [`&:hover:not(:active):not(:disabled):not(.${toggleClassName})`]: {
        vars: {
          [backgroundColorVar]: ThemeVars.buttons.hoverBackgrounds.secondary,
          [borderColorVar]: ThemeVars.color.purple9
        }
      },
      '&:active:not(:disabled)': {
        vars: {
          [backgroundColorVar]: ThemeVars.color.purple7,
          [borderColorVar]: ThemeVars.color.purple9
        }
      },
      [`&.${toggleClassName}:not(:disabled)`]: {
        vars: {
          [backgroundColorVar]: ThemeVars.color.purple7,
          [borderColorVar]: ThemeVars.color.purple9
        }
      }
    }
  },
  blue: {
    vars: {
      [backgroundColorVar]: ThemeVars.buttons.backgrounds.blue,
      [borderColorVar]: ThemeVars.color.cold7
    },
    selectors: {
      [`&:hover:not(:active):not(:disabled):not(.${toggleClassName})`]: {
        vars: {
          [backgroundColorVar]: ThemeVars.buttons.hoverBackgrounds.blue,
          [borderColorVar]: ThemeVars.color.cold7
        }
      },
      '&:active:not(:disabled)': {
        vars: {
          [backgroundColorVar]: ThemeVars.color.cold6,
          [borderColorVar]: ThemeVars.color.cold7
        }
      },
      [`&.${toggleClassName}:not(:disabled)`]: {
        vars: {
          [backgroundColorVar]: ThemeVars.color.cold6,
          [borderColorVar]: ThemeVars.color.cold7
        }
      }
    }
  },
  green: {
    vars: {
      [backgroundColorVar]: ThemeVars.buttons.backgrounds.green,
      [borderColorVar]: ThemeVars.color.forest5
    },
    selectors: {
      [`&:hover:not(:active):not(:disabled):not(.${toggleClassName})`]: {
        vars: {
          [backgroundColorVar]: ThemeVars.buttons.hoverBackgrounds.green,
          [borderColorVar]: ThemeVars.color.forest6
        }
      },
      '&:active:not(:disabled)': {
        vars: {
          [borderColorVar]: ThemeVars.color.forest6,
          [backgroundColorVar]: ThemeVars.color.forest4
        }
      },
      [`&.${toggleClassName}:not(:disabled)`]: {
        vars: {
          [borderColorVar]: ThemeVars.color.forest6,
          [backgroundColorVar]: ThemeVars.color.forest4
        }
      }
    }
  },
  orange: {
    vars: {
      [backgroundColorVar]: ThemeVars.buttons.backgrounds.orange,
      [borderColorVar]: ThemeVars.color.warm8
    },
    selectors: {
      '&.isHighlighted:not(:disabled)': {
        vars: {
          [borderColorVar]: ThemeVars.color.white
        }
      },
      '&.isHighlighted:hover:not(:active):not(:disabled)': {
        vars: {
          [borderColorVar]: ThemeVars.color.white
        }
      },
      '&.isHighlighted:active:not(:disabled)': {
        vars: {
          [borderColorVar]: ThemeVars.color.white
        }
      },
      [`&:hover:not(:active):not(:disabled):not(.${toggleClassName})`]: {
        vars: {
          [backgroundColorVar]: ThemeVars.buttons.hoverBackgrounds.orange,
          [borderColorVar]: ThemeVars.color.warm7
        }
      },
      '&:active:not(:disabled)': {
        vars: {
          [backgroundColorVar]: ThemeVars.color.warm6,
          [borderColorVar]: ThemeVars.color.warm7
        }
      },
      [`&.${toggleClassName}:not(:disabled)`]: {
        vars: {
          [backgroundColorVar]: ThemeVars.color.warm6,
          [borderColorVar]: ThemeVars.color.warm7
        }
      }
    }
  },
  red: {
    vars: {
      [backgroundColorVar]: ThemeVars.buttons.backgrounds.red,
      [borderColorVar]: ThemeVars.color.pink5
    },
    selectors: {
      [`&:hover:not(:active):not(:disabled):not(.${toggleClassName})`]: {
        vars: {
          [backgroundColorVar]: ThemeVars.buttons.hoverBackgrounds.red,
          [borderColorVar]: ThemeVars.color.pink7
        }
      },
      '&:active:not(:disabled)': {
        vars: {
          [borderColorVar]: ThemeVars.color.pink7,
          [backgroundColorVar]: ThemeVars.color.pink5
        }
      },
      [`&.${toggleClassName}:not(:disabled)`]: {
        vars: {
          [borderColorVar]: ThemeVars.color.pink7,
          [backgroundColorVar]: ThemeVars.color.pink5
        }
      }
    }
  }
})

export const ButtonHoverVariants = styleVariants({
  default: {
    selectors: {
      '&:hover:not(.isDisabled)': {
        vars: {
          [filterVar]: `drop-shadow(0px 0px 10px ${ThemeVars.color.purple10})`
        }
      },
      '&:active:not(.isDisabled)': {
        vars: {
          [filterVar]: `drop-shadow(0px 0px 10px ${ThemeVars.color.purple10})`
        }
      }
    }
  },
  secondary: {},
  blue: {
    selectors: {
      '&:hover:not(.isDisabled)': {
        vars: {
          [filterVar]: `drop-shadow(0px 0px 10px ${ThemeVars.color.cold3})`
        }
      },
      '&:active:not(.isDisabled)': {
        vars: {
          [filterVar]: `drop-shadow(0px 0px 10px ${ThemeVars.color.cold3})`
        }
      }
    }
  },
  green: {
    selectors: {
      '&:hover:not(.isDisabled)': {
        vars: {
          [filterVar]: 'drop-shadow(0px 0px 10px rgba(134, 251, 180, 0.6))'
        }
      },
      '&:active:not(.isDisabled)': {
        vars: {
          [filterVar]: 'drop-shadow(0px 0px 10px rgba(134, 251, 180, 0.6))'
        }
      }
    }
  },
  orange: {
    selectors: {
      '&:not(.isDisabled)': {
        vars: {
          [filterVar]: `drop-shadow(0px 0px 10px ${ThemeVars.color.warm4}) drop-shadow(0px 4px 4px rgba(0, 0, 0, 0.25)) drop-shadow(0px 0px 20px ${ThemeVars.color.purple1})`
        }
      }
    }
  },
  red: {
    vars: {}
  }
})

export const BUTTON_HEIGHTS = [
  '28px',
  '32px',
  '36px',
  '44px',
  '52px',
  '64px',
  '76px'
] as const

export type ButtonHeightTypes = (typeof BUTTON_HEIGHTS)[number]

const ButtonHeights: { [key in ButtonHeightTypes]: string } = BUTTON_HEIGHTS.reduce(
  (prev, curr) => {
    return {
      ...prev,
      [curr]: curr
    }
  },
  {} as { [key in ButtonHeightTypes]: string }
)

const buttonSizeProperties = defineProperties({
  properties: {
    width: { full: '100%' },
    height: ButtonHeights
  }
})

// NOTE: we must be explicit about the type due to https://github.com/microsoft/TypeScript/issues/47663
// NOTE2: https://github.com/vanilla-extract-css/vanilla-extract/issues/739
//
// export const ButtonSizeSprinkles: SprinklesFn<typeof buttonSizeProperties> =
//   createSprinkles(buttonSizeProperties)
export const ButtonSizeSprinkles = createSprinkles(buttonSizeProperties)

export type ButtonSizeSprinklesType = Parameters<typeof ButtonSizeSprinkles>[0]
