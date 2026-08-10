import { style } from '@vanilla-extract/css'

export const MatchHistoryRowPlayerHero = style({
  height: '42px',
  width: '42px',
  borderRadius: '50%'
})

export const MatchHistoryRowPlayerLink = style({
  width: 'calc(100% - 48px)'
})

export const MatchHistoryRowPlayerTrophy = style({
  height: '16px',
  width: '16px',
  borderRadius: '50%',
  top: '50%',
  transform: 'translateY(-50%)',
  left: '24px',
  right: 'auto',
  selectors: {
    '&.isLeft': {
      left: 'auto',
      right: '24px'
    }
  }
})

export const MatchHistoryRowPlayerDeckStringLink = style({
  maxWidth: '90px',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  wordWrap: 'break-word'
})
