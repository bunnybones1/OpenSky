import { Points, Texture, Vector2 } from 'three'

import ColorStripPointMaterial from '~/materials/ColorStripPointMaterial'

import StarsGeometry from './Geometry'

export default class Stars extends Points {
  constructor(
    public mapTexture: Texture,
    public textureSize: Vector2,
    public mapRow: number = 11,
    total: number = 1000,
    radius: number = 80,
    sizeMin: number = 0.25,
    sizeMax: number = 1
  ) {
    super(
      new StarsGeometry(total, radius, sizeMin, sizeMax),
      new ColorStripPointMaterial(mapTexture, textureSize, mapRow, 'screen')
    )
    this.name = 'stars'
    this.frustumCulled = false
  }
}
