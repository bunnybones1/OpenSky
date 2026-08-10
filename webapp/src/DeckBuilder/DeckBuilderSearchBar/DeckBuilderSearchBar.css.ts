import { style } from '@vanilla-extract/css'

import { NAVBAR_HEIGHT } from '~/shared/constants/ui'
import { responsiveStyle } from '~/shared/style/Theme'

import { DECKBUILDER_HEADER_HEIGHT } from '../shared/constants'

export const DeckBuilderSearchBarStyle = style({
  top: `${DECKBUILDER_HEADER_HEIGHT}px`,
  ...responsiveStyle({
    tabletWide: {
      top: `${DECKBUILDER_HEADER_HEIGHT + NAVBAR_HEIGHT}px`
    }
  })
})
