import { style } from '@vanilla-extract/css'

import { NAVBAR_WIDTH } from '~/shared/constants/ui'
import { TOP_OFFSET_KEY } from '~/shared/style/constants'
import { responsiveStyle } from '~/shared/style/Theme'

export const CreateDeckPageWrapper = style({
  height: '100vh',
  paddingTop: `var(${TOP_OFFSET_KEY})`,
  paddingLeft: `${NAVBAR_WIDTH}px`,
  ...responsiveStyle({
    tabletWide: {
      paddingLeft: '0px'
    }
  })
})

export const CreateDeckPageStyle = style({
  backgroundSize: 'cover',
  backgroundRepeat: 'no-repeat'
})

export const CreateDeckPageHeader = style({
  height: '52px',
  ...responsiveStyle({
    tablet: {
      height: '80px'
    }
  })
})

export const CreateDeckTitle = style({
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)'
})
