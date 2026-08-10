import { style } from '@vanilla-extract/css'

export const DeckStatList = style({
  gridAutoFlow: 'row',
  gridAutoRows: 'min-content',
  rowGap: '12px'
})

export const DeckStatsListItem = style({
  opacity: 1,
  transition: 'opacity 0.2s ease-in',
  selectors: {
    '&.hasNoCount': {
      opacity: 0.35
    }
  }
})
