import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'
import { ThemeVars } from '~/shared/style/Theme.css'

export const LeaderboardRewardsDialogStyle = style({
  width: ThemeVars.sizes.dialogMaxWidth,
  height: ThemeVars.sizes.dialogMaxHeight,
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

export const Wrapper = style({
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat'
})

export const BaseTextLineHeight = style({
  lineHeight: '130%'
})

export const ImageHeight = style({
  height: '110px'
})
