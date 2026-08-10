import { style } from '@vanilla-extract/css'

import { ThemeVars } from '~/shared/style/Theme.css'

export const PlayerLeaderboardRowLayout = style({
  gridTemplateColumns: '5.1fr 1fr 1fr 1fr 1.6fr',
  gridAutoFlow: 'column',
  height: '64px',
  borderBottom: '1px solid',
  borderLeft: '1px solid',
  borderRight: '1px solid',
  borderColor: ThemeVars.color.purple7
})

export const PlayerLeaderboardRowLayoutNoRewards = style({
  gridTemplateColumns: '5.1fr 1fr 1fr 1fr'
})

export const AuthedPlayerBadge = style({
  top: '50%',
  transform: 'translateY(-50%)',
  height: '20px',
  width: '20px',
  left: '-10px',
  borderRadius: '50%'
})
