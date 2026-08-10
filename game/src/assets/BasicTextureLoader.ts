import { RGBAFormat, RGBFormat, Texture, TextureLoader } from 'three'

import { lockProp } from '~/utils/jsUtils'

const MIME_TYPE_FORMATS = {
  'image/png': RGBAFormat,
  'image/jpeg': RGBFormat
}

function guessMime(url: string) {
  if (url.includes('.png')) {
    return 'image/png'
  } else if (url.includes('.jpeg')) {
    return 'image/jpeg'
  } else if (url.includes('.jpg')) {
    return 'image/jpeg'
  }
  return 'image/png'
}

export default class BasicTextureLoader extends TextureLoader {
  load(
    url: string,
    onLoad?: (texture: Texture) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (event: ErrorEvent) => void
  ): Texture {
    function wrappedOnLoad(texture: Texture) {
      texture.format = MIME_TYPE_FORMATS[guessMime(url)]
      lockProp(texture, 'format')
      texture.name = url
      if (onLoad) {
        onLoad(texture)
      }
    }
    return super.load(url, wrappedOnLoad, onProgress, onError)
  }
}
