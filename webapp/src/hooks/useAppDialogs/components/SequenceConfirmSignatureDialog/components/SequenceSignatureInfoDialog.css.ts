import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'
import { ThemeVars } from '~/shared/style/Theme.css'

export const Container = style({
  height: ThemeVars.sizes.dialogMaxHeight,
  width: ThemeVars.sizes.dialogMaxWidth,
  overflow: 'auto',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'column',
  flexWrap: 'nowrap',
  ...responsiveStyle({
    tabletWide: {
      width: '700px',
      height: 'auto',
      maxHeight: ThemeVars.sizes.dialogMaxHeight
    }
  })
})

export const TitleContainer = style({
  width: '100%',
  overflow: 'auto',
  display: 'flex',
  justifyContent: 'center',
  flexDirection: 'row',
  flexWrap: 'nowrap',
  position: 'relative',
  flex: 1,
  padding: '32px',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat'
})

export const InfoText = style({
  lineHeight: '32px',
  fontSize: '24px',
  ...responsiveStyle({
    tabletWide: {
      lineHeight: '28px',
      fontSize: '20px'
    }
  })
})
