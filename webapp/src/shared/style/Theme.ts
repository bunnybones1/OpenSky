import { StyleRule } from '@vanilla-extract/css'
import { Properties, SimplePseudos } from 'csstype'
import { isEqual, mapValues, omit } from 'lodash-es'

/* COLORS */

const grays = {
  gray1: '#111111',
  gray2: '#262626',
  gray3: '#333333',
  gray4: '#444444',
  gray5: '#555555',
  gray6: '#666666',
  gray7: '#777777',
  gray8: '#9D9D9D',
  gray9: '#DDDDDD',
  black: '#000000',
  white: '#ffffff',
  transparent: 'transparent'
}

const purples = {
  purple1: '#0c061e',
  purple2: '#170D30',
  purple3: '#1c1038',
  purple4: '#231445',
  purple5: '#40306B',
  purple6: '#4d3c7b',
  purple7: '#705BAB',
  purple8: '#ac8fff',
  purple9: '#c5b4f5',
  purple10: '#5E3EB9',
  purple11: '#8978c6'
}

const pink = {
  pink1: '#4d092d',
  pink2: '#60103a',
  pink3: '#6c104d',
  pink4: '#7d1a4e',
  pink5: '#ac1e69',
  pink6: '#ff429d',
  pink7: '#ff74d0'
}

const warm = {
  warm1: '#290304',
  warm2: '#4E0405',
  warm3: '#A9090B',
  warm4: '#BC4918',
  warm5: '#DE7717',
  warm6: '#FDB000',
  warm7: '#FFC051',
  warm8: '#ff730d',
  warm9: '#ff3636'
}

const cold = {
  cold1: '#00161F',
  cold2: '#002939',
  cold3: '#006A93',
  cold4: '#0181B3',
  cold5: '#0798D6',
  cold6: '#0AB5FF',
  cold7: '#00D7FD',
  cold8: '#52FFFF',
  cold9: '#1A75FD',
  cold10: '#0C91BB'
}

const forest = {
  forest1: '#091d11',
  forest2: '#154528',
  forest3: '#309d5b',
  forest4: '#36ad65',
  forest5: '#4ad578',
  forest6: '#2eff80',
  forest7: '#acffcd'
}

const prisms = {
  STR: '#FC5357',
  AGY: '#9DE443',
  WIS: '#F06AED',
  HRT: '#8F59F4',
  INT: '#37B1FF'
}

const cardTypes = {
  unit: '#FF9C00',
  spell: '#00FFF6'
}

export const THEME_COLORS = {
  ...grays,
  ...purples,
  ...pink,
  ...forest,
  ...warm,
  ...cold,
  ...forest,
  ...prisms,
  ...cardTypes
}

export type ThemeColorType = keyof typeof THEME_COLORS

/* SPACING */

const SPACE_VALUE = 4
const px = (value: string | number) => `${value}px`

export const THEME_SPACING = {
  '0px': '0',
  '4px': px(1 * SPACE_VALUE),
  '8px': px(2 * SPACE_VALUE),
  '12px': px(3 * SPACE_VALUE),
  '16px': px(4 * SPACE_VALUE),
  '20px': px(5 * SPACE_VALUE),
  '24px': px(6 * SPACE_VALUE),
  '32px': px(8 * SPACE_VALUE),
  '36px': px(9 * SPACE_VALUE),
  '48px': px(12 * SPACE_VALUE),
  '60px': px(15 * SPACE_VALUE),
  '96px': px(24 * SPACE_VALUE),
  '120px': px(30 * SPACE_VALUE)
}

export type ThemeSpacingType = keyof typeof THEME_SPACING

/* BREAKPOINTS */

type CSSProps = Properties<string | number> & {
  [P in SimplePseudos]?: Properties<string | number>
}

export const BREAKPOINTS = {
  base: 0,
  mobile: 680,
  tablet: 900,
  tabletWide: 1080,
  desktop: 1440,
  desktopWide: 1921,
  desktopUltrawide: 3440
} as const

export const queries = mapValues(
  omit(BREAKPOINTS, 'base'),
  (breakpoint) => `screen and (min-width: ${breakpoint}px)`
)

const makeMediaQuery =
  (breakpoint: keyof typeof queries) => (styles: Properties<string | number>) =>
    !styles || Object.keys(styles).length === 0
      ? {}
      : {
          [queries[breakpoint]]: styles
        }

interface ResponsiveStyle {
  mobile?: CSSProps
  tablet?: CSSProps
  tabletWide?: CSSProps
  desktop?: CSSProps
  desktopWide?: CSSProps
  desktopUltrawide?: CSSProps
}

const mediaQuery = {
  mobile: makeMediaQuery('mobile'),
  tablet: makeMediaQuery('tablet'),
  tabletWide: makeMediaQuery('tabletWide'),
  desktop: makeMediaQuery('desktop'),
  desktopWide: makeMediaQuery('desktopWide'),
  desktopUltrawide: makeMediaQuery('desktopUltrawide')
}

export const responsiveStyle = ({
  mobile,
  tablet,
  tabletWide,
  desktop,
  desktopWide,
  desktopUltrawide
}: ResponsiveStyle): StyleRule => {
  const mobileStyles = omit(mobile, '@media')

  const tabletStyles = !tablet || isEqual(tablet, mobileStyles) ? null : tablet

  const styledBelowTabletWide = tabletStyles || mobileStyles

  const tabletWideStyles =
    !tabletWide || isEqual(tabletWide, styledBelowTabletWide) ? null : tabletWide

  const stylesBelowDesktop = tabletWideStyles || tabletStyles || mobileStyles

  const desktopStyles =
    !desktop || isEqual(desktop, stylesBelowDesktop) ? null : desktop

  const stylesBelowWide =
    desktopStyles || tabletWideStyles || tabletStyles || mobileStyles

  const wideStyles =
    !desktopWide || isEqual(desktopWide, stylesBelowWide) ? null : desktopWide

  const stylesBelowUltrawide =
    wideStyles || desktopStyles || tabletWideStyles || tabletStyles || mobileStyles

  const ultraWideStyles =
    !desktopUltrawide || isEqual(desktopUltrawide, stylesBelowUltrawide)
      ? null
      : desktopUltrawide

  const hasMediaQueries =
    !!tabletStyles ||
    !!tabletWideStyles ||
    !!desktopStyles ||
    !!wideStyles ||
    !!ultraWideStyles

  return {
    ...mobileStyles,
    ...(hasMediaQueries
      ? {
          '@media': {
            ...(tabletStyles ? mediaQuery.tablet(tabletStyles) : {}),
            ...(tabletWideStyles ? mediaQuery.tabletWide(tabletWideStyles) : {}),
            ...(desktopStyles ? mediaQuery.desktop(desktopStyles) : {}),
            ...(wideStyles ? mediaQuery.desktopWide(wideStyles) : {}),
            ...(ultraWideStyles ? mediaQuery.desktopUltrawide(ultraWideStyles) : {})
          }
        }
      : {})
  }
}

// BUTTON COLORS

export const BUTTON_COLOR_TYPES = [
  'default',
  'secondary',
  'blue',
  'green',
  'orange',
  'red'
] as const

export type ButtonColorTypes = (typeof BUTTON_COLOR_TYPES)[number]

export const BUTTON_BACKGROUNDS: {
  [key in ButtonColorTypes]: string
} = {
  default: 'linear-gradient(180deg, #2E2152 46.09%, #241844 46.79%)',
  secondary: 'linear-gradient(180deg, #4A3D77 46.09%, #3C2F64 46.77%)',
  blue: 'linear-gradient(180deg, #0081B2 46.09%, #006B93 46.78%)',
  green: `linear-gradient(180deg, #3EB06B 46.09%, ${THEME_COLORS.forest3} 46.78%)`,
  orange:
    'radial-gradient(36.04% 104.73% at 50% 100%, #FDB000 0%, #FEAB03 0.01%, rgba(253, 176, 0, 0) 100%), linear-gradient(180deg, #DE7717 46.09%, #BC4918 46.78%)',
  red: `linear-gradient(180deg, #6C1058 46.09%, ${THEME_COLORS.pink1} 46.79%)`
}

export const BUTTON_HOVER_BACKGROUNDS: {
  [key in ButtonColorTypes]: string
} = {
  default: 'linear-gradient(180deg, #3E3068 46.09%, #33255B 46.77%)',
  secondary: 'linear-gradient(180deg, #58488D 46.09%, #4F4082 46.77%)',
  blue: 'linear-gradient(180deg, #11A1DE 46.09%, #0078A6 46.78%)',
  green: `linear-gradient(180deg, #47C679 46.09%, ${THEME_COLORS.forest4} 46.78%)`,
  orange:
    'radial-gradient(36.04% 104.73% at 50% 100%, #FDB000 0%, #FEAB03 0.01%, rgba(253, 176, 0, 0) 100%), linear-gradient(180deg, #DE7717 46.09%, #BC4918 46.78%)',
  red: `linear-gradient(180deg, #6C1058 46.09%, ${THEME_COLORS.pink1} 46.79%)`
}

export const BUTTON_FILTERS: {
  [key in ButtonColorTypes]: string
} = {
  default: '',
  secondary: '',
  blue: '',
  green: '',
  orange: '',
  red: ''
}
