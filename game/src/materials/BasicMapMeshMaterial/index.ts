import {
  Color,
  IUniform,
  MaterialParameters,
  RawShaderMaterial,
  ShaderMaterialParameters,
  Texture,
  Uniform,
  Vector2,
  Vector3
} from 'three'

import { testOverdraw } from '~/renderSettings'
import { buildParameters } from '~/utils/jsUtils'
import { convertMaterialParamsToOverdrawTest } from '~/utils/materials'
import { getTempTexture } from '~/utils/tempTexture'

import fragmentShader from './frag.glsl'
import vertexShader from './vert.glsl'

let _fragmentShader = fragmentShader
let _vertexShader = vertexShader

const __instances: BasicMapMeshMaterial[] = []

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

export interface BasicMapMeshMaterialParameters {
  map?: Texture
  resizeable?: boolean
  supportOpacity?: boolean
  overlayColor?: Color
  perspectivePoint?: Vector3
}

const __defaults: BasicMapMeshMaterialParameters = {
  map: getTempTexture(),
  supportOpacity: false,
  resizeable: false
}

export default class BasicMapMeshMaterial extends RawShaderMaterial {
  private _mapTextureUniform: Uniform
  private _opacityUniform: Uniform
  private _overlayColorUniform: Uniform
  constructor(
    private _options: BasicMapMeshMaterialParameters = {},
    private _matOptions: Partial<MaterialParameters> = {}
  ) {
    const params = buildParameters(__defaults, _options)
    params.supportOpacity =
      params.supportOpacity ||
      (_matOptions.opacity !== undefined && _matOptions.opacity !== 1)

    if (params.supportOpacity) {
      _matOptions.transparent = true
    }

    const mapTexture = new Uniform(params.map)
    const size = new Vector2(100, 100)

    const uniforms: { [uniform: string]: IUniform<any> } = {
      mapTexture
    }
    const defines: any = {}

    const opacityUniform = new Uniform(
      _matOptions.opacity !== undefined ? _matOptions.opacity : 1
    )
    if (params.supportOpacity) {
      uniforms.opacity = opacityUniform
      defines.USE_OPACITY = true
    }

    if (params.resizeable) {
      uniforms.size = new Uniform(size)
      defines.USE_RESIZE_2D = true
    }

    const overlayColorUniform = new Uniform(params.overlayColor)
    if (params.overlayColor) {
      uniforms.uOverlayColor = overlayColorUniform
      defines.USE_OVERLAY_COLOR = true
    }

    if (_matOptions.alphaTest !== undefined) {
      defines.ALPHA_TEST = _matOptions.alphaTest
    }

    if (params.perspectivePoint) {
      uniforms.perspectivePoint = new Uniform(params.perspectivePoint)
      defines.USE_PERSPECTIVE_POINT = true
    }

    const matParams: ShaderMaterialParameters = {
      defines,
      uniforms,
      vertexShader: _vertexShader,
      fragmentShader: _fragmentShader,
      ..._matOptions
    }

    if (testOverdraw.value) {
      convertMaterialParamsToOverdrawTest(matParams)
    }

    super(matParams)
    this._mapTextureUniform = mapTexture
    this._opacityUniform = opacityUniform
    this._overlayColorUniform = overlayColorUniform
    if (import.meta.hot) {
      __instances.push(this)
    }
  }

  get texture() {
    return this._mapTextureUniform.value as Texture
  }

  set texture(val: Texture) {
    this._mapTextureUniform.value = val
  }

  get overlayColor() {
    return this._overlayColorUniform.value
  }

  set overlayColor(val: Color) {
    this._overlayColorUniform.value = val
  }

  // @ts-ignore ts(2611)
  set opacity(value: number) {
    if (this._opacityUniform) {
      this._opacityUniform.value = value
    }
  }

  get opacity() {
    if (this._opacityUniform) {
      return this._opacityUniform.value
    } else {
      return 1
    }
  }
  clone() {
    const other = new BasicMapMeshMaterial(this._options, this._matOptions)
    return other as this
  }
}
