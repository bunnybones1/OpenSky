import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

import { NAVBAR_HEIGHT } from '../constants/ui'

// import { responsiveStyle } from '~/shared/style/Theme'
// import { NAVBAR_HEIGHT } from '~/shared/constants/ui'

export const SearchBarSideStyle = style({
  display: 'grid',
  gridAutoFlow: 'column',
  columnGap: '8px',
  selectors: {
    '&.isRight': {
      marginLeft: 'auto'
    }
  }
})

export const SearchResultsWrapper = style({
  height: '36px'
})

export const BasicSearchBarStyle = style({
  top: '0px',
  ...responsiveStyle({
    tabletWide: { top: `${NAVBAR_HEIGHT - 10}px` }
  })
})
