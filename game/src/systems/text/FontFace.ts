import { SupportedLanguage } from '@opensky/language-manager'
import { Texture } from 'three'

import { getAssetsManager } from '~/assets'
import MSDFFontPostProcessor from '~/assets/postProcessors/MSDFFontPostProcessor'

function url(name: string, ext: string, lang: SupportedLanguage) {
  return `game/fonts/${lang}/${name}.${ext}`
}
export default class FontFace {
  font?: BMFont
  msdfTexture?: Texture
  private initd: boolean
  constructor(public name: string) {
    //
  }
  async init(lang: SupportedLanguage) {
    if (this.initd) {
      return
    }
    this.initd = true

    this.msdfTexture = (await getAssetsManager().load(
      'texture',
      url(this.name, 'png', lang),
      undefined,
      1000
    )) as Texture
    MSDFFontPostProcessor(this.name, this.msdfTexture)

    this.font = (await getAssetsManager().load(
      'json',
      url(this.name, 'json', lang),
      undefined,
      1000
    )) as BMFont
  }
}

export const fontFaces = {
  BarlowBlackItalic: new FontFace('Barlow-BlackItalic'),
  BarlowBold: new FontFace('Barlow-Bold'),
  BarlowBoldShadow: new FontFace('Barlow-Bold-Shadow'),
  BarlowBoldItalic: new FontFace('Barlow-BoldItalic'),
  BarlowExtraBold: new FontFace('Barlow-ExtraBold'),
  BarlowExtraBoldItalic: new FontFace('Barlow-ExtraBoldItalic'),
  BarlowExtraLight: new FontFace('Barlow-ExtraLight'),
  BarlowExtraLightItalic: new FontFace('Barlow-ExtraLightItalic'),
  BarlowItalic: new FontFace('Barlow-Italic'),
  BarlowLight: new FontFace('Barlow-Light'),
  BarlowLightItalic: new FontFace('Barlow-LightItalic'),
  BarlowMedium: new FontFace('Barlow-Medium'),
  BarlowMediumItalic: new FontFace('Barlow-MediumItalic'),
  BarlowRegular: new FontFace('Barlow-Regular'),
  BarlowSemiBold: new FontFace('Barlow-SemiBold'),
  BarlowSemiBoldItalic: new FontFace('Barlow-SemiBoldItalic'),
  BarlowThin: new FontFace('Barlow-Thin'),
  BarlowThinItalic: new FontFace('Barlow-ThinItalic'),
  BarlowCondensedBlack: new FontFace('BarlowCondensed-Black'),
  BarlowCondensedBlackItalic: new FontFace('BarlowCondensed-BlackItalic'),
  BarlowCondensedBold: new FontFace('BarlowCondensed-Bold'),
  BarlowCondensedBoldShadow: new FontFace('BarlowCondensed-Bold-Shadow'),
  BarlowCondensedBoldItalic: new FontFace('BarlowCondensed-BoldItalic'),
  BarlowCondensedExtraBold: new FontFace('BarlowCondensed-ExtraBold'),
  BarlowCondensedExtraBoldItalic: new FontFace(
    'BarlowCondensed-ExtraBoldItalic'
  ),
  BarlowCondensedExtraLight: new FontFace('BarlowCondensed-ExtraLight'),
  BarlowCondensedExtraLightItalic: new FontFace(
    'BarlowCondensed-ExtraLightItalic'
  ),
  BarlowCondensedItalic: new FontFace('BarlowCondensed-Italic'),
  BarlowCondensedLight: new FontFace('BarlowCondensed-Light'),
  BarlowCondensedLightItalic: new FontFace('BarlowCondensed-LightItalic'),
  BarlowCondensedMedium: new FontFace('BarlowCondensed-Medium'),
  BarlowCondensedMediumItalic: new FontFace('BarlowCondensed-MediumItalic'),
  BarlowCondensedRegular: new FontFace('BarlowCondensed-Regular'),
  BarlowCondensedSemiBold: new FontFace('BarlowCondensed-SemiBold'),
  BarlowCondensedSemiBoldItalic: new FontFace('BarlowCondensed-SemiBoldItalic'),
  BarlowCondensedThin: new FontFace('BarlowCondensed-Thin'),
  BarlowCondensedThinItalic: new FontFace('BarlowCondensed-ThinItalic'),
  BarlowSemiCondensedBlack: new FontFace('BarlowSemiCondensed-Black'),
  BarlowSemiCondensedBlackItalic: new FontFace(
    'BarlowSemiCondensed-BlackItalic'
  ),
  BarlowSemiCondensedBold: new FontFace('BarlowSemiCondensed-Bold'),
  BarlowSemiCondensedBoldItalic: new FontFace('BarlowSemiCondensed-BoldItalic'),
  BarlowSemiCondensedExtraBold: new FontFace('BarlowSemiCondensed-ExtraBold'),
  BarlowSemiCondensedExtraBoldItalic: new FontFace(
    'BarlowSemiCondensed-ExtraBoldItalic'
  ),
  BarlowSemiCondensedExtraLight: new FontFace('BarlowSemiCondensed-ExtraLight'),
  BarlowSemiCondensedExtraLightItalic: new FontFace(
    'BarlowSemiCondensed-ExtraLightItalic'
  ),
  BarlowSemiCondensedItalic: new FontFace('BarlowSemiCondensed-Italic'),
  BarlowSemiCondensedLight: new FontFace('BarlowSemiCondensed-Light'),
  BarlowSemiCondensedLightItalic: new FontFace(
    'BarlowSemiCondensed-LightItalic'
  ),
  BarlowSemiCondensedMedium: new FontFace('BarlowSemiCondensed-Medium'),
  BarlowSemiCondensedMediumItalic: new FontFace(
    'BarlowSemiCondensed-MediumItalic'
  ),
  BarlowSemiCondensedRegular: new FontFace('BarlowSemiCondensed-Regular'),
  BarlowSemiCondensedSemiBold: new FontFace('BarlowSemiCondensed-SemiBold'),
  BarlowSemiCondensedSemiBoldItalic: new FontFace(
    'BarlowSemiCondensed-SemiBoldItalic'
  ),
  BarlowSemiCondensedThin: new FontFace('BarlowSemiCondensed-Thin'),
  BarlowSemiCondensedThinItalic: new FontFace('BarlowSemiCondensed-ThinItalic'),
  GothicHorizonSemiBold: new FontFace('Gothic-Horizon-SemiBold')
}
