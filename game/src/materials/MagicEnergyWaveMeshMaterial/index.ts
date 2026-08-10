import { TextureAssetName } from '@opensky/shared/assets'
import {
  AddEquation,
  Color,
  CustomBlending,
  FrontSide,
  IUniform,
  OneFactor,
  OneMinusSrcAlphaFactor,
  RawShaderMaterial,
  Uniform,
  Vector2
} from 'three'

import { AssetsManager } from '~/assets/index'
import { timeUniformFactory } from '~/timeUniforms'
import { buildParameters } from '~/utils/jsUtils'

import fragmentShader from './frag.glsl'
import vertexShader from './vert.glsl'

interface MagicEnergyWaveMeshMaterialOptions {
  map?: TextureAssetName
  color?: Color
  color2?: Color
  opacity?: number
  scrollTiling?: Vector2
  useLengthRatio?: boolean
}

const __defaultOptions: MagicEnergyWaveMeshMaterialOptions = {
  map: 'fireEffectSourceMap',
  color: new Color(0xffffff),
  opacity: 1,
  scrollTiling: new Vector2(7, 22),
  useLengthRatio: false
}

function __uniqueVec2() {
  return new Vector2(Math.random() * 10, Math.random() * 10)
}
export default class MagicEnergyWaveMeshMaterial extends RawShaderMaterial {
  private _options: MagicEnergyWaveMeshMaterialOptions
  constructor(
    private _assetsManager: AssetsManager,
    options: MagicEnergyWaveMeshMaterialOptions = {}
  ) {
    const params = buildParameters(__defaultOptions, options)
    const uMap = _assetsManager.getLazyTextureAssetUniform(params.map!)
    const uniforms: {
      [uniform: string]: IUniform<any>
    } = {
      map: uMap,
      opacity: new Uniform(options.opacity),
      timeX: timeUniformFactory.getUniform(0.5),
      timeY: timeUniformFactory.getUniform(0.1),
      uniqueness: new Uniform(__uniqueVec2())
    }

    super({
      uniforms,
      vertexShader,
      fragmentShader,
      side: FrontSide,
      transparent: true,
      depthWrite: false,
      blending: CustomBlending,
      blendSrc: OneFactor,
      blendDst: OneMinusSrcAlphaFactor,
      blendSrcAlpha: OneFactor,
      blendDstAlpha: OneMinusSrcAlphaFactor,
      blendEquation: AddEquation
    })
    this._options = options
  }
  clone() {
    return this.variant()
  }
  variant(options?: Partial<MagicEnergyWaveMeshMaterialOptions>) {
    return new MagicEnergyWaveMeshMaterial(this._assetsManager, {
      ...this._options,
      ...options
    }) as this
  }

  // @ts-ignore ts(2611)
  set opacity(value: number) {
    if (this.uniforms) {
      this.uniforms.opacity.value = value
    }
  }
  get opacity() {
    return this.uniforms.opacity.value
  }
}
