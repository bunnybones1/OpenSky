import {
  AdditiveBlending,
  IUniform,
  ShaderMaterial,
  ShaderMaterialParameters,
  Texture,
  Uniform,
  Vector2,
  Vector4
} from 'three'

import { blendModeParams, SupportedBlendMode } from '~/helpers/blendModeHelpers'
import { testOverdraw } from '~/renderSettings'
import { renderMetricsUniforms } from '~/uniforms'

import fragmentShader from './frag.glsl'
import vertexShader from './vert.glsl'

export default class ColorStripPointMaterial extends ShaderMaterial {
  mapTexture: Texture
  textureSize: Vector2
  mapRow: number
  constructor(
    mapTexture: Texture,
    textureSize: Vector2,
    mapRow: number = 9,
    blendMode: SupportedBlendMode = 'screen'
  ) {
    const halfPixel: Vector2 = new Vector2(
      0.5 / textureSize.x,
      0.5 / textureSize.y
    )
    const s: Vector2 = new Vector2((textureSize.x - 1) / textureSize.x, 0)
    const t: Vector2 = new Vector2(
      halfPixel.x,
      1 - (halfPixel.y + mapRow / textureSize.y)
    )

    const uniforms: {
      [uniform: string]: IUniform<any>
    } = {
      mapTexture: new Uniform(mapTexture),
      uvTransform: new Uniform(new Vector4(s.x, s.y, t.x, t.y)),
      devicePixelRatio: renderMetricsUniforms.finalPointScale
    }

    const defines: any = {}

    const params: ShaderMaterialParameters = {
      defines,
      vertexShader,
      fragmentShader,
      uniforms,
      ...blendModeParams[blendMode]
    }

    if (testOverdraw.value) {
      defines.TEST_OVERDRAW = true
      params.blending = AdditiveBlending
    }

    super(params)
    this.mapTexture = mapTexture
    this.textureSize = textureSize
    this.mapRow = mapRow
  }
}
