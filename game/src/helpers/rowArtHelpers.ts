import { AssetPriority } from '@opensky/shared/assets'
import { Element } from '@skyweaver/state-metadata'
import { Color, Texture } from 'three'

import { getAssetsManager } from '~/assets'
import { TextureType } from '~/assets/TextureType'
import { modifyColorByHSL } from '~/colors/utils'
import { elementColors } from '~/constants'
import RowArtMeshMaterial from '~/materials/RowArtMeshMaterial'
import Mesh2D from '~/meshes/Mesh2D'
import { getTempTexture } from '~/utils/tempTexture'
import { safelyResetFlipY } from '~/utils/textureUtils'

const textureLoaders = {
  [TextureType.Default]: 'texture',
  [TextureType.Small]: 'textureSmall',
  [TextureType.Big]: 'textureBig',
  [TextureType.UI]: 'textureUI',
  [TextureType.SmallUI]: 'textureSmallUI'
} as const

export function setupRowArt(
  rowArt: Mesh2D,
  element: Element,
  artUrl: string,
  overrideColor?: Color,
  deepenColor = false,
  type = TextureType.Small,
  priority = AssetPriority.PreGame
): Mesh2D {
  let color = elementColors[element]
  if (deepenColor) {
    color = modifyColorByHSL(color.clone(), 0, 0.2, -0.2)
  }
  const texCache = getAssetsManager().getTextureCache(type)
  async function asyncLoadArt() {
    rowArtMatCopy.texture = texCache.hasTexture(artUrl)
      ? texCache.getTexture(artUrl)
      : await (getAssetsManager().load(
          textureLoaders[type],
          artUrl,
          undefined,
          priority
        ) as Promise<Texture>)
    safelyResetFlipY(rowArtMatCopy.texture)
  }
  const rowArtCopy = rowArt.clone()
  const rowArtMat = rowArt.material as RowArtMeshMaterial
  const rowArtMatCopy = rowArtMat.clone()
  rowArtMatCopy.texture = getTempTexture()
  asyncLoadArt()
  rowArtCopy.material = rowArtMatCopy
  rowArtMatCopy.decalColor = overrideColor || color

  return rowArtCopy
}
