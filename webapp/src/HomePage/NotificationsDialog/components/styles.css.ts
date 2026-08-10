import { style } from '@vanilla-extract/css'

import { GlobalFadeIn } from '~/shared/style/Animations.css'
import { responsiveStyle } from '~/shared/style/Theme'
import { ThemeVars } from '~/shared/style/Theme.css'

export const BackgroundImage = style({
  backgroundRepeat: 'no-repeat',
  backgroundSize: 'cover',
  backgroundPosition: 'center center'
})

export const BottomAnchor = style({
  position: 'absolute',
  bottom: '34px',
  textAlign: 'center',
  zIndex: 20
})

export const ContainerAnimation = style({
  animation: `${GlobalFadeIn} 0.2s ease-in-out;`
})

export const Gradient = style({
  zIndex: 10,
  background: 'radial-gradient(ellipse at center, #2a114b00, #2a114b00, #0c061e)'
})

export const TopAnchor = style({
  position: 'absolute',
  top: '8px',
  textAlign: 'center',
  zIndex: 20,
  ...responsiveStyle({
    tabletWide: { top: '16px' },
    desktop: { top: '16px' }
  })
})

export const NotificationTitle = style({
  whiteSpace: 'pre-wrap',
  color: 'white',
  fontFamily: 'Barlow Condensed',
  fontSize: '20px',
  textAlign: 'center',
  zIndex: 10,
  position: 'relative',
  fontWeight: '600',
  minHeight: '20px',
  ...responsiveStyle({
    mobile: { fontSize: '24px' },
    tablet: { fontSize: '24px' },
    tabletWide: { fontSize: '28px' },
    desktop: { fontSize: '42px' }
  })
})

export const NotificationSubtitleContainer = style({
  display: 'flex',
  justifyContent: 'center'
})

export const NotificationSubtitle = style({
  whiteSpace: 'pre-wrap',
  fontWeight: '600',
  fontSize: '12px',
  zIndex: 10,
  lineHeight: '22px',
  marginBottom: '8px',
  textAlign: 'center',
  fontFamily: 'Barlow',
  color: ThemeVars.color.warm7,
  background: '#0C061E',
  display: 'inline-block',
  padding: '0px 5px',
  borderRadius: '6px',
  minHeight: '20px',
  ...responsiveStyle({
    mobile: { fontSize: '12px', padding: '0px 5px' },
    tablet: { fontSize: '12px', padding: '0px 5px' },
    tabletWide: { fontSize: '12px', padding: '0px 5px' },
    desktop: { fontSize: '16px', padding: '0px 10px' }
  })
})

export const YouWon = style({
  fontFamily: 'Barlow',
  fontSize: '18px',
  color: ThemeVars.color.purple9,
  fontWeight: 600,

  ...responsiveStyle({
    mobile: { fontSize: '18px' },
    tablet: { fontSize: '18px' },
    tabletWide: { fontSize: '18px' },
    desktop: { fontSize: '32px' }
  })
})

export const YouWonContainer = style({
  display: 'flex',
  paddingBottom: '8px',
  justifyContent: 'center',
  alignItems: 'center',

  ...responsiveStyle({
    tabletWide: { paddingBottom: '16px' },
    desktop: { paddingBottom: '24px' }
  })
})

export const ButtonContainer = style({
  display: 'flex',
  zIndex: 10,
  position: 'relative',
  marginBottom: 8,
  width: '100%',
  maxWidth: '210px'
})

export const Reward = style({
  fontFamily: 'Barlow',
  fontSize: '18px',
  color: 'white',
  fontWeight: 600,
  ...responsiveStyle({
    mobile: { fontSize: '18px' },
    tablet: { fontSize: '18px' },
    tabletWide: { fontSize: '18px' },
    desktop: { fontSize: '32px' }
  })
})
