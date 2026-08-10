import {
  Color,
  IUniform,
  MaterialParameters,
  RawShaderMaterial,
  ShaderMaterialParameters,
  Uniform
} from 'three'

import { COLOR_WHITE } from '~/colors/colorLibrary'
import { blendModeParams, SupportedBlendMode } from '~/helpers/blendModeHelpers'
import { testOverdraw } from '~/renderSettings'
import { buildParameters } from '~/utils/jsUtils'
import { convertMaterialParamsToOverdrawTest } from '~/utils/materials'

import fragmentShader from './frag.glsl'
import vertexShader from './vert.glsl'

let _fragmentShader = fragmentShader
let _vertexShader = vertexShader

const __instances: FakeCylinderGlowMeshMaterial[] = []

if (import.meta.hot) {
  function handleHMR() {
    for (const i of __instances) {
      i.fragmentShader = _fragmentShader
      i.vertexShader = _vertexShader
      i.needsUpdate = true
    }
  }
  import.meta.hot.accept('./frag.glsl', mod => {
    _fragmentShader = mod!.default
    handleHMR()
  })
  import.meta.hot.accept('./vert.glsl', mod => {
    _vertexShader = mod!.default
    handleHMR()
  })
}

type FakeCylinderGlowMeshMaterialParameters = {
  color: Color
  opacity: number
  blendMode: SupportedBlendMode
}

const __defaults: FakeCylinderGlowMeshMaterialParameters = {
  color: COLOR_WHITE,
  opacity: 1,
  blendMode: 'screen'
}

export default class FakeCylinderGlowMeshMaterial extends RawShaderMaterial {
  private _angle = 0
  private _options: Partial<FakeCylinderGlowMeshMaterialParameters>
  constructor(
    fakeCylinderGlowMatOptions: Partial<FakeCylinderGlowMeshMaterialParameters> = {},
    matOptions: MaterialParameters = {}
  ) {
    const matParams = buildParameters(__defaults, fakeCylinderGlowMatOptions)

    const uniforms: {
      [uniform: string]: IUniform<any>
    } = {
      uColor: new Uniform(matParams.color),
      uOpacity: new Uniform(matParams.opacity),
      uSideness: new Uniform(0)
    }

    const params: ShaderMaterialParameters = {
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
    this._options = fakeCylinderGlowMatOptions
    if (import.meta.hot) {
      __instances.push(this)
    }
  }

  get color() {
    return this.uniforms.uColor.value
  }

  set color(value: Color | string | number) {
    this.uniforms.uColor.value = new Color(value)
  }

  get angle() {
    return this._angle
  }

  set angle(value: number) {
    this._angle = value
    this.uniforms.uSideness.value = 1 - Math.abs(Math.sin(value))
  }

  // @ts-ignore ts(2611)
  get opacity() {
    return this.uniforms.uOpacity && this.uniforms.uOpacity.value
  }

  set opacity(value: number) {
    if (this.uniforms && this.uniforms.uOpacity) {
      this.uniforms.uOpacity.value = value
    }
  }
  clone(): this {
    return new FakeCylinderGlowMeshMaterial(this._options) as this
  }
}
