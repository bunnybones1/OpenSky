import {
  resolutionScalePercent,
  resolutionScalePercentBig,
  resolutionScalePercentSmall,
  resolutionScalePercentSmallUI,
  resolutionScalePercentUI
} from '@opensky/shared/renderMetrics'
import { usePNGFormat } from '@opensky/shared/usePNGFormat'
import {
  CompressedTextureLoader,
  DataTexture,
  LinearFilter,
  LoadingManager,
  Texture,
  TextureLoader
} from 'three'

import queryParams from '~/queryParams'
import renderer from '~/renderer'
import { lockProp } from '~/utils/jsUtils'
import { KTXLoader } from '~/vendor/KTXLoader'

import BasicTextureLoader from './BasicTextureLoader'
import { isKnownTextureFormat, KnownTextureFormat } from './TextureFormats'
import { TextureType } from './TextureType'

let textureMode: 'basic' | 'compressed' | 'discover' =
  queryParams.test === 'cardTextPreview' ||
  queryParams.test === 'cardComposite' ||
  location.port === '9999'
    ? 'basic'
    : 'compressed'
switch (queryParams.textureMode || textureMode) {
  case 'basic':
    textureMode = 'basic'
    break
  case 'compressed':
    textureMode = 'compressed'
    break
  case 'discover':
    textureMode = 'discover'
    break
  default:
    console.warn(`Unknown textureMode. Using basic instead`)
}

const getResolutionScalePercent = (type: TextureType) => {
  switch (type) {
    case TextureType.UI:
      return resolutionScalePercentUI.value

    case TextureType.Small:
      return resolutionScalePercentSmall.value

    case TextureType.SmallUI:
      return resolutionScalePercentSmallUI.value

    case TextureType.Big:
      return resolutionScalePercentBig.value

    case TextureType.Default:
    default:
      return resolutionScalePercent.value
  }
}

const bruteForceTextureFormatDiscovery = textureMode === 'discover'
const useBasic = textureMode === 'basic'

//use json file eventually instead of hardcoding
const fileNameLookup: Partial<{ [K in KnownTextureFormat]: string }> = {
  'astc.COMPRESSED_RGBA_ASTC_8x8_KHR': 'astc.COMPRESSED_ASTC_8x8_KHR',
  's3tc.COMPRESSED_RGB_S3TC_DXT1_EXT': 's3tc.COMPRESSED_S3TC_DXT_EXT',
  's3tc.COMPRESSED_RGBA_S3TC_DXT5_EXT': 's3tc.COMPRESSED_S3TC_DXT_EXT',
  'pvrtc.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG': 'pvrtc.COMPRESSED_PVRTC1_2'
}
class TextureLoadConfig {
  constructor(
    public extension: string,
    public loader: TextureLoader | CompressedTextureLoader
  ) {
    //
  }
}

const __compressedTextureFormats = [
  'astc',
  'atc',
  'etc',
  'etc1',
  'pvrtc',
  's3tc'
  // 's3tc_srgb'
]

const s = 4
const total = s * s * 4
const data = new Float64Array(total)
for (let i = 0; i < total; i++) {
  data[i] = 1
}
const tempTex = new DataTexture(data, s, s)

function __setupLoaders(
  basicTextureLoader: BasicTextureLoader,
  ktxTextureLoader: KTXLoader,
  compressedTextureFormatSupport: Map<string, any>
) {
  const textureLoaders = [
    // new TextureLoadConfig('.ktx', ktxTextureLoader),
    new TextureLoadConfig('', basicTextureLoader)
  ]
  if (!useBasic) {
    __compressedTextureFormats.forEach(format => {
      compressedTextureFormatSupport.set(
        format,
        renderer.extensions.get('WEBGL_compressed_texture_' + format)
      )
    })

    compressedTextureFormatSupport.forEach((ext, format) => {
      if (ext) {
        Object.keys(ext.__proto__).forEach(subFormat => {
          const fileSubFormat = `${format}.${subFormat}`
          if (isKnownTextureFormat(fileSubFormat)) {
            if (
              bruteForceTextureFormatDiscovery ||
              fileNameLookup.hasOwnProperty(fileSubFormat)
            ) {
              const fileSubName = `.${fileNameLookup[fileSubFormat]}.ktx`
              textureLoaders.unshift(
                new TextureLoadConfig(fileSubName, ktxTextureLoader)
              )
            }
          } else {
            console.warn(`Unknown texture format: ${fileSubFormat}`)
          }
        })
      }
    })
  }
  return textureLoaders
}

const forbiddenUrls = [
  'art-placeholder-card.png',
  'art-placeholder-token-guard.png',
  'art-placeholder-token.png',
  'art-placeholder-prism.png',
  // 'bg-clouds-sculpted.png',
  // 'card-emissive.png',
  // 'fire-effect-source.png',
  'highlight-guide.png',
  // 'island-surface-stones.png',
  // 'island-surface-stones.png',
  // 'island-surface.png',
  'spell-placeholder.png',
  'ui-without-top.png',
  'temp-texture.png',
  'bg-placeholder'
]

export class MultiFormatTextureLoader extends TextureLoader {
  private textureLoaders: TextureLoadConfig[]
  private compressedTextureFormatSupport = new Map<string, any>()

  constructor(
    loadingManager: LoadingManager,
    private _urlResolver: (url: string) => string
  ) {
    super(loadingManager)
    this.textureLoaders = __setupLoaders(
      new BasicTextureLoader(loadingManager),
      new KTXLoader(loadingManager),
      this.compressedTextureFormatSupport
    )
  }
  load(
    url: string,
    onLoad: (texture: Texture) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (event: ErrorEvent) => void,
    type?: TextureType
  ): Texture {
    this.loadAsync(url, onProgress, type).then(onLoad).catch(onError)
    return tempTex
  }
  loadAsync = async (
    url: string,
    onProgress?: (event: ProgressEvent) => void,
    type: TextureType = TextureType.Default
  ) => {
    const errors: ErrorEvent[] = []
    let lastError: ErrorEvent | undefined
    if (url.includes('.png.png')) {
      url = url.replace('.png.png', '.png')
    }
    for (const forbidden of forbiddenUrls) {
      if (url.includes(forbidden)) {
        //console.warn('skipping forbidden texture ' + url)
        return tempTex as Texture
      }
    }
    const resScalePercent = getResolutionScalePercent(type)

    // XXX todo need a way to blacklist assets which dont have gltexture
    const useNativeFormat =
      url.includes('game/') &&
      !url.includes('game/fonts') &&
      !usePNGFormat.some(x => url.includes(x))
    if (useNativeFormat && resScalePercent !== 100) {
      url = url.replace('.png', `.@${resScalePercent}p.png`)
    }
    let texture: Texture | undefined
    const textureLoaders = useNativeFormat
      ? this.textureLoaders
      : [this.textureLoaders[this.textureLoaders.length - 1]]
    for (const config of textureLoaders) {
      texture = await new Promise<Texture | undefined>(resolve => {
        config.loader.load(
          this._urlResolver(url + config.extension),
          (texture: Texture) => {
            texture.minFilter = LinearFilter
            texture.magFilter = LinearFilter
            lockProp(texture, 'minFilter')
            lockProp(texture, 'magFilter')
            // retain ability change wrap, to prevent edge-leak artifacts
            // texture.wrapS = RepeatWrapping
            // texture.wrapT = RepeatWrapping
            // lockProp(texture, 'wrapS')
            // lockProp(texture, 'wrapT')
            texture.name = url
            resolve(texture)
          },
          onProgress,
          event => {
            resolve(undefined)
            lastError = event
            errors.push(event)
          }
        )
      })
      if (texture) {
        break
      }
    }
    if (!texture) {
      if (lastError) {
        throw lastError
      } else {
        throw new ErrorEvent('Texture load failed, for unknown reasons')
      }
    } else if (errors.length > 0) {
      const failedFormats = errors
        .map(error => {
          if (error.currentTarget && 'responseURL' in error.currentTarget) {
            return (error.currentTarget as any).responseURL as string
          } else {
            return ''
          }
        })
        .filter(a => a !== '')
        .join('; ')
      console.warn(
        'Texture loaded, but not before failing the following format requests:' +
          failedFormats
      )
    }
    return texture
  }
}
