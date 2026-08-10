import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'
import { ThemeVars } from '~/shared/style/Theme.css'

export const DeckLeaderboardRowLayout = style({
  gridTemplateColumns: '1fr 1fr 1fr 1.4fr 1.4fr',
  gridAutoFlow: 'column',
  height: '64px',
  borderBottom: '1px solid',
  borderLeft: '1px solid',
  borderRight: '1px solid',
  borderColor: ThemeVars.color.purple7,

  ...responsiveStyle({
    tabletWide: {
      gridTemplateColumns: '1fr 1fr 1fr 1fr 1.4fr'
    }
  })
})
