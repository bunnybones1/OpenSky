import { style } from '@vanilla-extract/css'

import { GlobalFadeIn } from '~/shared/style/Animations.css'
import { responsiveStyle } from '~/shared/style/Theme'

export const ItemCraftingDialogStyle = style({
  animation: `${GlobalFadeIn} 0.4s ease-in-out`,
  background: 'transparent',
  border: 'none',
  overflow: 'hidden',

  selectors: {
    '&:focus-visible': {
      outline: 'none'
    },
    '&:modal': {
      border: 'none',
      top: '50%',
      left: '50%',
      height: '85.33%',
      minWidth: '200px',
      transform: 'translate(-50%, -50%)',
      background: 'transparent',
      maxHeight: '700px',
      ...responsiveStyle({
        tabletWide: {
          height: '74.64%'
        }
      })
    },
    '&::backdrop': {
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      animation: `${GlobalFadeIn} 0.2s ease-out`
    }
  }
})

export const ImageWrapper = style({
  height: '71.25%',
  aspectRatio: '282 / 434',
  ...responsiveStyle({
    tabletWide: {
      height: '76.78%'
    }
  })
})

export const SparkIcon = style({
  width: '14px',
  ...responsiveStyle({
    tabletWide: {
      width: '22px'
    }
  })
})

export const ItemCraftingDialogInner = style({
  minWidth: '100%',
  paddingRight: '23px',
  ...responsiveStyle({
    tabletWide: {
      paddingRight: '34.5px'
    }
  })
})

export const ControlsWrapper = style({
  columnGap: '16px',
  gridTemplateColumns: '1fr 1fr',
  paddingRight: '20px',
  ...responsiveStyle({
    tabletWide: {
      columnGap: '36px',
      paddingRight: '24px'
    }
  }),
  selectors: {
    '&.isNotDustable': {
      justifyItems: 'center',
      columnGap: '0px',
      gridTemplateColumns: '1fr'
    }
  }
})

export const CraftButtonWrapper = style({
  maxWidth: '200px'
})
