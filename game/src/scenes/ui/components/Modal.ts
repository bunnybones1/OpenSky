import { TextureAssetName } from '@opensky/shared/assets'
import device from '@opensky/shared/device'

import { getAssetsManager } from '~/assets/index'
import { Pin, ReadonlyPin } from '~/helpers/LayoutHelpers'
import Object2D from '~/meshes/Object2D'

export type GemType = 'none' | 'dark' | 'lit'
export const TOP_BAR_HEIGHT = 60
export const mobileHeadOffset = device.isMobile ? 6 : 0
export default class Modal {
  mesh: Object2D
  constructor(
    topGem: GemType = 'dark',
    bottomGem: GemType = 'dark',
    alphaTextureAsset?: TextureAssetName
  ) {
    this.mesh = new Object2D()
    const modalTitle = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      `panel-w-gems-${topGem}-${bottomGem}`,
      true
    )
    const modalBody = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      `panel-w-gems-none-${bottomGem}`,
      true
    )

    if (alphaTextureAsset) {
      modalBody.material = modalBody.material.variant({ alphaTextureAsset })
      modalBody.material.paletteRow += 2
    } else {
      modalBody.material.paletteRow++
    }

    modalTitle.matrix.setConstraints(
      new Pin(1, 0, 0, TOP_BAR_HEIGHT + 1 + mobileHeadOffset),
      ReadonlyPin.TopLeft,
      ReadonlyPin.TopLeft
    )
    modalBody.matrix.setConstraints(
      new Pin(1, 1, 0, -TOP_BAR_HEIGHT),
      ReadonlyPin.TopLeft,
      ReadonlyPin.TopLeft.cloneOffset(0, TOP_BAR_HEIGHT + mobileHeadOffset)
    )
    this.mesh.add(modalTitle)
    this.mesh.add(modalBody)
  }
}
