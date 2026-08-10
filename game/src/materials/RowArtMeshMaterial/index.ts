import {
  Color,
  IUniform,
  RawShaderMaterial,
  ShaderMaterialParameters,
  Texture,
  Uniform
} from 'three'

import { UI_DEFAULT_DEPTH } from '~/helpers/I2D'
import { IDepthMaterial2D } from '~/meshes/Mesh2D'
import { testOverdraw } from '~/renderSettings'
import { AttributeRouter } from '~/utils/AttributeRouter'
import { convertMaterialParamsToOverdrawTest } from '~/utils/materials'

import fragmentShader from './frag.glsl'
import vertexShader from './vert.glsl'

interface IDefines {
  COLOR_MASK_ATTRIBUTE: string
  PRETINT_ATTRIBUTE: string
}

interface RowArtMeshMaterialParameters {
  texture: Texture
  colorMaskVertexAttribute?: string
  pretintVertexAttribute?: string
  decalColor?: Color
  depth?: number
}

export default class RowArtMeshMaterial
  extends RawShaderMaterial
  implements IDepthMaterial2D
{
  private _params: RowArtMeshMaterialParameters
  private _uTexture: Uniform
  private _uDecalColor: Uniform
  private _uDepth: Uniform
  private _depth: number
  private _depthOffset: number
  get depth(): number {
    return this._depth
  }
  set depth(value: number) {
    this._depth = value
    this._uDepth.value = this._depth + this._depthOffset
  }
  get depthOffset(): number {
    return this._depthOffset
  }
  set depthOffset(value: number) {
    this._depthOffset = value
    this._uDepth.value = this._depth + this._depthOffset
  }
  getFinalDepth() {
    return this._uDepth.value
  }

  set texture(val: Texture) {
    this._uTexture.value = val
  }

  get texture() {
    return this._uTexture.value
  }

  set decalColor(val: Color) {
    this._uDecalColor.value = val
  }

  constructor(params: RowArtMeshMaterialParameters) {
    const uTexture = new Uniform(params.texture)
    const uDecalColor = new Uniform(params.decalColor || new Color('#73d0c2'))
    const uDepth = new Uniform(params.depth ?? UI_DEFAULT_DEPTH)
    const uniforms: {
      [uniform: string]: IUniform<any>
    } = {
      uTexture,
      uDecalColor,
      uDepth
    }

    const fragmentShaderPreamble = ''
    let vertexShaderPreamble = ''
    const attributes = new AttributeRouter([
      params.pretintVertexAttribute,
      params.colorMaskVertexAttribute
    ])
    const defines: IDefines = {
      COLOR_MASK_ATTRIBUTE: attributes.correct(
        params.colorMaskVertexAttribute!
      ),
      PRETINT_ATTRIBUTE: attributes.correct(params.pretintVertexAttribute!)
    }
    vertexShaderPreamble += attributes.getVertexPreamble()
    const materialParams: ShaderMaterialParameters = {
      defines,
      uniforms,
      vertexShader: vertexShaderPreamble + vertexShader,
      fragmentShader: fragmentShaderPreamble + fragmentShader,
      depthTest: true,
      depthWrite: true,
      transparent: true
    }
    if (testOverdraw.value) {
      convertMaterialParamsToOverdrawTest(materialParams)
    }

    super(materialParams)
    this._params = params
    this._uTexture = uTexture
    this._uDecalColor = uDecalColor
    this._uDepth = uDepth
    this._depth = uDepth.value
    this._depthOffset = 0
  }

  clone(): this {
    return new RowArtMeshMaterial(this._params) as this
  }
}
