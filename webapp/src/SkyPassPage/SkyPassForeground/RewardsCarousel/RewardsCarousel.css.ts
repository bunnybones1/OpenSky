import { style } from '@vanilla-extract/css'

export const RewardsCarouselWrapper = style({
  width: '100%',
  position: 'relative',
  background:
    'linear-gradient(180deg, rgba(12, 6, 30, 0) 0%, rgba(12, 6, 30, 0.8) 31.65%, #0C061E 100%)',
  zIndex: '4'
})

export const RewardsCarouselContainer = style({
  position: 'relative',
  overflowX: 'scroll',
  selectors: {
    '&::-webkit-scrollbar': {
      display: 'none'
    }
  },
  msOverflowStyle: 'none' /* IE and Edge */,
  scrollbarWidth: 'none' /* Firefox */
})

export const RewardsScrollOverlay = style({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  width: '300px',
  position: 'absolute',
  height: '300px',
  top: '-50px',
  left: '-150px',
  background:
    'radial-gradient(circle, rgba(12, 6, 29, 1) 0%, rgba(12, 6, 29, 0) 51%)',
  pointerEvents: 'none'
})

export const TitleLevelSpacerWrapper = style({
  width: '48px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: '3px',
  marginLeft: '3px',
  flexShrink: 0,
  height: '126px'
})

export const TitleLevelSpacer = style({
  height: '2px',
  width: '95%',
  background:
    'linear-gradient(90deg, rgba(112,91,171,0) 0%, rgba(112,91,171,1) 50%, rgba(112,91,171,0) 100%)'
})

export const RewardsScrollArrow = style({
  width: '75px',
  height: '75px',
  position: 'absolute',
  bottom: '-8px',
  cursor: 'pointer',
  zIndex: 5
})
