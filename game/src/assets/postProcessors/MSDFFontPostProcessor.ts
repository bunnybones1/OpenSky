import { LinearEncoding, LinearFilter, Texture } from 'three'

const MSDFFontPostProcessor = (assetName: string, texture: Texture) => {
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.encoding = LinearEncoding
  // texture.anisotropy = 16
}
export default MSDFFontPostProcessor
