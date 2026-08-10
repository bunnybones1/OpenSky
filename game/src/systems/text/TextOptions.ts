import { descriptionTokenColors } from '@opensky/parse-card-description'
import device from '@opensky/shared/device'
import { Color, Vector2 } from 'three'

import {
  COLOR_BLACK,
  COLOR_LILAC,
  COLOR_PALE_BUFFED_TEXT,
  COLOR_PALE_NERFED_TEXT,
  COLOR_PRIZE_UPGRADE_CYAN,
  COLOR_WHITE
} from '~/colors/colorLibrary'
import Gradient from '~/colors/Gradient'
import { ERROR_MODAL_WIDTH, TEXT_EDGE_FIX_ALPHA_TEST } from '~/constants'

import FontFace, { fontFaces } from './FontFace'
import { textLayouts } from './TextLayoutOptions'
import TextMesh from './TextMesh'
import { textStyles } from './TextStyleOptions'

export interface TextOptions {
  use2dMode: boolean
  fontFace: FontFace
  size: number
  align: 'left' | 'center' | 'right'
  vAlign: 'top' | 'center' | 'bottom'
  width?: number
  lineHeight?: number
  letterSpacing: number
  color: Color | Gradient | string | number
  strokeWidth: number
  strokeBias: number
  strokeColor: Color | string | number
  weight: number
  alphaTest: number
  scaleDownToPhysicalSize: boolean
  shadow: boolean
  screenSpace: boolean
  constantSizeOnScreen?: boolean
  offset?: Vector2
  bakedOffset?: Vector2
  prescale?: number
  contrastMultiplier: number
  onTextChanged?: (textMesh: TextMesh, newText: string, oldText: string) => void
  cacheHashFudge: string
  useDerivative: boolean
}

export const generic: TextOptions = {
  use2dMode: false,
  fontFace: fontFaces.BarlowBold,
  size: 16,
  align: 'center',
  vAlign: 'center',
  letterSpacing: 0,
  color: COLOR_WHITE,
  strokeWidth: 0,
  strokeBias: 1.0,
  weight: 0,
  alphaTest: 0,
  strokeColor: COLOR_BLACK,
  scaleDownToPhysicalSize: true,
  shadow: false,
  screenSpace: false,
  constantSizeOnScreen: false,
  prescale: 1,
  contrastMultiplier: 80,
  cacheHashFudge: '',
  useDerivative: true
}

export const skyTagName: TextOptions = {
  ...generic,
  size: 17,
  vAlign: 'top',
  fontFace: fontFaces.BarlowMedium
}
export const titleName: TextOptions = {
  ...generic,
  size: 10,
  fontFace: fontFaces.BarlowBold
}
export const titleNameGlow: TextOptions = {
  ...titleName,
  weight: 0,
  contrastMultiplier: 1,
  useDerivative: false,
  fontFace: fontFaces.BarlowBoldShadow
}

export const skyTagRank: TextOptions = {
  ...generic,
  size: 12.5,
  vAlign: 'top',
  fontFace: fontFaces.BarlowMedium,
  color: 0xb0dcd5
}

export const cardDescription: TextOptions = {
  ...generic,
  ...textLayouts.cardText,
  lineHeight: 1.175,
  size: 10,
  fontFace: fontFaces.BarlowSemiBold,
  color: descriptionTokenColors.normal
}

export const cardHeroAbilityDescription: TextOptions = {
  ...cardDescription,
  ...textLayouts.cardHeroAbilityText
}

export const shadowSettings: Partial<TextOptions> = {
  color: COLOR_BLACK,
  weight: 0.8,
  contrastMultiplier: 80 / 3
}

export const cardName: TextOptions = {
  ...generic,
  ...textStyles.title,
  size: 13
}
export const cardNameShadow: TextOptions = {
  ...cardName,
  fontFace: fontFaces.BarlowBoldShadow,
  ...shadowSettings
}

export const heroAbilityName: TextOptions = {
  ...generic,
  ...textStyles.title,
  size: 10.5
}
export const heroAbilityNameShadow: TextOptions = {
  ...heroAbilityName,
  fontFace: fontFaces.BarlowBoldShadow,
  ...shadowSettings
}

export const rowIcons: TextOptions = {
  ...cardName
}

export const rowIconsShadow: TextOptions = {
  ...cardNameShadow,
  color: COLOR_BLACK,
  weight: 0.6
}

export const cardDetailLabel: TextOptions = {
  ...cardName,
  color: COLOR_BLACK,
  size: 7.5
}
export const cardTraits: TextOptions = {
  ...generic,
  ...textLayouts.cardText,
  fontFace: fontFaces.BarlowMedium,
  size: 9
}
export const cardTraitBadgeLabel: TextOptions = {
  ...cardTraits,
  align: 'left',
  vAlign: 'center',
  size: 22,
  width: undefined
}
export const cardNumber: TextOptions = {
  ...generic,
  ...textStyles.bigNumber,
  size: 30
}

export const cardNumberShadow: TextOptions = {
  ...cardNumber,
  color: COLOR_BLACK,
  fontFace: fontFaces.BarlowBoldShadow,
  ...shadowSettings,
  weight: 0.95
}

export const cardManaCost: TextOptions = {
  ...cardNumber,
  color: COLOR_BLACK,
  ...textStyles.manaCostNumber,
  ...textLayouts.centered,
  size: 19
}
export const cardManaCostShadow: TextOptions = {
  ...cardManaCost,
  color: COLOR_BLACK,
  fontFace: fontFaces.BarlowBoldShadow,
  ...shadowSettings,
  weight: 0.6
}
export const attachedSpellManaCost: TextOptions = {
  ...cardNumber,
  ...textStyles.manaCostNumber,
  size: 14
}
export const attachedSpellManaCostShadow: TextOptions = {
  ...attachedSpellManaCost,
  fontFace: fontFaces.BarlowBoldShadow,
  ...shadowSettings,
  weight: 0.8
}
export const attachmentPopup: TextOptions = {
  ...cardNumber,
  ...textLayouts.centered,
  size: 24
}
export const attachmentPopupPositive: TextOptions = {
  ...attachmentPopup,
  color: COLOR_PALE_BUFFED_TEXT
}
export const attachmentPopupNegative: TextOptions = {
  ...attachmentPopup,
  color: COLOR_PALE_NERFED_TEXT
}
export const attachmentPopupShadow: TextOptions = {
  ...attachmentPopup,
  fontFace: fontFaces.BarlowBoldShadow,
  ...shadowSettings
}
export const cardUnitAttackHealth: TextOptions = {
  ...cardNumber,
  ...textLayouts.centered,
  size: 21
}
export const cardUnitAttackHealthShadow: TextOptions = {
  ...cardUnitAttackHealth,
  fontFace: fontFaces.BarlowBoldShadow,
  ...shadowSettings,
  weight: 0.9,
  alphaTest: TEXT_EDGE_FIX_ALPHA_TEST
}
export const heroAbilityCounter: TextOptions = {
  ...cardNumber,
  ...textLayouts.centered,
  size: 16
}
export const heroAbilityCounterShadow: TextOptions = {
  ...heroAbilityCounter,
  fontFace: fontFaces.BarlowBoldShadow,
  ...shadowSettings,
  weight: 0.8,
  alphaTest: TEXT_EDGE_FIX_ALPHA_TEST
}
export const heroAbilityMiniCounter: TextOptions = {
  ...heroAbilityCounter,
  size: 11
}
export const heroAbilityMiniCounterShadow: TextOptions = {
  ...heroAbilityCounterShadow,
  size: 11
}
export const elementIconText: TextOptions = {
  ...cardName,
  vAlign: 'top',
  size: 20,
  lineHeight: 1,
  color: COLOR_BLACK
}
export const elementIconTextShadow: TextOptions = {
  ...elementIconText,
  fontFace: fontFaces.BarlowBoldShadow,
  ...shadowSettings,
  weight: 0.95
}

export const heroName: TextOptions = {
  ...cardName,
  size: 14
}
export const heroNameShadow: TextOptions = {
  ...heroName,
  fontFace: fontFaces.BarlowBoldShadow,
  ...shadowSettings
}
export const characterAttackHealth: TextOptions = {
  ...cardUnitAttackHealth,
  size: 34
}
export const characterAttackHealthShadow: TextOptions = {
  ...characterAttackHealth,
  fontFace: fontFaces.BarlowBoldShadow,
  ...shadowSettings,
  weight: 0.8,
  alphaTest: TEXT_EDGE_FIX_ALPHA_TEST
}
export const damageNumber: TextOptions = {
  ...cardNumber,
  ...textStyles.damageNumber,
  size: 72
}
export const damageNumberFatigue: TextOptions = {
  ...damageNumber,
  cacheHashFudge: 'fatigue'
}
export const damageNumberShadow: TextOptions = {
  ...damageNumber,
  fontFace: fontFaces.BarlowBoldShadow,
  ...shadowSettings,
  weight: 0,
  alphaTest: TEXT_EDGE_FIX_ALPHA_TEST
}
export const buffNumber: TextOptions = {
  ...cardNumber,
  ...textStyles.buffNumber,
  size: 72
}
export const buffNumberShadow: TextOptions = {
  ...buffNumber,
  fontFace: fontFaces.BarlowBoldShadow,
  ...shadowSettings,
  weight: 0
}

export const speechBubbleText: TextOptions = {
  ...generic,
  ...textLayouts.speechBubble,
  size: 18,
  lineHeight: 1.5,
  scaleDownToPhysicalSize: false
}

export const infoFlyoutTitle: TextOptions = {
  ...generic,
  ...textLayouts.infoFlyout,
  size: 18,
  scaleDownToPhysicalSize: false
}

export const infoFlyoutSubtitle: TextOptions = {
  ...infoFlyoutTitle,
  color: COLOR_BLACK,
  align: 'right',
  size: 13
}

export const infoFlyoutBody: TextOptions = {
  ...infoFlyoutTitle,
  fontFace: fontFaces.BarlowMedium,
  vAlign: 'center'
}

export const loreFlyoutBody: TextOptions = {
  ...infoFlyoutTitle,
  fontFace: fontFaces.BarlowMedium,
  color: '#c5b4f5'
}

export const bigModalText: TextOptions = {
  ...generic,
  fontFace: fontFaces.BarlowCondensedMedium,
  size: 28
}

export const modalTitle: TextOptions = {
  ...bigModalText,
  color: '#bfb3ef'
}

export const smallModalText: TextOptions = {
  ...generic,
  fontFace: fontFaces.BarlowMedium,
  size: 19
}

export const errorTitle: TextOptions = {
  ...generic,
  fontFace: fontFaces.BarlowBold,
  size: 28,
  color: COLOR_WHITE,
  vAlign: 'top',
  width: ERROR_MODAL_WIDTH - 40
}

export const errorMiddle: TextOptions = {
  ...errorTitle,
  fontFace: fontFaces.BarlowMedium,
  size: 26,
  color: 0xac8fff
}

export const errorBody: TextOptions = {
  ...errorTitle,
  fontFace: fontFaces.BarlowMedium,
  size: 16,
  color: 0x705bab,
  align: 'left'
}

export const splashTitle: TextOptions = {
  ...generic,
  fontFace: fontFaces.BarlowCondensedSemiBold,
  scaleDownToPhysicalSize: false,
  vAlign: 'center',
  color: 0xc5b4f5,
  size: 38,
  align: 'center'
}

export const splashDescription: TextOptions = {
  ...generic,
  fontFace: fontFaces.BarlowRegular,
  scaleDownToPhysicalSize: false,
  color: 0xc5b4f5,
  size: 12,
  vAlign: 'top',
  align: 'center'
}
export const rewardsLineItem: TextOptions = {
  ...splashDescription,
  align: 'left',
  size: 20
}
export const rewardUpgraded: TextOptions = {
  ...rewardsLineItem,
  fontFace: fontFaces.BarlowBold,
  align: 'right',
  vAlign: 'center',
  color: COLOR_PRIZE_UPGRADE_CYAN
}
export const vs: TextOptions = {
  ...generic,
  fontFace: fontFaces.BarlowBold,
  size: device.isMobile ? 154 : 260,
  scaleDownToPhysicalSize: false,
  vAlign: 'center',
  color: 0xf2f3e1
}
export const vsTitles: TextOptions = {
  ...generic,
  fontFace: fontFaces.BarlowCondensedMedium,
  scaleDownToPhysicalSize: false,
  color: COLOR_WHITE,
  size: device.isMobile ? 40 : 80,
  vAlign: 'center',
  align: 'center'
}
export const vsSubTitles: TextOptions = {
  ...vsTitles,
  size: device.isMobile ? 16 : 35
}
export const matchEndGameType: TextOptions = {
  ...vsTitles,
  fontFace: fontFaces.BarlowRegular,
  size: device.isMobile ? 16 : 35
}
export const endTurnButtonText: TextOptions = {
  ...generic,
  fontFace: fontFaces.BarlowCondensedBold,
  size: 29,
  scaleDownToPhysicalSize: false,
  vAlign: 'center'
}

export const buttonText: TextOptions = {
  ...generic,
  fontFace: fontFaces.BarlowBold,
  size: device.isMobile ? 22 : 16,
  scaleDownToPhysicalSize: false,
  vAlign: 'center'
}

export const fastForwardButtonText: TextOptions = {
  ...buttonText,
  size: 16,
  fontFace: fontFaces.BarlowCondensedMedium
}

export const optionsButtonText: TextOptions = {
  ...buttonText,
  fontFace: fontFaces.BarlowCondensedMedium
}
export const replayButtonText: TextOptions = {
  ...buttonText,
  fontFace: fontFaces.BarlowBold,
  size: 22
}

export const rankResultText: TextOptions = {
  ...generic,
  fontFace: fontFaces.BarlowBold,
  size: device.isMobile ? 22 : 16,
  scaleDownToPhysicalSize: false,
  vAlign: 'center'
}

export const cardCountText: TextOptions = {
  ...buttonText,
  size: 16
}

export const buttonTextTopLeft: TextOptions = {
  ...buttonText,
  vAlign: 'top',
  align: 'left'
}
export const buttonTextShadow: TextOptions = {
  ...buttonText,
  fontFace: fontFaces.BarlowBoldShadow,
  ...shadowSettings,
  bakedOffset: new Vector2(0, -8)
}

export const buttonTextSmall: TextOptions = {
  ...buttonText,
  size: buttonText.size * 0.75
}

export const tutorialTryAgainButtonText: TextOptions = {
  ...generic,
  fontFace: fontFaces.BarlowBold,
  size: 22,
  scaleDownToPhysicalSize: false,
  vAlign: 'center'
}

export const link: TextOptions = {
  ...buttonText,
  size: 24,
  align: 'left'
}

export const sliderLabelText: TextOptions = {
  ...optionsButtonText,
  fontFace: fontFaces.BarlowMedium,
  size: 16,
  align: 'left',
  width: 170,
  lineHeight: 0.9
}

export const sliderValueText: TextOptions = {
  ...sliderLabelText,
  width: 350
}

export const sliderOnBarLabelText: TextOptions = {
  ...sliderValueText,
  align: 'center',
  strokeColor: COLOR_BLACK,
  strokeWidth: 0.6
}

export const replayTimeText: TextOptions = {
  ...buttonText,
  align: 'left',
  vAlign: 'top',
  size: 16
}

export const manaWheelText: TextOptions = {
  ...generic,
  fontFace: fontFaces.BarlowBold,
  size: 24,
  scaleDownToPhysicalSize: false
}

export const manaWheelTextShadow: TextOptions = {
  ...manaWheelText,
  fontFace: fontFaces.BarlowBoldShadow,
  ...shadowSettings,
  bakedOffset: new Vector2(0, -8)
}

export const drawWarningText: TextOptions = {
  ...generic,
  color: new Color(0xff429d),
  fontFace: fontFaces.BarlowBold,
  size: 24
}

export const drawWarningTextShadow: TextOptions = {
  ...drawWarningText,
  fontFace: fontFaces.BarlowBoldShadow,
  ...shadowSettings,
  bakedOffset: new Vector2(0, -8)
}

export const manaPreview: TextOptions = {
  ...cardNumber,
  ...textStyles.damageNumber,
  strokeWidth: 0,
  color: COLOR_WHITE,
  size: 36
}
export const buffManaPreview: TextOptions = {
  ...manaPreview,
  color: textStyles.buffNumber.color!
}
export const damageManaPreview: TextOptions = {
  ...manaPreview,
  color: textStyles.damageNumber.color!
}
export const manaPreviewShadow: TextOptions = {
  ...manaPreview,
  fontFace: fontFaces.BarlowBoldShadow,
  ...shadowSettings,
  weight: 0.6,
  bakedOffset: new Vector2(0, -8)
}

export const tooltip: TextOptions = {
  ...generic,
  ...textLayouts.tooltip,
  fontFace: fontFaces.BarlowMedium,
  size: 24,
  scaleDownToPhysicalSize: false,
  screenSpace: true,
  constantSizeOnScreen: true
}

export const cardSelectText: TextOptions = {
  ...buttonText,
  size: 24
}
export const cardSelectTextShadow: TextOptions = {
  ...cardSelectText,
  ...shadowSettings,
  fontFace: fontFaces.BarlowBoldShadow,
  bakedOffset: new Vector2(0, -12)
}
export const debugText: TextOptions = {
  ...generic,
  size: device.isMobile ? 36 : 24,
  fontFace: fontFaces.GothicHorizonSemiBold,
  scaleDownToPhysicalSize: false
}

export const debugTextBig: TextOptions = {
  ...debugText,
  size: device.isMobile ? 48 : 36
}

export const diagnostics: TextOptions = {
  ...debugText,
  align: 'right',
  size: 12
}

export const debugTextContrast: TextOptions = {
  ...generic,
  size: device.isMobile ? 36 : 24,
  fontFace: fontFaces.GothicHorizonSemiBold,
  scaleDownToPhysicalSize: false,
  strokeColor: COLOR_BLACK,
  strokeWidth: 0.5
}

export const fpsCounter: TextOptions = {
  ...debugText,
  size: device.isMobile ? 12 : 8,
  align: 'center',
  vAlign: 'bottom'
}

export const webGLCommandLegend: TextOptions = {
  ...generic,
  color: COLOR_WHITE,
  strokeColor: COLOR_WHITE,
  strokeWidth: 0.2,
  weight: 0.3,
  align: 'right',
  vAlign: 'bottom',
  lineHeight: 1,
  size: 10,
  fontFace: fontFaces.BarlowBold
}

export const playerActionErrorText: TextOptions = {
  ...generic,
  fontFace: fontFaces.BarlowCondensedBold,
  size: 24,
  scaleDownToPhysicalSize: false
}

export const playerActionErrorShadow: TextOptions = {
  ...playerActionErrorText,
  fontFace: fontFaces.BarlowCondensedBoldShadow,
  ...shadowSettings
}

export const actionHistoryTurn: TextOptions = {
  ...generic,
  fontFace: fontFaces.BarlowCondensedMedium,
  align: 'center',
  vAlign: 'center',
  size: 11,
  letterSpacing: 0.2,
  lineHeight: 0.85
}

export const turnChangeTitle: TextOptions = {
  ...playerActionErrorText,
  fontFace: fontFaces.BarlowCondensedBold,
  size: 60,
  strokeWidth: 0.5
}

export const deckCounterNumber: TextOptions = {
  ...manaWheelText,
  scaleDownToPhysicalSize: true
}

export const emoteBubbleText: TextOptions = {
  ...generic,
  fontFace: fontFaces.BarlowCondensedSemiBold,
  size: 27,
  scaleDownToPhysicalSize: true
}

export const lineItemNormal: TextOptions = {
  ...buttonText,
  size: 20,
  color: COLOR_LILAC,
  align: 'left'
}

export const lineItemUpgrade: TextOptions = {
  ...lineItemNormal,
  color: COLOR_PRIZE_UPGRADE_CYAN,
  align: 'right'
}

export const matchEndUserName: TextOptions = {
  ...buttonText,
  color: COLOR_WHITE,
  size: 20,
  align: 'center'
}

export const matchEndPlaqueUserName: TextOptions = {
  ...matchEndUserName,
  size: matchEndUserName.size * 12,
  scaleDownToPhysicalSize: true,
  strokeColor: COLOR_BLACK,
  strokeWidth: 0.4
}

export const rankBarBadgeNumber: TextOptions = {
  ...generic,
  fontFace: fontFaces.BarlowBold,
  scaleDownToPhysicalSize: false,
  vAlign: 'center',
  align: 'center',
  size: 32
}
export const rankBarBadgeNumberShadow: TextOptions = {
  ...rankBarBadgeNumber,
  fontFace: fontFaces.BarlowBoldShadow,
  ...shadowSettings,
  bakedOffset: new Vector2(0, -8)
}

export const abandonTimeoutText: TextOptions = {
  ...generic,
  fontFace: fontFaces.BarlowBold,
  size: 11,
  scaleDownToPhysicalSize: false,
  align: 'left',
  vAlign: 'center',
  color: 0x8470d3,
  strokeColor: 0,
  strokeWidth: 0.4
}

export const breakdownIcon: TextOptions = {
  ...elementIconText,
  size: 18
}

export const breakdownLabel: TextOptions = {
  ...cardCountText,
  size: 18
}

export const dealerBrainPhaseLabel: TextOptions = {
  ...generic,
  color: 0xffffff,
  size: 5,
  fontFace: fontFaces.BarlowBold,
  align: 'center',
  vAlign: 'center'
}
//// Test live changing of fontfaces
// setInterval(() => {
//   for (export const key in textOptions) {
//     if (textOptions.hasOwnProperty(key)) {
//       textOptions[key].fontFace = getRandomProperty(fontFaces)
//     }
//   }
// }, 1500)
