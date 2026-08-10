import { style } from '@vanilla-extract/css'

import { responsiveStyle } from '~/shared/style/Theme'

import {
  MOBILE_SECTION_ASPECT_RATIO,
  SECTION_ASPECT_RATIO
} from '../shared/constants'

export const SectionContainer = style({
  backgroundSize: 'cover',
  container: 'sectionContainer / size',
  aspectRatio: MOBILE_SECTION_ASPECT_RATIO,
  backgroundPositionX: '51%',
  ...responsiveStyle({
    tabletWide: {
      backgroundPositionX: 'unset',
      aspectRatio: SECTION_ASPECT_RATIO
    }
  })
})

export const SectionInner = style({
  paddingTop: '5.51cqh',
  paddingBottom: '5.51cqh',
  paddingRight: '1.54cqw',
  width: '100%',
  container: 'sectionInner / size',
  ...responsiveStyle({
    tabletWide: {
      width: '69.2cqw',
      paddingTop: '4.96cqh',
      paddingBottom: '4.96cqh',
      paddingRight: '0px'
    }
  })
})

export const Grid = style({
  gridTemplateColumns: '30.12cqw 1fr',
  columnGap: '1.41cqw',
  // aspectRatio: '778 / 290',
  ...responsiveStyle({
    tabletWide: {
      // aspectRatio: '1089.2 / 406',
      columnGap: '1.41cqw',
      gridTemplateColumns: '30.59cqw 1fr'
    }
  })
})

export const ItemsWrapper = style({
  gridTemplateColumns: '1fr 1fr 1fr',
  columnGap: '1.5%',
  selectors: {
    '&.isSingleItem': {
      gridTemplateColumns: '1fr',
      columnGap: '0px'
    }
  }
})

export const TextSection = style({
  container: 'textSection / size'
})

export const Subtitle = style({
  fontSize: '7.563cqw',
  paddingTop: '31.72cqh',
  marginBottom: '1.8cqh',
  paddingLeft: '13.45cqw'
})

export const Title = style({
  fontSize: '11.76cqw',
  marginBottom: '2cqh',
  lineHeight: '87.5%',
  paddingLeft: '13.45cqw'
})

export const Description = style({
  fontSize: '5.04cqw',
  paddingLeft: '13.45cqw',
  lineHeight: '133.333%',
  width: '73.11%'
})

export const ShopSectionImage = style({
  width: '51.39%',
  left: '-2.94%',
  zIndex: '-1',
  ...responsiveStyle({
    tabletWide: {
      width: '35.8%',
      left: '13.22%'
    }
  })
})

export const ShopSectionThankYou = style({
  aspectRatio: '333 / 160',
  width: '42.15%',
  background:
    'radial-gradient(50% 50% at 50% 50%, rgba(102, 54, 239, 0.45) 0%, rgba(75, 35, 189, 0.00) 100%)',
  fontSize: '2.77cqw'
})
