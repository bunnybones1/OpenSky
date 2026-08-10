import {
  Color,
  IUniform,
  MaterialParameters,
  RawShaderMaterial,
  ShaderMaterialParameters,
  Uniform
} from 'three'

import { COLOR_BLACK, COLOR_WHITE } from '~/colors/colorLibrary'
import { blendModeParams, SupportedBlendMode } from '~/helpers/blendModeHelpers'
import { testOverdraw } from '~/renderSettings'
import { buildParameters } from '~/utils/jsUtils'
import { convertMaterialParamsToOverdrawTest } from '~/utils/materials'

import fragmentShader from './frag.glsl'
import vertexShader from './vert.glsl'

type FresnelGlowMeshMaterialParameters = {
  colorSideFacing: Color
  colorFrontFacing: Color
  finalColorScale?: Color
  blendMode: SupportedBlendMode
}

const __defaults: FresnelGlowMeshMaterialParameters = {
  colorSideFacing: COLOR_BLACK,
  colorFrontFacing: COLOR_WHITE,
  blendMode: 'screen'
}

export default class FresnelGlowMeshMaterial extends RawShaderMaterial {
  private _options: Partial<FresnelGlowMeshMaterialParameters>
  constructor(
    fresnelGlowMatOptions: Partial<FresnelGlowMeshMaterialParameters> = {},
    matOptions: MaterialParameters = {}
  ) {
    const matParams = buildParameters(__defaults, fresnelGlowMatOptions)

    const uniforms: {
      [uniform: string]: IUniform<any>
    } = {
      uColorFrontFacing: new Uniform(matParams.colorFrontFacing),
      uColorSideFacing: new Uniform(matParams.colorSideFacing)
    }

    const defines: any = {}
    if (matParams.finalColorScale) {
      defines.USE_FINAL_COLOR_SCALE = true
      uniforms.uFinalColorScale = new Uniform(matParams.finalColorScale)
    }

    const params: ShaderMaterialParameters = {
      defines,
      uniforms,
      vertexShader,
      fragmentShader,
      ...matOptions,
      ...blendModeParams[matParams.blendMode]
    }

    if (testOverdraw.value) {
      convertMaterialParamsToOverdrawTest(params)
    }

    super(params)
    this._options = fresnelGlowMatOptions
  }

  get finalColorScale() {
    return this.uniforms.uFinalColorScale.value
  }

  set finalColorScale(value: Color) {
    this.uniforms.uFinalColorScale = new Uniform(value)
    if (!this.defines.USE_FINAL_COLOR_SCALE) {
      this.defines.USE_FINAL_COLOR_SCALE = true
      this.needsUpdate = true
    }
  }

  get colorFrontFacing() {
    return this.uniforms.uColorFrontFacing.value
  }

  set colorFrontFacing(value: Color | string | number) {
    this.uniforms.uColorFrontFacing.value = new Color(value)
  }

  get colorSideFacing() {
    return this.uniforms.uColorSideFacing.value
  }

  set colorSideFacing(value: Color | string | number) {
    this.uniforms.uColorSideFacing.value = new Color(value)
  }

  // @ts-ignore ts(2611)
  get opacity() {
    return this.uniforms.opacity && this.uniforms.opacity.value
  }

  set opacity(value: number) {
    if (this.uniforms && this.uniforms.opacity) {
      this.uniforms.opacity.value = value
    }
  }
  clone(): this {
    return new FresnelGlowMeshMaterial(this._options) as this
  }
}
