import { TextureAssetName } from '@opensky/shared/assets'

import { getAssetsManager } from '~/assets'
import RectangleMaterial from '~/materials/RectangleMaterial'
import Mesh2D from '~/meshes/Mesh2D'
import { getSharedRectangle2DBufferGeometry } from '~/utils/geometry'

export async function getTexturedMesh2D(assetName: TextureAssetName) {
  await getAssetsManager().loadAsset(assetName)
  return new Mesh2D(
    getSharedRectangle2DBufferGeometry(),
    new RectangleMaterial({ map: getAssetsManager().getAsset(assetName) })
  )
}
