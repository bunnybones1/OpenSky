import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'
import { ThemeVars } from '~/shared/style/Theme.css'

export const QuestTimerStyle = style({
  top: '-36px',
  right: '0px',
  width: 'auto',
  columnGap: '8px',
  ...responsiveStyle({
    tabletWide: {
      top: '8px',
      right: '8px',
      rowGap: '8px',
      width: '144px',
      border: '1px solid',
      borderColor: ThemeVars.color.purple7
    }
  })
})
