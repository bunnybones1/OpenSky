import { keyframes, style } from '@vanilla-extract/css'

import { ThemeVars } from '~/shared/style/Theme.css'

export const QuestRerollButtonStyle = style({
  width: '26.25%',
  height: 'auto',
  right: '7.3%',
  top: '11%',
  cursor: 'pointer',
  selectors: {
    '&.isRerolling': {
      pointerEvents: 'none',
      cursor: 'not-allowed'
    }
  }
})

export const MainPath = style({
  transition: '0.2s ease-out',
  selectors: {
    [`${QuestRerollButtonStyle}:hover:not(.isRerolling) &`]: {
      fill: ThemeVars.color.pink6,
      stroke: ThemeVars.color.white
    },
    [`${QuestRerollButtonStyle}.isRerolling &`]: {
      fill: ThemeVars.color.purple3,
      stroke: ThemeVars.color.purple7
    }
  }
})

export const BodyPath = style({
  transition: '0.2s ease-out',
  selectors: {
    [`${QuestRerollButtonStyle}:hover:not(.isRerolling) &`]: {
      fill: '#771A4C'
    },
    [`${QuestRerollButtonStyle}.isRerolling &`]: {
      fill: ThemeVars.color.purple1
    }
  }
})

export const RectOne = style({
  transition: '0.2s ease-out',
  selectors: {
    [`${QuestRerollButtonStyle}:hover &`]: {
      fill: 'url(#hover-paint-0)'
    }
  }
})

export const RectTwo = style({
  transition: '0.2s ease-out',
  selectors: {
    [`${QuestRerollButtonStyle}:hover &`]: {
      fill: 'url(#hover-paint-1)'
    }
  }
})

const ArrowPathRerollAnim = keyframes({
  '0%': {
    opacity: 1
  },
  '50%': {
    opacity: 0
  },
  '100%': {
    opacity: 1
  }
})

export const ArrowPath = style({
  selectors: {
    '&.isRerolling': {
      filter: 'none',
      animation: `${ArrowPathRerollAnim} 2.5s ease-out infinite`
    }
  }
})
