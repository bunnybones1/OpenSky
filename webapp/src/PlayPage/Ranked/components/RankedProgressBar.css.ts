import { style } from '@vanilla-extract/css'

export const PlayPageRankProgressBarStyle = style({
  gap: '8px',
  gridTemplateColumns: '1fr 100px',
  minWidth: '200px'
})

export const PlayPageRankProgressBarBadge = style({
  width: '60px',
  top: '-22px'
})

export const PlayPageRankProgressBarBar = style({
  top: '8px',
  width: 'calc(100% - 62px)',
  left: '55px'
})

export const PlayPageRankProgressRewardBadge = style({
  width: '44px',
  top: '-10px'
})
