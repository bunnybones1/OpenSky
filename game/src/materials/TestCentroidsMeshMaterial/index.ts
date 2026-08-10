import {
  Color,
  IUniform,
  MaterialParameters,
  RawShaderMaterial,
  ShaderMaterialParameters,
  Uniform
} from 'three'

import { testOverdraw } from '~/renderSettings'
import { timeUniformFactory } from '~/timeUniforms'
import { buildParameters } from '~/utils/jsUtils'
import { convertMaterialParamsToOverdrawTest } from '~/utils/materials'

import fragmentShader from './frag.glsl'
import vertexShader from './vert.glsl'

interface TestCentroidsMeshMaterialParameters {
  color?: Color
  forceTransparent?: boolean
}

export class TestCentroidsMeshMaterial extends RawShaderMaterial {
  constructor(
    options: TestCentroidsMeshMaterialParameters,
    matOptions: Partial<MaterialParameters> = {}
  ) {
    const params = buildParameters(
      {
        forceTransparent: false,
        resizeable: false,
        color: new Color(1, 0, 0)
      },
      options
    )

    const uniforms: {
      [uniform: string]: IUniform<any>
    } = {
      uCentroidTime: timeUniformFactory.getUniform(0.5),
      uColor: new Uniform(params.color)
    }
    const defines: any = {
      USE_CENTROIDS: true
    }

    const transparent = !!(
      (matOptions.opacity !== undefined && matOptions.opacity !== 1) ||
      params.forceTransparent
    )

    const matParams: ShaderMaterialParameters = {
      defines,
      uniforms,
      vertexShader,
      fragmentShader,
      ...matOptions,
      transparent
    }

    if (testOverdraw.value) {
      convertMaterialParamsToOverdrawTest(matParams)
    }

    super(matParams)
  }
}
