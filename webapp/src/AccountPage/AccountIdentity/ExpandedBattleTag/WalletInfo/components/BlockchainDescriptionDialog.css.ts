import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'
import { ThemeVars } from '~/shared/style/Theme.css'

export const Wrapper = style({
  width: ThemeVars.sizes.dialogMaxWidth,
  height: ThemeVars.sizes.dialogMaxHeight,
  maxWidth: '700px',
  ...responsiveStyle({
    tablet: {
      height: '425px',
      width: '700px'
    }
  })
})

export const Header = style({
  height: '60px',
  ...responsiveStyle({
    tablet: {
      height: '78px'
    }
  })
})

export const Background = style({
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat'
})

export const Grid = style({
  gridTemplateColumns: '1fr 3fr'
})

export const LineHeight = style({
  lineHeight: '26px'
})
