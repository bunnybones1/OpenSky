import { style } from '@vanilla-extract/css'

import { QUEST_RATIO } from '~/shared/constants/ui'

import { responsiveStyle } from './Theme'

export const QuestStyle = style({
  paddingTop: `calc(100% * ${QUEST_RATIO})`
})

export const QuestWrapperStyle = style({
  width: '200px',
  ...responsiveStyle({
    tablet: {
      width: '250px'
    },
    tabletWide: {
      width: '320px'
    },
    desktopWide: {
      width: '400px'
    }
  })
})
