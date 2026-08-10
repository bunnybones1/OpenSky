import {
  DoubleSide,
  IUniform,
  RawShaderMaterial,
  Texture,
  Uniform,
  Vector2,
  Vector4
} from 'three'

import { blendModeParams, SupportedBlendMode } from '~/helpers/blendModeHelpers'
import { timeUniformFactory } from '~/timeUniforms'
import { buildParameters } from '~/utils/jsUtils'
import { getTempTexture } from '~/utils/tempTexture'

import fragmentShader from './frag.glsl'
import vertexShader from './vert.glsl'

interface PortalMeshMaterialOptions {
  map: Texture | Uniform
  colorScale?: Vector4
  colorOffset?: Vector4
  colorBottomScale?: Vector4
  colorBottomOffset?: Vector4
  opacity?: number
  scrollTiling?: Vector2
  blendMode?: SupportedBlendMode
  useInnerDetails?: boolean
  useOuterDetails?: boolean
  reverse?: boolean
}

const __defaultOptions: PortalMeshMaterialOptions = {
  map: getTempTexture(),
  colorScale: new Vector4(0.35, 0.65, 1.8, 1.0),
  colorOffset: new Vector4(-0.1, -0.3, -0.8, -0.5),
  colorBottomScale: new Vector4(0.35, 0.65, 1.8, 1.0),
  colorBottomOffset: new Vector4(-0.1, -0.3, -0.8, -0.5),
  opacity: 1,
  scrollTiling: new Vector2(7, 22),
  blendMode: 'normalAlpha',
  useInnerDetails: true,
  useOuterDetails: true
}

interface IDefines {
  USE_INNER_DETAILS?: true
  USE_OUTER_DETAILS?: true
}

function __uniqueVec2() {
  return new Vector2(Math.random() * 10, Math.random() * 10)
}
export default class PortalMeshMaterial extends RawShaderMaterial {
  private static __timeXForward: Uniform | undefined
  private static __timeYForward: Uniform | undefined
  private static __timeXBackward: Uniform | undefined
  private static __timeYBackward: Uniform | undefined
  static get timeXForward() {
    if (!PortalMeshMaterial.__timeXForward) {
      PortalMeshMaterial.__timeXForward = timeUniformFactory.getUniform(1)
    }
    return PortalMeshMaterial.__timeXForward
  }
  static get timeYForward() {
    if (!PortalMeshMaterial.__timeYForward) {
      PortalMeshMaterial.__timeYForward = timeUniformFactory.getUniform(1)
    }
    return PortalMeshMaterial.__timeYForward
  }
  static get timeXBackward() {
    if (!PortalMeshMaterial.__timeXBackward) {
      PortalMeshMaterial.__timeXBackward = timeUniformFactory.getUniform(-1)
    }
    return PortalMeshMaterial.__timeXBackward
  }
  static get timeYBackward() {
    if (!PortalMeshMaterial.__timeYBackward) {
      PortalMeshMaterial.__timeYBackward = timeUniformFactory.getUniform(-1)
    }
    return PortalMeshMaterial.__timeYBackward
  }
  parameters: PortalMeshMaterialOptions
  constructor(options: PortalMeshMaterialOptions) {
    const parameters = buildParameters(__defaultOptions, options)
    options = { ...__defaultOptions, ...options }
    const uMap =
      options.map instanceof Uniform ? options.map : new Uniform(options.map)
    const uniforms: {
      [uniform: string]: IUniform<any>
    } = {
      map: uMap,
      opacity: new Uniform(options.opacity),
      timeX: parameters.reverse
        ? PortalMeshMaterial.timeXBackward
        : PortalMeshMaterial.timeXForward,
      timeY: parameters.reverse
        ? PortalMeshMaterial.timeYBackward
        : PortalMeshMaterial.timeYForward,
      uniqueness: new Uniform(__uniqueVec2()),
      colorScale: new Uniform(options.colorScale!),
      colorOffset: new Uniform(options.colorOffset!),
      colorBottomScale: new Uniform(options.colorBottomScale!),
      colorBottomOffset: new Uniform(options.colorBottomOffset!)
    }

    const defines: IDefines = {}
    if (parameters.useInnerDetails) {
      defines.USE_INNER_DETAILS = true
    }
    if (parameters.useOuterDetails) {
      defines.USE_OUTER_DETAILS = true
    }

    super({
      defines,
      uniforms,
      vertexShader,
      fragmentShader,
      side: DoubleSide,
      ...blendModeParams[parameters.blendMode!]
    })

    this.parameters = parameters
  }

  setUvST(value: Vector4) {
    this.uniforms.uUvST = new Uniform(value)
    this.defines.USE_UV_ST = true
    this.needsUpdate = true
  }

  clone() {
    const clone = super.clone()
    clone.uniforms.timeX = this.uniforms.timeX
    clone.uniforms.timeY = this.uniforms.timeY
    clone.uniforms.map.value = this.uniforms.map.value
    clone.uniforms.uniqueness.value = __uniqueVec2()
    return clone
  }
  variant(options?: Partial<PortalMeshMaterialOptions>) {
    return new PortalMeshMaterial({
      ...this.parameters,
      ...options
    })
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
