import { globalStyle } from '@vanilla-extract/css'

import {
  SAI_BOTTOM_KEY,
  SAI_LEFT_KEY,
  SAI_RIGHT_KEY,
  SAI_TOP_KEY,
  TOP_OFFSET_KEY
} from './shared/style/constants'
import { responsiveStyle } from './shared/style/Theme'
import { ThemeVars } from './shared/style/Theme.css'

globalStyle('*, *::before, *::after', {
  boxSizing: 'border-box',
  margin: 0,
  padding: 0,
  WebkitTapHighlightColor: 'rgba(0, 0, 0, 0)'
})

globalStyle('*::-webkit-scrollbar', {
  backgroundColor: ThemeVars.color.purple4,
  ...responsiveStyle({
    mobile: { width: '5px' },
    tablet: { width: '5px' },
    desktop: { width: '15px' }
  })
})

globalStyle('*::-webkit-scrollbar-thumb', {
  border: '3px solid transparent',
  backgroundClip: 'content-box',
  backgroundColor: '#6c5ca7',
  ...responsiveStyle({
    mobile: {
      border: '0px solid transparent',
      borderRadius: '0px'
    },
    tablet: {
      border: '0px solid transparent',
      borderRadius: '0px'
    },
    desktop: {
      border: '3px solid transparent',
      borderRadius: '10px'
    }
  })
})

globalStyle('*::-webkit-scrollbar-corner', {
  backgroundColor: ThemeVars.color.purple4
})

globalStyle('*::-webkit-scrollbar-track', {
  boxShadow: `0 0 3px ${ThemeVars.color.purple1} inset`
})

globalStyle(
  `
  html,
  body,
  div,
  span,
  applet,
  object,
  iframe,
  h1,
  h2,
  h3,
  h4,
  h5,
  h6,
  p,
  blockquote,
  pre,
  a,
  abbr,
  acronym,
  address,
  big,
  cite,
  code,
  del,
  dfn,
  em,
  img,
  ins,
  kbd,
  q,
  s,
  samp,
  small,
  strike,
  strong,
  sub,
  sup,
  tt,
  var,
  b,
  u,
  i,
  center,
  dl,
  dt,
  dd,
  ol,
  ul,
  li,
  fieldset,
  form,
  label,
  legend,
  table,
  caption,
  tbody,
  tfoot,
  thead,
  tr,
  th,
  td,
  article,
  aside,
  canvas,
  details,
  embed,
  figure,
  figcaption,
  footer,
  header,
  hgroup,
  main,
  menu,
  nav,
  output,
  ruby,
  section,
  summary,
  time,
  mark,
  audio,
  video
`,
  {
    margin: 0,
    padding: 0,
    border: 0,
    fontSize: '100%',
    font: 'inherit',
    verticalAlign: 'baseline'
  }
)

globalStyle(
  `
  article,
  aside,
  details,
  figcaption,
  figure,
  footer,
  header,
  hgroup,
  main,
  menu,
  nav,
  section
`,
  {
    display: 'block'
  }
)

globalStyle('*[hidden]', { display: 'none' })

globalStyle('body', {
  lineHeight: 1,
  touchAction: 'manipulation',
  overscrollBehavior: 'none',
  overflowY: 'auto',
  overflowX: 'hidden',
  width: '100%',
  fontSize: '1rem',
  position: 'relative',
  paddingLeft: 'env(safe-area-inset-left, 0px)',
  paddingRight: 'env(safe-area-inset-right, 0px)'
})

globalStyle('body.scrollBody', {
  overflowY: 'scroll'
})

globalStyle('body, html', {
  textSizeAdjust: 'none',
  WebkitTextSizeAdjust: 'none',
  MozTextSizeAdjust: 'none',
  WebkitFontSmoothing: 'antialiased'
})

globalStyle('html', {
  fontFamily: '"Barlow", sans-serif'
})

globalStyle('html, body, #app', {
  height: '100%',
  minHeight: '100%',
  margin: 0,
  padding: 0,
  backgroundColor: ThemeVars.color.purple1
})

globalStyle('ol, ul', { listStyle: 'none' })
globalStyle('blockquote, q', { quotes: 'none' })
globalStyle('blockquote:before, blockquote:after, q:before, q:after', {
  content: 'none'
})
globalStyle('table', {
  borderCollapse: 'collapse',
  borderSpacing: 0
})

globalStyle('a', { textDecoration: 'none' })

globalStyle('input:focus, select:focus, textarea:focus, button:focus', {
  outline: 'none'
})

globalStyle('button', {
  background: 0,
  border: 0,
  WebkitTapHighlightColor: 'rgba(0, 0, 0, 0)'
})

globalStyle('li', {
  listStyle: 'none'
})

globalStyle(':root', {
  vars: {
    [SAI_TOP_KEY]: 'env(safe-area-inset-top)',
    [SAI_RIGHT_KEY]: 'env(safe-area-inset-right)',
    [SAI_BOTTOM_KEY]: 'env(safe-area-inset-bottom)',
    [SAI_LEFT_KEY]: 'env(safe-area-inset-left)',
    [TOP_OFFSET_KEY]: '0px'
  }
})

globalStyle('span.whiteText', {
  color: ThemeVars.color.white
})

globalStyle('strong', {
  fontWeight: 700
})

globalStyle('strong.whiteText', {
  color: ThemeVars.color.white
})
