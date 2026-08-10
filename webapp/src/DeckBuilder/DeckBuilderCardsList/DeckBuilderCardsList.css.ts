import { style } from '@vanilla-extract/css'

import { NAVBAR_HEIGHT } from '~/shared/constants/ui'
import { responsiveStyle } from '~/shared/style/Theme'

import { DECKBUILDER_HEADER_HEIGHT } from '../shared/constants'

export const DeckBuilderCardsListStyle = style({
  top: `${DECKBUILDER_HEADER_HEIGHT}px`,
  zIndex: 1000,
  height: `calc(100vh - ${DECKBUILDER_HEADER_HEIGHT}px)`,
  width: '220px',
  ...responsiveStyle({
    tablet: {
      width: '300px'
    },
    tabletWide: {
      top: `${DECKBUILDER_HEADER_HEIGHT + NAVBAR_HEIGHT}px`,
      height: `calc(100vh - ${DECKBUILDER_HEADER_HEIGHT}px - ${NAVBAR_HEIGHT}px)`
    }
  })
})
