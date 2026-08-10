import { style } from '@vanilla-extract/css'

export const ConquestBgOffset = style({
  backgroundPositionY: '30%',
  backgroundPositionX: '50%'
})

export const ConquestGradient = style({
  zIndex: -1,
  background: `linear-gradient(
    0deg,
    #0c061e 0%,
    rgba(12, 6, 30, 0.95) 10.12%,
    rgba(12, 6, 30, 0) 35.03%,
    rgba(12, 6, 30, 0) 85.93%,
    rgba(11, 6, 30, 0.8) 99.4%
  )`,
  selectors: {
    '&.isConquestLocked': {
      background: `linear-gradient(
        0deg,
        #0c061e 0%,
        rgba(12, 6, 30, 0.95) 30.12%,
        rgba(12, 6, 30, 0) 77.03%,
        rgba(12, 6, 30, 0) 80.93%,
        rgba(11, 6, 30, 0.8) 99.4%
      )`
    }
  }
})

export const ConquestProgressBarSection = style({
  position: 'absolute',
  left: '50%',
  bottom: '0px',
  transform: 'translateX(-50%)',
  width: '50%',
  minWidth: '400px',
  selectors: {
    '&.isActiveConquest': {
      position: 'initial',
      bottom: 'unset',
      left: 'unset',
      transform: 'unset',
      width: '100%'
    }
  }
})

export const ConquestButtonInactiveSection = style({
  left: '50%',
  bottom: '50%',
  transform: 'translate(-50%, 83%)'
})
