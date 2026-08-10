import { Color, Texture } from 'three'

import { makeHSL } from '~/colors/utils'
import { SupportedBlendMode } from '~/helpers/blendModeHelpers'
import { I2D } from '~/helpers/I2D'
import { Easing } from '~/systems/animation/Easing'
import { simpleTweener } from '~/systems/animation/tweeners'

import { DepthMaterial2D } from '../Mesh2D'
import Points2D from '../Points2D'
import FireworksGeometry from './Geometry'
import Geometry from './Geometry'
import Material from './Material'

const __geos = new Map<string, Geometry>()
function __getGeo(
  total: number,
  radius: number,
  sizeMin: number,
  sizeMax: number,
  duration: number,
  gravity: number
) {
  const key = `${total} ${radius} ${sizeMin} ${sizeMax} ${duration} ${gravity}`
  if (!__geos.has(key)) {
    __geos.set(
      key,
      new Geometry(total, radius, sizeMin, sizeMax, duration, gravity)
    )
  }
  return __geos.get(key)!
}

export default class FireCracker
  extends Points2D<FireworksGeometry, DepthMaterial2D>
  implements I2D
{
  constructor(
    mapTexture: Texture,
    onComplete: (fc: FireCracker) => void,
    total: number = 800,
    sizeMin: number = 10,
    sizeMax: number = 20,
    duration: number = 1500,
    gravity: number = -500,
    color?: Color,
    blendMode: SupportedBlendMode = 'screen'
  ) {
    const geometry = __getGeo(total, 0.5, sizeMin, sizeMax, duration, gravity)
    const material = new Material(
      mapTexture,
      color || makeHSL(Math.random(), 1, 0.75),
      blendMode
    )
    super(geometry, material)

    simpleTweener.to({
      description: 'firecracker progress',
      target: material,
      propertyGoals: { progress: 1 },
      duration,
      easing: Easing.Linear,
      onComplete: () => onComplete(this)
    })
    this.name = 'firecracker'
    this.frustumCulled = false
  }
}
