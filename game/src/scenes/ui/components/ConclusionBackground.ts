import { Texture } from 'three'

import { getAssetsManager } from '~/assets'
import { TextureType } from '~/assets/TextureType'
import { SizePin } from '~/helpers/LayoutHelpers'
import RectangleMaterial from '~/materials/RectangleMaterial'
import RectangleMesh from '~/meshes/RectangleMesh'
import { simpleTweener } from '~/systems/animation/tweeners'

export class ConclusionBackgrounds {
  ready: Promise<Texture>
  mesh: RectangleMesh
  material: RectangleMaterial
  texture: Texture
  constructor(url = 'game/conquest/opaque/conquest-outro-bg.png') {
    this.ready = getAssetsManager().load(
      'texture',
      url,
      false,
      2000
    ) as Promise<Texture>
    this.ready.then(map => {
      this.texture = map
      const material = new RectangleMaterial({ map, depth: 0.98 })
      this.mesh = new RectangleMesh(material)
      this.mesh.matrix.setConstraints(new SizePin(1, 1, 1920 / 1080, 'crop'))
      this.mesh.matrix.setOpacity(1)
      this.material = material
    })
  }
  async show(duration = 500) {
    console.log('duration')
    await simpleTweener.to({
      description: 'show conquest bg',
      target: this.mesh.matrix,
      propertyGoals: { opacity: 1 },
      duration
    }).finished
  }
  async hide() {
    await simpleTweener.to({
      description: 'hide conquest bg',
      target: this.mesh.matrix,
      propertyGoals: { opacity: 0 },
      duration: 500,
      onComplete: () => {
        this.disposeTextures()
      }
    }).finished
  }
  disposeTextures() {
    const texCache = getAssetsManager().getTextureCache(TextureType.Default)
    const url = texCache.lookupTextureUrl(this.texture)
    if (url) {
      texCache.disposeTexture(url)
    }
  }
}
