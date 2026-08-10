import { RepeatWrapping, Texture } from 'three'

import { AssetsManager } from '../index'

const RepeatingTexturePostProcessor = (
  assetsManager: AssetsManager,
  assetName: string,
  texture: Texture
) => {
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
}
export default RepeatingTexturePostProcessor
