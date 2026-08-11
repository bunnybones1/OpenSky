import { globalStyle, keyframes, style } from '@vanilla-extract/css'

const mobile = 'screen and (max-width: 839px)'
const compact = 'screen and (max-width: 520px)'

const colors = {
  ink: '#090716',
  deep: '#110c25',
  panel: 'rgba(30, 22, 57, 0.86)',
  panelStrong: '#20183c',
  panelRaised: '#2a204c',
  line: 'rgba(194, 174, 255, 0.16)',
  lineStrong: 'rgba(194, 174, 255, 0.32)',
  text: '#f7f4ff',
  muted: '#aaa1c3',
  violet: '#aa8cff',
  cyan: '#50ddff',
  green: '#65e69a',
  amber: '#ffc35c',
  coral: '#ff7377'
}

const fadeIn = keyframes({
  from: { opacity: 0, transform: 'translateY(8px)' },
  to: { opacity: 1, transform: 'translateY(0)' }
})

export const shell = style({
  minHeight: '100dvh',
  color: colors.text,
  background: `
    radial-gradient(circle at 76% 4%, rgba(87, 49, 166, 0.28), transparent 32%),
    radial-gradient(circle at 8% 92%, rgba(0, 151, 190, 0.12), transparent 28%),
    ${colors.ink}
  `,
  fontFamily: '"Barlow", sans-serif'
})

export const sidebar = style({
  position: 'fixed',
  inset: '0 auto 0 0',
  zIndex: 10,
  display: 'flex',
  width: 248,
  flexDirection: 'column',
  padding: '28px 18px 22px',
  borderRight: `1px solid ${colors.line}`,
  background: 'rgba(12, 8, 28, 0.9)',
  backdropFilter: 'blur(18px)',
  '@media': { [mobile]: { display: 'none' } }
})

export const brand = style({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  minHeight: 52,
  padding: '0 10px',
  color: colors.text
})

export const brandMark = style({
  display: 'grid',
  width: 42,
  height: 42,
  flex: '0 0 42px',
  placeItems: 'center',
  border: '1px solid rgba(80, 221, 255, 0.55)',
  borderRadius: 14,
  background:
    'linear-gradient(145deg, rgba(80, 221, 255, 0.22), rgba(170, 140, 255, 0.3))',
  boxShadow: '0 8px 30px rgba(80, 221, 255, 0.1)',
  color: colors.cyan,
  fontFamily: '"Roboto Mono", monospace',
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: '-0.06em'
})

export const brandName = style({
  display: 'block',
  fontFamily: '"Barlow Condensed", sans-serif',
  fontSize: 21,
  fontWeight: 700,
  letterSpacing: '0.02em',
  lineHeight: 1
})

export const brandMeta = style({
  display: 'block',
  marginTop: 5,
  color: colors.muted,
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.16em',
  textTransform: 'uppercase'
})

export const nav = style({
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  gap: 6,
  marginTop: 38
})

export const navSectionLabel = style({
  margin: '0 12px 9px',
  color: '#746b8d',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.16em',
  textTransform: 'uppercase'
})

export const navItem = style({
  position: 'relative',
  display: 'flex',
  minHeight: 48,
  alignItems: 'center',
  gap: 13,
  padding: '0 14px',
  border: '1px solid transparent',
  borderRadius: 13,
  color: colors.muted,
  fontSize: 14,
  fontWeight: 600,
  transition: '150ms ease',
  selectors: {
    '&:hover': {
      borderColor: colors.line,
      background: 'rgba(170, 140, 255, 0.07)',
      color: colors.text
    },
    '&:focus-visible': {
      outline: `2px solid ${colors.cyan}`,
      outlineOffset: 2
    }
  }
})

export const navItemActive = style({
  borderColor: 'rgba(170, 140, 255, 0.2)',
  background:
    'linear-gradient(90deg, rgba(170, 140, 255, 0.19), rgba(80, 221, 255, 0.05))',
  color: colors.text,
  selectors: {
    '&::before': {
      position: 'absolute',
      top: 11,
      bottom: 11,
      left: -19,
      width: 3,
      borderRadius: '0 3px 3px 0',
      background: colors.cyan,
      content: ''
    }
  }
})

export const sidebarFooter = style({
  paddingTop: 16,
  borderTop: `1px solid ${colors.line}`
})

export const walletNote = style({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  marginTop: 10,
  padding: '10px 12px',
  color: colors.muted,
  fontSize: 11,
  lineHeight: 1.35
})

export const walletDot = style({
  width: 8,
  height: 8,
  flex: '0 0 8px',
  border: `1px solid ${colors.violet}`,
  borderRadius: '50%',
  background: 'rgba(170, 140, 255, 0.2)'
})

export const mobileHeader = style({
  position: 'sticky',
  top: 0,
  zIndex: 10,
  display: 'none',
  minHeight: 64,
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 16px',
  borderBottom: `1px solid ${colors.line}`,
  background: 'rgba(9, 7, 22, 0.9)',
  backdropFilter: 'blur(16px)',
  '@media': { [mobile]: { display: 'flex' } }
})

export const mobileBrand = style({
  display: 'flex',
  alignItems: 'center',
  gap: 9,
  color: colors.text,
  fontFamily: '"Barlow Condensed", sans-serif',
  fontSize: 18,
  fontWeight: 700
})

export const avatarButton = style({
  display: 'grid',
  width: 40,
  height: 40,
  placeItems: 'center',
  overflow: 'hidden',
  border: `1px solid ${colors.lineStrong}`,
  borderRadius: '50%',
  background: colors.panelRaised,
  color: colors.text,
  fontWeight: 700,
  selectors: {
    '&:focus-visible': {
      outline: `2px solid ${colors.cyan}`,
      outlineOffset: 2
    }
  }
})

export const avatarImage = style({
  width: '100%',
  height: '100%',
  objectFit: 'cover'
})

export const main = style({
  minHeight: '100dvh',
  marginLeft: 248,
  padding: '38px clamp(26px, 4vw, 68px) 64px',
  '@media': {
    [mobile]: {
      minHeight: 'calc(100dvh - 64px)',
      marginLeft: 0,
      padding: '24px 18px 104px'
    },
    [compact]: { paddingRight: 14, paddingLeft: 14 }
  }
})

export const content = style({
  width: '100%',
  maxWidth: 1240,
  margin: '0 auto',
  animation: `${fadeIn} 220ms ease-out`
})

export const pageHeader = style({
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  gap: 20,
  marginBottom: 26,
  '@media': { [compact]: { display: 'block' } }
})

export const eyebrow = style({
  marginBottom: 8,
  color: colors.cyan,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.17em',
  textTransform: 'uppercase'
})

export const pageTitle = style({
  fontFamily: '"Barlow Condensed", sans-serif',
  fontSize: 'clamp(32px, 5vw, 52px)',
  fontWeight: 700,
  letterSpacing: '-0.02em',
  lineHeight: 0.95
})

export const pageDescription = style({
  maxWidth: 620,
  marginTop: 11,
  color: colors.muted,
  fontSize: 14,
  lineHeight: 1.55
})

export const statusPill = style({
  display: 'inline-flex',
  minHeight: 30,
  alignItems: 'center',
  gap: 8,
  padding: '0 11px',
  border: `1px solid ${colors.lineStrong}`,
  borderRadius: 999,
  background: 'rgba(15, 11, 32, 0.72)',
  color: colors.muted,
  fontSize: 11,
  fontWeight: 600,
  whiteSpace: 'nowrap',
  '@media': { [compact]: { marginTop: 15 } }
})

export const statusDot = style({
  width: 7,
  height: 7,
  borderRadius: '50%',
  background: colors.green,
  boxShadow: `0 0 12px ${colors.green}`
})

export const hero = style({
  position: 'relative',
  display: 'grid',
  minHeight: 290,
  overflow: 'hidden',
  alignItems: 'end',
  padding: 'clamp(26px, 5vw, 54px)',
  border: `1px solid ${colors.lineStrong}`,
  borderRadius: 26,
  background: `
    radial-gradient(circle at 80% 22%, rgba(80, 221, 255, 0.22), transparent 27%),
    radial-gradient(circle at 90% 74%, rgba(170, 140, 255, 0.3), transparent 34%),
    linear-gradient(135deg, #281b4e 0%, #171130 56%, #111b30 100%)
  `,
  boxShadow: '0 30px 70px rgba(0, 0, 0, 0.24)',
  selectors: {
    '&::after': {
      position: 'absolute',
      top: -80,
      right: -55,
      width: 310,
      height: 310,
      border: '1px solid rgba(80, 221, 255, 0.13)',
      borderRadius: '42% 58% 57% 43%',
      content: '',
      transform: 'rotate(18deg)'
    }
  }
})

export const heroContent = style({ position: 'relative', zIndex: 1, maxWidth: 650 })

export const heroKicker = style({
  color: colors.amber,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.16em',
  textTransform: 'uppercase'
})

export const heroTitle = style({
  maxWidth: 620,
  marginTop: 9,
  fontFamily: '"Barlow Condensed", sans-serif',
  fontSize: 'clamp(38px, 6vw, 68px)',
  fontWeight: 700,
  letterSpacing: '-0.025em',
  lineHeight: 0.92
})

export const heroText = style({
  maxWidth: 550,
  marginTop: 15,
  color: '#c6bed8',
  fontSize: 15,
  lineHeight: 1.5
})

export const actionRow = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: 12,
  marginTop: 24
})

export const primaryButton = style({
  display: 'inline-flex',
  minHeight: 46,
  alignItems: 'center',
  justifyContent: 'center',
  gap: 9,
  padding: '0 20px',
  border: '1px solid rgba(80, 221, 255, 0.65)',
  borderRadius: 12,
  background: 'linear-gradient(135deg, #129bc2, #5969e8)',
  boxShadow: '0 12px 30px rgba(18, 155, 194, 0.19)',
  color: '#fff',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 13,
  fontWeight: 700,
  transition: '150ms ease',
  selectors: {
    '&:hover': { filter: 'brightness(1.1)', transform: 'translateY(-1px)' },
    '&:focus-visible': { outline: `2px solid ${colors.text}`, outlineOffset: 3 },
    '&:disabled': { cursor: 'not-allowed', filter: 'grayscale(0.4)', opacity: 0.5 }
  }
})

export const secondaryButton = style({
  display: 'inline-flex',
  minHeight: 46,
  alignItems: 'center',
  justifyContent: 'center',
  gap: 9,
  padding: '0 18px',
  border: `1px solid ${colors.lineStrong}`,
  borderRadius: 12,
  background: 'rgba(19, 14, 41, 0.74)',
  color: colors.text,
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: 13,
  fontWeight: 600,
  transition: '150ms ease',
  selectors: {
    '&:hover': {
      borderColor: colors.violet,
      background: 'rgba(170, 140, 255, 0.12)'
    },
    '&:focus-visible': { outline: `2px solid ${colors.cyan}`, outlineOffset: 2 },
    '&:disabled': { cursor: 'not-allowed', opacity: 0.45 }
  }
})

export const statsGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  gap: 14,
  marginTop: 18,
  '@media': {
    'screen and (max-width: 1080px)': {
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))'
    },
    [compact]: { gridTemplateColumns: '1fr' }
  }
})

export const statCard = style({
  minHeight: 118,
  padding: 19,
  border: `1px solid ${colors.line}`,
  borderRadius: 17,
  background: colors.panel
})

export const statLabel = style({
  color: colors.muted,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase'
})

export const statValue = style({
  display: 'block',
  marginTop: 12,
  fontFamily: '"Barlow Condensed", sans-serif',
  fontSize: 31,
  fontWeight: 700,
  lineHeight: 1
})

export const statMeta = style({
  display: 'block',
  marginTop: 8,
  color: colors.muted,
  fontSize: 11
})

export const sectionGrid = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.4fr) minmax(280px, 0.6fr)',
  gap: 18,
  marginTop: 18,
  '@media': { 'screen and (max-width: 1040px)': { gridTemplateColumns: '1fr' } }
})

export const panel = style({
  padding: 'clamp(20px, 3vw, 28px)',
  border: `1px solid ${colors.line}`,
  borderRadius: 20,
  background: colors.panel
})

export const panelHeader = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  marginBottom: 20
})

export const panelTitle = style({
  fontFamily: '"Barlow Condensed", sans-serif',
  fontSize: 22,
  fontWeight: 700
})

export const textLink = style({
  color: colors.cyan,
  fontSize: 12,
  fontWeight: 600,
  selectors: {
    '&:hover': { textDecoration: 'underline' },
    '&:focus-visible': { outline: `2px solid ${colors.cyan}`, outlineOffset: 3 }
  }
})

export const list = style({ display: 'grid', gap: 10 })

export const listItem = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  gap: 20,
  alignItems: 'center',
  minHeight: 70,
  padding: '14px 16px',
  border: `1px solid ${colors.line}`,
  borderRadius: 14,
  background: 'rgba(10, 8, 24, 0.32)'
})

export const listTitle = style({ fontSize: 14, fontWeight: 650, lineHeight: 1.25 })

export const listDescription = style({
  marginTop: 6,
  color: colors.muted,
  fontSize: 12,
  lineHeight: 1.4
})

export const questReward = style({
  color: colors.amber,
  fontSize: 11,
  fontWeight: 700,
  whiteSpace: 'nowrap'
})

export const progressTrack = style({
  position: 'relative',
  height: 7,
  overflow: 'hidden',
  marginTop: 10,
  borderRadius: 999,
  background: 'rgba(255, 255, 255, 0.08)'
})

export const progressFill = style({
  position: 'absolute',
  inset: 0,
  width: 'var(--progress, 0%)',
  maxWidth: '100%',
  borderRadius: 999,
  background: 'linear-gradient(90deg, #6a6eea, #50ddff)'
})

export const modesGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 16,
  '@media': {
    'screen and (max-width: 1120px)': {
      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))'
    },
    [compact]: { gridTemplateColumns: '1fr' }
  }
})

export const modeCard = style({
  display: 'flex',
  minHeight: 260,
  flexDirection: 'column',
  padding: 24,
  border: `1px solid ${colors.line}`,
  borderRadius: 20,
  background: colors.panel
})

export const modeCardReady = style({
  borderColor: 'rgba(80, 221, 255, 0.38)',
  background:
    'radial-gradient(circle at 90% 8%, rgba(80, 221, 255, 0.14), transparent 33%), rgba(30, 22, 57, 0.92)'
})

export const availability = style({
  display: 'inline-flex',
  width: 'fit-content',
  minHeight: 25,
  alignItems: 'center',
  padding: '0 9px',
  border: `1px solid ${colors.lineStrong}`,
  borderRadius: 99,
  color: colors.muted,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase'
})

export const availabilityReady = style({
  borderColor: 'rgba(101, 230, 154, 0.35)',
  background: 'rgba(101, 230, 154, 0.08)',
  color: colors.green
})

export const modeTitle = style({
  marginTop: 22,
  fontFamily: '"Barlow Condensed", sans-serif',
  fontSize: 28,
  fontWeight: 700
})

export const modeDescription = style({
  flex: 1,
  marginTop: 10,
  color: colors.muted,
  fontSize: 13,
  lineHeight: 1.5
})

export const modeFooter = style({ marginTop: 22 })

export const cardsGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
  gap: 13
})

export const card = style({
  position: 'relative',
  minHeight: 155,
  overflow: 'hidden',
  padding: 17,
  border: '1px solid rgba(255, 115, 119, 0.2)',
  borderRadius: 16,
  background:
    'radial-gradient(circle at 95% 5%, rgba(255, 115, 119, 0.15), transparent 34%), linear-gradient(150deg, #2a1d3f, #1b172e)',
  selectors: {
    '&::after': {
      position: 'absolute',
      right: -22,
      bottom: -32,
      width: 94,
      height: 94,
      border: '1px solid rgba(255, 115, 119, 0.16)',
      borderRadius: '50%',
      content: ''
    }
  }
})

export const cardId = style({
  color: colors.coral,
  fontFamily: '"Roboto Mono", monospace',
  fontSize: 10
})

export const cardName = style({
  position: 'relative',
  zIndex: 1,
  maxWidth: 150,
  marginTop: 31,
  fontFamily: '"Barlow Condensed", sans-serif',
  fontSize: 21,
  fontWeight: 700,
  lineHeight: 1.05
})

export const cardMeta = style({
  position: 'absolute',
  right: 17,
  bottom: 15,
  left: 17,
  color: colors.muted,
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase'
})

export const deckCard = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  gap: 28,
  alignItems: 'center',
  padding: 'clamp(22px, 4vw, 36px)',
  border: '1px solid rgba(255, 115, 119, 0.28)',
  borderRadius: 22,
  background:
    'radial-gradient(circle at 88% 18%, rgba(255, 115, 119, 0.14), transparent 30%), rgba(30, 22, 57, 0.88)',
  '@media': { [compact]: { gridTemplateColumns: '1fr' } }
})

export const deckPrism = style({
  color: colors.coral,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.15em',
  textTransform: 'uppercase'
})

export const deckTitle = style({
  marginTop: 10,
  fontFamily: '"Barlow Condensed", sans-serif',
  fontSize: 32,
  fontWeight: 700
})

export const deckDetails = style({
  marginTop: 10,
  color: colors.muted,
  fontSize: 13,
  lineHeight: 1.5
})

export const passTrack = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(5, minmax(130px, 1fr))',
  gap: 12,
  overflowX: 'auto',
  paddingBottom: 8
})

export const passLevel = style({
  minHeight: 170,
  padding: 18,
  border: `1px solid ${colors.line}`,
  borderRadius: 17,
  background: colors.panel,
  opacity: 0.7
})

export const passLevelCurrent = style({
  borderColor: 'rgba(80, 221, 255, 0.42)',
  background:
    'linear-gradient(150deg, rgba(29, 79, 112, 0.6), rgba(42, 32, 76, 0.9))',
  opacity: 1
})

export const passLevelNumber = style({
  color: colors.cyan,
  fontFamily: '"Roboto Mono", monospace',
  fontSize: 11
})

export const passReward = style({
  marginTop: 40,
  fontSize: 14,
  fontWeight: 700,
  lineHeight: 1.35
})

export const passState = style({ marginTop: 10, color: colors.muted, fontSize: 11 })

export const accountGrid = style({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 0.85fr) minmax(0, 1.15fr)',
  gap: 18,
  '@media': { 'screen and (max-width: 1040px)': { gridTemplateColumns: '1fr' } }
})

export const profileRow = style({ display: 'flex', alignItems: 'center', gap: 16 })

export const profileAvatar = style({
  display: 'grid',
  width: 64,
  height: 64,
  flex: '0 0 64px',
  placeItems: 'center',
  overflow: 'hidden',
  border: `1px solid ${colors.lineStrong}`,
  borderRadius: 19,
  background: colors.panelRaised,
  fontSize: 22,
  fontWeight: 700
})

export const profileName = style({ fontSize: 18, fontWeight: 700 })

export const profileEmail = style({ marginTop: 6, color: colors.muted, fontSize: 12 })

export const accountFacts = style({
  display: 'grid',
  gap: 1,
  overflow: 'hidden',
  marginTop: 24,
  borderRadius: 13
})

export const accountFact = style({
  display: 'grid',
  gridTemplateColumns: '130px minmax(0, 1fr)',
  gap: 12,
  padding: '14px 15px',
  background: 'rgba(8, 6, 19, 0.36)',
  fontSize: 12,
  '@media': { [compact]: { gridTemplateColumns: '1fr', gap: 5 } }
})

export const accountFactLabel = style({ color: colors.muted })

export const optionalBadge = style({
  display: 'inline-flex',
  minHeight: 24,
  alignItems: 'center',
  padding: '0 8px',
  border: `1px solid ${colors.lineStrong}`,
  borderRadius: 99,
  color: colors.violet,
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: '0.1em',
  textTransform: 'uppercase'
})

export const walletEmpty = style({
  marginTop: 18,
  padding: 20,
  border: `1px dashed ${colors.lineStrong}`,
  borderRadius: 15,
  background: 'rgba(8, 6, 19, 0.22)'
})

export const walletTitle = style({ fontSize: 14, fontWeight: 700 })

export const walletDescription = style({
  marginTop: 7,
  color: colors.muted,
  fontSize: 12,
  lineHeight: 1.5
})

export const walletAddress = style({
  overflow: 'hidden',
  marginTop: 7,
  color: colors.cyan,
  fontFamily: '"Roboto Mono", monospace',
  fontSize: 11,
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap'
})

export const notice = style({
  marginBottom: 18,
  padding: '14px 16px',
  border: '1px solid rgba(255, 195, 92, 0.22)',
  borderRadius: 13,
  background: 'rgba(255, 195, 92, 0.06)',
  color: '#d7caa9',
  fontSize: 12,
  lineHeight: 1.5
})

export const errorPanel = style({
  maxWidth: 560,
  margin: '15vh auto 0',
  padding: 30,
  border: `1px solid ${colors.lineStrong}`,
  borderRadius: 20,
  background: colors.panel,
  textAlign: 'center'
})

export const errorTitle = style({
  fontFamily: '"Barlow Condensed", sans-serif',
  fontSize: 30,
  fontWeight: 700
})

export const errorText = style({
  marginTop: 10,
  color: colors.muted,
  fontSize: 13,
  lineHeight: 1.5
})

export const loading = style({
  display: 'grid',
  minHeight: '100dvh',
  placeItems: 'center',
  color: colors.text,
  background: colors.ink
})

export const loadingInner = style({ textAlign: 'center' })

export const loadingMark = style({ margin: '0 auto 16px' })

export const loadingText = style({ color: colors.muted, fontSize: 13 })

export const bottomNav = style({
  position: 'fixed',
  right: 10,
  bottom: 10,
  left: 10,
  zIndex: 12,
  display: 'none',
  gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
  minHeight: 70,
  overflow: 'hidden',
  padding: 6,
  border: `1px solid ${colors.lineStrong}`,
  borderRadius: 18,
  background: 'rgba(18, 13, 38, 0.94)',
  boxShadow: '0 18px 50px rgba(0, 0, 0, 0.42)',
  backdropFilter: 'blur(18px)',
  '@media': { [mobile]: { display: 'grid' } }
})

export const bottomNavItem = style({
  display: 'flex',
  minWidth: 0,
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 13,
  color: colors.muted,
  fontSize: 10,
  fontWeight: 600,
  selectors: {
    '&:focus-visible': { outline: `2px solid ${colors.cyan}`, outlineOffset: -2 }
  }
})

export const bottomNavItemActive = style({
  background: 'rgba(170, 140, 255, 0.14)',
  color: colors.text
})

globalStyle(`${shell} button, ${shell} a`, { WebkitTapHighlightColor: 'transparent' })
globalStyle(`${navItem} > div`, { flex: '0 0 auto' })
globalStyle(`${bottomNavItem} > div`, { display: 'none' })
