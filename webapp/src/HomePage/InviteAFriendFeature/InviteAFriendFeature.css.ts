import { style } from '@vanilla-extract/css'

import { ThemeVars } from '~/shared/style/Theme.css'

export const InviteAFriendFeatureWrapper = style({
  backgroundPosition: 'center',
  transition: '0.125s ease-in-out',
  selectors: {
    '&:hover': {
      borderColor: ThemeVars.color.purple9,
      filter: `drop-shadow(0px 0px 10px ${ThemeVars.color.purple10})`
    }
  }
})

export const InviteAFriendExplosionWrapper = style({
  opacity: 0.4,
  backgroundRepeat: 'no-repeat'
})
