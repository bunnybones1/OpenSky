import { style } from '@vanilla-extract/css'

import { NAVBAR_HEIGHT } from '~/shared/constants/ui'
import { responsiveStyle } from '~/shared/style/Theme'
import { ThemeVars } from '~/shared/style/Theme.css'

import { DECKBUILDER_HEADER_HEIGHT } from '../shared/constants'

export const DeckbuilderHeaderStyle = style({
  height: `${DECKBUILDER_HEADER_HEIGHT}px`,
  borderBottom: `1px solid ${ThemeVars.color.purple7}`,
  paddingLeft: '60px',
  top: 0,
  zIndex: 11,
  backgroundColor: '#001641',
  ...responsiveStyle({
    tablet: {
      paddingLeft: '74px'
    },
    tabletWide: {
      top: `${NAVBAR_HEIGHT}px`
    }
  }),
  selectors: {
    '&.hasId': {
      backgroundColor: ThemeVars.color.purple3
    }
  }
})

export const DeckBuilderHeaderBackButton = style({
  width: '60px',
  ...responsiveStyle({
    tablet: {
      width: '74px'
    }
  })
})

export const ShowStatsButton = style({
  ...responsiveStyle({
    desktop: {
      width: '110px'
    }
  })
})
