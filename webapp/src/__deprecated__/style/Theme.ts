import { BarlowCondensedName, BarlowName, MonoName } from '~/shared/style/constants'

const grays = {
  gray1: '#111111',
  gray2: '#262626',
  gray3: '#333333',
  gray4: '#444444',
  gray5: '#555555',
  gray6: '#666666',
  gray7: '#777777',
  gray8: '#DDDDDD',
  grayBlue: '#29303A',
  black: '#000000',
  baseGray: '#9D9D9D',
  white: '#ffffff'
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
  cold9: '#1A75FD'
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

export const colors = {
  ...grays,
  ...purples,
  ...pink,
  ...forest,
  ...warm,
  ...cold,
  ...forest
}

// This array enables the responsive styling within styled-system
// eg. mx={[0, 1, 2]}, with 0 representing 880 and below, 1 representing
// 1250 and below, and 2 everything else
export const breakpoints = ['680px', '900px', '1080px', '1440px', '1921px', '3440px']

// This object enables shortform responsive styling within styled-components
// eg. ${props => props.theme.mediaQueries.mobile} {
//    some style
// }
// inside of a new styled-component
export const mediaQueries = {
  mobileSmall: `@media (max-width: ${breakpoints[0]})`,
  mobile: `@media (max-width: ${breakpoints[1]})`,
  tablet: `@media (max-width: ${breakpoints[2]})`,
  large: `@media (min-width: ${breakpoints[3]})`,
  wide: `@media (min-width: ${breakpoints[4]})`,
  ultrawide: `@media (min-width: ${breakpoints[5]})`
}

const space = [0, 4, 8, 12, 16, 20, 24]

const fontFamilies = {
  mono: MonoName,
  primary: BarlowName,
  condensed: BarlowCondensedName
}

const fontSizes = [10, 12, 14, 16, 18, 20, 22]

const regular = 400
const medium = 500
const bold = 600
const extraBold = 700

export const fontWeights = {
  bold,
  extraBold,
  medium,
  regular
}

export const transition = '0.125s ease-in-out'

export const boxShadows = [
  '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.2)',
  '0 3px 6px 0 rgba(0, 0, 0, 0.16), 0 3px 6px 0 rgba(0, 0, 0, 0.23)',
  '0 10px 20px 0 rgba(0, 0, 0, 0.19), 0 6px 6px 0 rgba(0, 0, 0, 0.26)'
]

/**
 * @deprecated Use ~/shared/style/Theme where possible
 */
export const Theme = {
  useCustomProperties: false,
  bold,
  boxShadows,
  breakpoints,
  colors,
  fontFamilies,
  fontSizes,
  fontWeights,
  mediaQueries,
  medium,
  regular,
  space,
  transition
}

export type ThemeInterface = typeof Theme
