
import { memoize } from './memoizer'

type GLTextureFormat = 'astc' | 'pvrtc' | 's3tc'

export const supportedFormatExtensions: { [key in GLTextureFormat]: string } = {
    astc: 'astc.COMPRESSED_ASTC_8x8_KHR.ktx', // Android
    pvrtc: 'pvrtc.COMPRESSED_PVRTC1_2.ktx', // iOS
    s3tc: 's3tc.COMPRESSED_S3TC_DXT_EXT.ktx' // Desktop
}

// TODO improve format detection by actually testing and failing, instead of trusting what extensions their webgl claims to support.
// https://github.com/horizon-games/issue-tracker/issues/7069
export const detectGLTextureFormat = memoize(
  (): GLTextureFormat | 'unknown' => {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl')

    if (gl) {
      const extensions = gl.getSupportedExtensions()

      if (extensions) {
        const textureExtensions = extensions.filter(ext =>
          ext.includes('WEBGL_compressed_texture')
        )

        if (textureExtensions.length) {
          const supportedFormat = (
            Object.keys(supportedFormatExtensions) as Array<
              keyof typeof supportedFormatExtensions
            >
          ).find(format => textureExtensions.some(x => x.includes(format)))

          return supportedFormat || 'unknown'
        }
      }
    }

    return 'unknown'
  }
)
