import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'
import { ThemeVars } from '~/shared/style/Theme.css'

export const CookieSettingsDialogStyle = style({
  height: ThemeVars.sizes.dialogMaxHeight,
  width: ThemeVars.sizes.dialogMaxWidth,
  ...responsiveStyle({
    tabletWide: {
      height: '540px',
      width: '900px'
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

export const CookieGrid = style({
  gridTemplateColumns: '2fr 4fr',
  gap: '16px'
})

export const ButtonGrid = style({
  gridTemplateColumns: '1fr 1fr',
  position: 'sticky',
  bottom: 0,
  gap: '8px',
  background:
    'linear-gradient(0deg, rgba(12,6,30,1) 0%, rgba(12,6,30,1) 50%, rgba(12,6,30,0) 100%)'
})

export const CookieDescription = style({
  lineHeight: '16px'
})
