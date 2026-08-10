import { CardLibrary } from '@skyweaver/state-metadata'
import {
  assetCacheFlags,
  AssetNameStrings,
  assetUrls,
  isMeshAnimationAssetName,
  isObject3DAssetName,
  isTextureAssetName
} from './assets'
import {
  detectGLTextureFormat,
  supportedFormatExtensions
} from './detectTextureFormat'
import gameMusic from './gameMusic'

import {
  resolutionScalePercent,
  resolutionScalePercentSmall,
  resolutionScalePercentSmallUI,
  resolutionScalePercentUI,
  updateTextureResolution
} from './renderMetrics'
import { usePNGFormat } from './usePNGFormat'
import { supportedResolutions } from './utils/renderResolution'

const getRequiredResolutions = (
  whatDevice: 'current_device' | 'any'
): {
  cardArtResolutionList: number[]
  uiResolutionList: number[]
  smallUiResolutionList: number[]
  cardBackgroundResolutionList: number[]
} => {
  updateTextureResolution()

  const cardArtResolutionList: number[] =
    whatDevice === 'current_device'
      ? [resolutionScalePercent.value, resolutionScalePercentSmall.value]
      : supportedResolutions

  const uiResolutionList: number[] =
    whatDevice === 'current_device'
      ? [resolutionScalePercentUI.value]
      : supportedResolutions

  const smallUiResolutionList: number[] =
    whatDevice === 'current_device'
      ? [resolutionScalePercentSmallUI.value]
      : supportedResolutions

  const cardBackgroundResolutionList: number[] =
    whatDevice === 'current_device'
      ? [resolutionScalePercent.value]
      : supportedResolutions

  return {
    cardArtResolutionList,
    uiResolutionList,
    smallUiResolutionList,
    cardBackgroundResolutionList
  }
}

const __cachedPaths: Map<'current_device' | 'any', string[]> = new Map()

export const getAssetPaths = (whatDevice: 'current_device' | 'any') => {
  if (__cachedPaths.has(whatDevice)) {
    return __cachedPaths.get(whatDevice)!
  }
  const paths: Set<string> = new Set()
  const cards = [...CardLibrary.entries()]
  const detectedFormat = detectGLTextureFormat()

  // If we can't detect which GL texture format the device uses, we have to download ALL of them, which is a bigger download :(
  const formatExtList: string[] =
    whatDevice === 'current_device' && detectedFormat !== 'unknown'
      ? [supportedFormatExtensions[detectedFormat]]
      : [
          supportedFormatExtensions.astc,
          supportedFormatExtensions.pvrtc,
          supportedFormatExtensions.s3tc
        ]

  const {
    cardArtResolutionList,
    smallUiResolutionList,
    cardBackgroundResolutionList
  } = getRequiredResolutions('current_device')

  const getResolutionExt = (resolution: number) =>
    resolution === 100 ? '' : `.@${resolution}p`

  for (const [id, card] of cards) {
    for (const format of formatExtList) {
      // Full card art
      for (const resolution of cardArtResolutionList) {
        paths.add(
          `game/cards/art-full/${card.type === 'unit' ? 'units' : 'spells'}/${
            card.artSlug
          }${getResolutionExt(resolution)}.png.${format}`
        )
      }

      // Card thumbnails
      for (const resolution of smallUiResolutionList) {
        paths.add(
          `game/cards/thumbs/${id}${getResolutionExt(resolution)}.png.${format}`
        )
      }

      // Card Bgs
      for (const resolution of cardBackgroundResolutionList) {
        if (card.backgroundArtSlug) {
          paths.add(
            `game/cards/art-full/bgs/${
              card.backgroundArtSlug
            }${getResolutionExt(resolution)}.png.${format}`
          )
        }
      }
      // UI Card Art Rows
      for (const resolution of smallUiResolutionList) {
        paths.add(
          `game/cards/art-rows/${card.type === 'unit' ? 'units' : 'spells'}/${
            card.artSlug
          }${getResolutionExt(resolution)}.png.${format}`
        )
      }
    }
  }

  // Game music
  gameMusic.forEach(music => {
    paths.add(music.url)
  })

  AssetNameStrings.filter(n => assetCacheFlags[n]).map(n => {
    const url = assetUrls[n]
    if (isObject3DAssetName(n) || isMeshAnimationAssetName(n)) {
      paths.add(url)
      paths.add(url.replace('.gltf', '.bin'))
    } else if (isTextureAssetName(n)) {
      const useNativeFormat =
        url.includes('game/') &&
        !url.includes('game/fonts') &&
        !usePNGFormat.some(x => url.includes(x))
      if (useNativeFormat) {
        for (const format of formatExtList) {
          paths.add(
            url.replace(
              '.png',
              `${getResolutionExt(
                url.includes('/keyword/')
                  ? resolutionScalePercentUI.value
                  : resolutionScalePercent.value
              )}.png.${format}`
            )
          )
        }
      } else {
        paths.add(url)
      }
    } else {
      paths.add(url)
    }
  })

  const extraImages = [
    'game/models/island-basic-final-texture-adjusted.png',
    'game/models/island-conquest1-final-texture-adjusted.png',
    'game/models/island-conquest2-final-texture-adjusted.png',
    'game/models/island-conquest3-final-texture-adjusted.png'
  ]
  extraImages.forEach(url => {
    for (const format of formatExtList) {
      paths.add(
        url.replace(
          '.png',
          `${getResolutionExt(
            url.includes('/keyword/')
              ? resolutionScalePercentUI.value
              : resolutionScalePercent.value
          )}.png.${format}`
        )
      )
    }
  })

  __cachedPaths.set(whatDevice, [...paths])
  return __cachedPaths.get(whatDevice)!
}
