import { Texture } from 'three'

import { getAssetsManager } from '~/assets'
import { TextureType } from '~/assets/TextureType'
import { Pin, ReadonlyPin, SizePin } from '~/helpers/LayoutHelpers'
import RectangleMaterial from '~/materials/RectangleMaterial'
import Object2D from '~/meshes/Object2D'
import { Easing } from '~/systems/animation/Easing'
import { simpleTweener } from '~/systems/animation/tweeners'
import UVChopMesh from '~/utils/UVChopMesh'

const parallaxAnimParams = {
  propertyGoals: {
    scale: 0.5
  },
  duration: 10000,
  easing: Easing.Quadratic.InOut
}

export class SplashComposition extends Object2D {
  splashBgOffsetPin: Pin
  splashFgOffsetPin: Pin
  splashFg: UVChopMesh
  splashBg: UVChopMesh
  constructor(
    private fgTexture: Texture,
    private bgTexture: Texture
  ) {
    super()
    const splashBgOffsetPin = new Pin(0.45, 0.5)
    const splashFgOffsetPin = new Pin(0.55, 0.5)

    const splashBg = new UVChopMesh(new RectangleMaterial({ map: bgTexture }))
    splashBg.matrix.setConstraints(
      new SizePin(1, 1, 3420 / 1220, 'crop'),
      ReadonlyPin.Center,
      splashBgOffsetPin
    )
    const splashFg = new UVChopMesh(
      new RectangleMaterial({
        map: fgTexture
      })
    )
    splashFg.matrix.setConstraints(
      new SizePin(1, 1, 3420 / 1220, 'crop'),
      ReadonlyPin.Center,
      splashFgOffsetPin
    )

    this.add(splashBg)
    this.add(splashFg)
    this.splashBgOffsetPin = splashBgOffsetPin
    this.splashFgOffsetPin = splashFgOffsetPin
    this.splashBg = splashBg
    this.splashFg = splashFg
  }
  async show() {
    await Promise.all([
      simpleTweener.to({
        description: 'splashBgOffsetPin',
        target: this.splashBgOffsetPin.x,
        ...parallaxAnimParams
      }).finished,
      simpleTweener.to({
        description: 'splashFgOffsetPin',
        target: this.splashFgOffsetPin.x,
        ...parallaxAnimParams
      }).finished
    ])
  }
  async hide() {
    await Promise.all([
      simpleTweener.to({
        description: 'hide splashBg',
        target: this.splashBg.material,
        propertyGoals: {
          opacity: 0
        },
        duration: 400
      }).finished,
      simpleTweener.to({
        description: 'hide splashFg',
        target: this.splashFg.material,
        propertyGoals: {
          opacity: 0
        },
        duration: 400
      }).finished
    ])
  }
  disposeTextures() {
    const texCache = getAssetsManager().getTextureCache(TextureType.Default)
    for (const texture of [this.bgTexture, this.fgTexture]) {
      const url = texCache.lookupTextureUrl(texture)
      if (url) {
        texCache.disposeTexture(url)
      }
    }
  }
}
