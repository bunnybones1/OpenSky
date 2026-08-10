import { style } from '@vanilla-extract/css'

import { BarlowCondensedName, BarlowName } from '~/shared/style/constants'
import { responsiveStyle } from '~/shared/style/Theme'
import { ThemeVars } from '~/shared/style/Theme.css'

export const SkyPassDetail = style({
  width: '100%',
  border: `1px solid ${ThemeVars.color.purple5}`,
  selectors: {
    '&:not(.isCardBack)': {
      height: '150px',
      ...responsiveStyle({
        tablet: {
          height: '170px'
        }
      })
    }
  }
})

export const SkyPassDetailInner = style({
  paddingLeft: '20px',
  gridTemplateColumns: '180px 1fr',
  columnGap: '28px',
  gridAutoFlow: 'column',
  backgroundSize: 'calc(100% + 1px)',
  ...responsiveStyle({
    tablet: {
      columnGap: '20px',
      gridTemplateColumns: '215px 1fr',
      paddingLeft: '24px'
    }
  })
})

export const SkyPassDetailTitle = style({
  fontSize: '18px',
  fontWeight: '600',
  fontFamily: BarlowCondensedName,
  width: '100%',
  textAlign: 'left',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  lineHeight: '21.6px',
  textTransform: 'uppercase',
  color: ThemeVars.color.white,
  marginBottom: '16.34px'
})

export const SkyPassDetailDesc = style({
  fontSize: '12px',
  fontWeight: '500',
  fontFamily: BarlowName,
  width: '100%',
  textAlign: 'left',
  lineHeight: '16px',
  color: ThemeVars.color.purple9,
  ...responsiveStyle({
    tablet: {
      lineHeight: '18px',
      fontSize: '14px'
    }
  })
})

export const SkyPassDetailBadge = style({
  top: '8px',
  right: '8px',
  width: '70px',
  ...responsiveStyle({
    tablet: {
      top: '16px',
      right: '16px'
    }
  })
})
