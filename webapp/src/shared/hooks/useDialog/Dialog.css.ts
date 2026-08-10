import { style } from '@vanilla-extract/css'

import { GlobalFadeIn } from '~/shared/style/Animations.css'
import { ThemeVars } from '~/shared/style/Theme.css'

export const DialogStyle = style({
  maxHeight: ThemeVars.sizes.dialogMaxHeight,
  maxWidth: ThemeVars.sizes.dialogMaxWidth,
  overflow: 'hidden',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',

  selectors: {
    '&:focus-visible': {
      outline: 'none'
    },
    '&:not(.isAnimationDisabled):modal': {
      animation: `${GlobalFadeIn} 0.4s ease-in-out`
    },
    '&:not(.isBorderDisabled):modal': {
      border: `1px solid ${ThemeVars.color.purple9}`
    },
    '&:not(.isGlowDisabled):modal': {
      boxShadow: '0px 0px 15px 0px #5E3EB9, 0px 0px 8px 0px #5E3EB9'
    },

    '&::backdrop': {
      backgroundColor: 'rgba(0, 0, 0, 0.75)'
    },
    '&:not(.isAnimationDisabled)::backdrop': {
      animation: `${GlobalFadeIn} 0.2s ease-out`
    }
  }
})

export const DialogInnerStyle = style({
  height: 'fit-content',
  width: 'fit-content'
})

export const DialogCloseButton = style({
  width: '56px',
  height: '56px'
})
