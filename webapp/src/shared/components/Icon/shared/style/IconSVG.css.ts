import { style } from '@vanilla-extract/css'
import { createSprinkles, defineProperties } from '@vanilla-extract/sprinkles'

import { ThemeVars } from '~/shared/style/Theme.css'

const IconSVGProperties = defineProperties({
  properties: {
    fill: ThemeVars.color
  }
})

export const IconSVGStyle = style({
  transition: 'fill 0.125s ease-in-out'
})

export const IconSVGSprinkles = createSprinkles(IconSVGProperties)
