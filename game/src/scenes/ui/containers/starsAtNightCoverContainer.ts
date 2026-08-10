import { getAssetsManager } from '~/assets/index'
import { getFireHighlightOptionOverrides } from '~/helpers/fireHighlightMaterialFactory'
import { makeUnscalingContainer } from '~/helpers/makeUnscalingContainer'
import MagicFireHighlightMeshMaterial from '~/materials/MagicFireHighlightMeshMaterial'
import Mesh2D from '~/meshes/Mesh2D'

import { UI } from '..'
import { ConclusionBackgrounds } from '../components/ConclusionBackground'
import UIContainer from '../components/UIContainer'

export default class StarsAtNightCoverContainer extends UIContainer {
  private _conquestBackground: ConclusionBackgrounds | undefined
  constructor(ui: UI, priority: number) {
    super(ui, 'starsAtNightCover', {
      priority
    })
  }
  protected async init() {
    const conquestBG = new ConclusionBackgrounds(
      'game/ui/opaque/stars-at-night-bg.png'
    )
    await conquestBG.ready
    this.add(conquestBG.mesh)
    const unscalingFogBGContainer = makeUnscalingContainer('uiHeight', 1000)
    this.add(unscalingFogBGContainer)

    const fogProto = getAssetsManager().fetchMeshDeepClone(
      'uiSmall',
      'rectangle-highlight-from-bottom'
    ) as Mesh2D
    const fogMat = new MagicFireHighlightMeshMaterial(getAssetsManager(), {
      ...getFireHighlightOptionOverrides('nebula'),
      depth: 0.98
    })
    const fog = new Mesh2D(fogProto.geometry, fogMat)
    unscalingFogBGContainer.add(fog)
    this._conquestBackground = conquestBG
  }
  async fadeIn(duration: number = 400) {
    super.fadeIn()
    this.active = true
    this.visible = true
    await this._conquestBackground!.show(duration)
  }
  async fadeOut(duration: number) {
    await super.fadeOut(duration)
    this._conquestBackground?.disposeTextures()
  }
  hide() {
    super.hide()
    this._conquestBackground?.disposeTextures()
  }
}
