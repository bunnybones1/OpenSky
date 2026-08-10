import { style, styleVariants } from '@vanilla-extract/css'

import { ThemeVars } from '~/shared/style/Theme.css'

export const PlayerLeaderboardRowStyleBase = style({
  transition: 'background 0.125s ease-out',
  selectors: {
    '&:hover': {
      backgroundColor: ThemeVars.color.purple3
    }
  }
})

export const PlayerLeaderboardRowStyle = styleVariants({
  primary: [
    PlayerLeaderboardRowStyleBase,
    {
      backgroundColor: ThemeVars.color.purple1
    }
  ],
  golden: [
    PlayerLeaderboardRowStyleBase,
    {
      backgroundColor: '#23181a'
    }
  ]
})

export const WinRateProgress = style({
  width: '60%',
  maxWidth: '52px',
  borderRadius: '3px',
  height: '3px',
  opacity: 0.7
})

export const RewardWrapper = style({
  left: '50%',
  transform: 'translateX(-50%)',
  top: '24px',
  columnGap: '8px',
  selectors: {
    '&.hasNoRewards': {
      opacity: 0.2
    }
  }
})

export const RewardImage = style({
  height: '28px',
  width: '28px'
})

export const RewardImageBadge = style({
  left: 'auto',
  top: '-8px !important',
  right: '-8px !important'
})
