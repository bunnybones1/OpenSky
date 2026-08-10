import { style } from '@vanilla-extract/css'

import { NAVBAR_WIDTH } from '~/shared/constants/ui'
import { responsiveStyle } from '~/shared/style/Theme'

export const QuestListQuestStyle = style({
  maxWidth: `calc((100vw - ${NAVBAR_WIDTH}px) / 3)`,
  ...responsiveStyle({
    tabletWide: {
      maxWidth: '436px'
    }
  })
})
