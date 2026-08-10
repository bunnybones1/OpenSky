import { camelCase } from 'camel-case'
import {
  Color,
  FrontSide,
  RawShaderMaterial,
  ShaderMaterialParameters,
  Side,
  Uniform,
  Vector2,
  Vector3,
  Vector4
} from 'three'

import { AssetsManager } from '~/assets/index'
import { applyBlendMode, SupportedBlendMode } from '~/helpers/blendModeHelpers'
import { testOverdraw } from '~/renderSettings'
import { timeUniformFactory } from '~/timeUniforms'
import { fogFar, fogNear } from '~/userSettings'
import { AttributeRouter } from '~/utils/AttributeRouter'
import { globalAccess } from '~/utils/globalAccess'
import { buildParameters, defaultNumber } from '~/utils/jsUtils'
import { convertMaterialParamsToOverdrawTest } from '~/utils/materials'
import { upperSnakeCase } from '~/utils/stringUtils'
import { TextureRoute, TextureRouter } from '~/utils/TextureRouter'

import { lightCacheFudgeModeToggle } from '../lightCacheFudgeModeToggle'
import fragmentShader from './frag.glsl'
import vertexShader from './vert.glsl'

class Dyna<T> {
  constructor(
    public val: T,
    public attr: string
  ) {
    //
  }
}
type Data1 = number | string | Dyna<number> | TextureRoute
type Data2 = Vector2 | string | Dyna<Vector2> | TextureRoute
type Data3 = Color | Vector3 | string | Dyna<Vector3 | Color> | TextureRoute

export interface LightCacheMeshMaterialParameters {
  matLibId?: string
  diffusionColor: Data3
  diffusionInterpolation?: boolean
  diffusionRoughness: Data1
  wornEdges?: Data2
  emission?: Data3
  transmissionAmount: Data1
  transmissionColor?: Data3
  transmissionInterpolation?: boolean
  transmissionRoughness?: Data1
  reflectionInterpolation?: boolean
  reflectionColor?: Data3
  reflectionRoughness: Data1
  refractionZoom: number
  useMetallicDiffuse: boolean
  reflectionStrengthPerpendicularVSHeadOn?: Vector2
  fresnelStrength?: number
  opacity?: number
  useTransparency?: boolean
  useMetalShine?: boolean
  blackout?: string
  blackoutAfterEmission?: boolean
  useCentroids?: boolean
  centroidSettings?: 'wall' | 'plaque' | 'plaque_broken'
  centroidTestSpeed: number
  blendMode: SupportedBlendMode
  depthTest: boolean
  depthWrite: boolean
  side: Side
  finalColorScale?: Color
  fogColor?: Color
  fogNear?: number
  fogFar?: number
  useTextureUVTransform?: boolean
}

const __defaultParams: LightCacheMeshMaterialParameters = {
  diffusionColor: new Color(1, 1, 1),
  // reflectionColor: new Color(1, 1, 1),
  // emission: new Color(0, 0, 0.5),
  reflectionStrengthPerpendicularVSHeadOn: new Vector2(1, 0),
  transmissionAmount: 0,
  reflectionRoughness: 0.5,
  diffusionRoughness: 0.2,
  refractionZoom: 0.5,
  useMetallicDiffuse: true,
  opacity: 1,
  useCentroids: false,
  centroidTestSpeed: 1,
  blendMode: 'normal',
  depthTest: true,
  depthWrite: true,
  side: FrontSide,
  fogNear: fogNear.value,
  fogFar: fogFar.value
}

export default class LightCacheMeshMaterial extends RawShaderMaterial {
  private _params: LightCacheMeshMaterialParameters

  constructor(
    private _assetsManager: AssetsManager,
    options: Partial<LightCacheMeshMaterialParameters>
  ) {
    const params = buildParameters(__defaultParams, options)
    const uniforms: { [K: string]: Uniform } = {
      uLightCacheTexture:
        _assetsManager.getLazyTextureAssetUniform('lightCacheDaylight'),
      uExposureFix: new Uniform(1 / 0.3),
      uReflectionStrengthPerpendicularVSHeadOn: new Uniform(
        params.reflectionStrengthPerpendicularVSHeadOn
      )
    }
    const defines: any = {}

    const fragmentShaderPreamble = ''
    let vertexShaderPreamble = ''
    let fragmentShaderBeforeMain = ''
    let vertexShaderBeforeMain = ''
    let fragmentShaderMainStart = ''
    let vertexShaderMainStart = ''
    const allProps = [
      params.diffusionColor,
      params.emission,
      params.transmissionAmount,
      params.transmissionRoughness,
      params.transmissionColor,
      params.reflectionRoughness,
      params.reflectionColor,
      params.diffusionRoughness,
      params.wornEdges,
      params.blackout
    ]
    const usedAttributes = allProps.filter(
      a => typeof a === 'string'
    ) as string[]
    const usedTextures = allProps.filter(
      a => a instanceof TextureRoute
    ) as TextureRoute[]
    const attributes = new AttributeRouter(usedAttributes)
    const textures = new TextureRouter(usedTextures)
    defines.USE_SPECMODE_BLOCK = true

    uniforms.uRefractionZoom = new Uniform(
      defaultNumber(params.refractionZoom, 0.9)
    )

    if (lightCacheFudgeModeToggle.value) {
      defines.USE_SIMPLE_FUDGE = true
    }

    defines.USE_DIFFUSION_SPEC_INTERPOLATION = params.diffusionInterpolation
    defines.USE_TRANSMISSION_SPEC_INTERPOLATION =
      params.transmissionInterpolation
    defines.USE_REFLECTION_SPEC_INTERPOLATION = params.reflectionInterpolation

    function getGlslType(param: Data1 | Data2 | Data3 | undefined) {
      if (typeof param === 'string') {
        const chunks = param.split('.')
        if (chunks.length === 2) {
          switch (chunks[1].length) {
            case 1:
              return 'float'
            case 2:
              return 'vec2'
            case 3:
              return 'vec3'
            case 4:
              return 'vec4'
          }
        }
      }
      if (typeof param === 'number') {
        return 'float'
      } else if (param instanceof Vector2) {
        return 'vec2'
      } else if (param instanceof Vector3 || param instanceof Color) {
        return 'vec3'
      } else if (param instanceof Vector4) {
        return 'vec4'
      } else if (param === undefined) {
        return 'none'
      } else {
        return 'unknowntype'
      }
    }

    type GLSLParamType = Data1 | Data2 | Data3 | undefined

    function paramModeValidator(
      param: GLSLParamType
    ): 'skip' | 'mix' | 'simple' {
      if (typeof param === 'string') {
        return 'mix'
      }
      if (typeof param === 'number') {
        if (param === 0) {
          return 'skip'
        } else if (param === 1) {
          return 'simple'
        } else {
          return 'mix'
        }
      } else if (param instanceof Vector2) {
        if (param.x === 0 && param.y === 0) {
          return 'skip'
        } else if (param.x === 1 && param.y === 1) {
          return 'simple'
        } else {
          return 'mix'
        }
      } else if (param instanceof Vector3) {
        if (param.x === 0 && param.y === 0 && param.z === 0) {
          return 'skip'
        } else if (param.x === 1 && param.y === 1 && param.z === 1) {
          return 'simple'
        } else {
          return 'mix'
        }
      } else if (param instanceof Color) {
        if (param.r === 0 && param.g === 0 && param.b === 0) {
          return 'skip'
        } else if (param.r === 1 && param.g === 1 && param.b === 1) {
          return 'simple'
        } else {
          return 'mix'
        }
      } else if (param === undefined) {
        return 'skip'
      } else if (param instanceof TextureRoute) {
        return 'simple'
      }
      return 'skip'
    }

    function prepareDemarshalizer(
      param: GLSLParamType,
      basicName: string,
      extraScale = 1
    ) {
      const glslDefinition = upperSnakeCase(basicName)
      const glslType = getGlslType(param)
      const glslVaryingName = camelCase('v ' + basicName)
      const glslUniformName = camelCase('u ' + basicName)
      const mode = paramModeValidator(param)
      const glslDefinitionMode = upperSnakeCase(mode + ' ' + basicName)
      defines[glslDefinitionMode] = true
      // fragmentShaderBeforeMain += `#define ${glslDefinitionMode} true\n`

      if (typeof param === 'string') {
        vertexShaderBeforeMain += `varying ${glslType} ${glslVaryingName};\n`
        vertexShaderBeforeMain += `#define ${glslDefinition} ${glslVaryingName}\n`
        vertexShaderMainStart += `${glslDefinition} = ${param}${
          extraScale !== 1 ? ' * ' + extraScale.toFixed(4) : ''
        };\n`
        fragmentShaderBeforeMain += `varying ${glslType} ${glslVaryingName};\n`
        fragmentShaderBeforeMain += `#define ${glslDefinition} ${glslVaryingName}\n`
      } else if (param instanceof TextureRoute) {
        fragmentShaderBeforeMain += `#define ${glslDefinition} ${
          extraScale !== 1 ? extraScale.toFixed(4) + ' * ' : ''
        }${textures.getTexelName(param.texture)}.${param.values}\n`
      } else if (mode !== 'skip') {
        fragmentShaderBeforeMain += `uniform ${glslType} ${glslUniformName};\n`
        fragmentShaderBeforeMain += `#define ${glslDefinition} ${glslUniformName}\n`
        uniforms[glslUniformName] = new Uniform(param)
      }
    }
    prepareDemarshalizer(params.diffusionColor, 'diffusion color')
    prepareDemarshalizer(params.transmissionColor, 'transmission color')
    prepareDemarshalizer(params.reflectionColor, 'reflection color')

    prepareDemarshalizer(params.diffusionRoughness, 'diffusion roughness', 8)
    prepareDemarshalizer(
      params.transmissionRoughness,
      'transmission roughness',
      8
    )
    prepareDemarshalizer(params.reflectionRoughness, 'reflection roughness', 8)

    prepareDemarshalizer(params.emission, 'emission')

    prepareDemarshalizer(params.transmissionAmount, 'transmission amount')

    if (textures.hasAny()) {
      fragmentShaderMainStart += textures.getFragmentSamplerCode()
    }

    if (params.useMetallicDiffuse) {
      defines.USE_METALLIC_DIFFUSE = true
    }

    if (typeof params.wornEdges === 'string') {
      vertexShaderBeforeMain += 'varying vec2 vWornEdges;\n'
      vertexShaderMainStart += `vWornEdges = ${params.wornEdges};\n`
      fragmentShaderBeforeMain += 'varying vec2 vWornEdges;\n'
      fragmentShaderBeforeMain += '#define WORN_EDGES vWornEdges\n'
    }

    prepareDemarshalizer(params.blackout, 'blackout')
    if (params.blackoutAfterEmission) {
      defines.BLACKOUT_AFTER_EMISSION = true
    }

    if (params.useCentroids) {
      defines.USE_CENTROIDS = true
      if (
        params.centroidSettings &&
        params.centroidSettings.includes('plaque')
      ) {
        defines.CENTROID_SETTINGS_PLAQUE = true
        if (params.centroidSettings.includes('broken')) {
          defines.CENTROID_SETTINGS_PLAQUE_BROKEN = true
          uniforms.uCentroidTime2 = timeUniformFactory.getUniform(0.5)
        }
      }
      uniforms.uCentroidTime = timeUniformFactory.getUniform(
        params.centroidTestSpeed
      )
    }

    if (params.useMetalShine) {
      defines.USE_METAL_SHINE = true
      if (globalAccess.overrideAndLockMetalShine) {
        uniforms.uShineTime = new Uniform(0.25)
        uniforms.uShineTimeOffset = new Uniform(0.0)
      } else {
        uniforms.uShineTime = timeUniformFactory.getUniform(0.01)
        uniforms.uShineTimeOffset = new Uniform(-Math.random())
      }
    }

    if (params.finalColorScale) {
      defines.USE_FINAL_COLOR_SCALE = true
      uniforms.uFinalColorScale = new Uniform(params.finalColorScale)
    }

    if (params.fogColor) {
      defines.USE_FOG = true
      const fogColor = new Uniform(params.fogColor)
      const fogNearU = new Uniform(params.fogNear)
      const fogFarU = new Uniform(params.fogFar)
      fogNear.listen(v => (fogNearU.value = v))
      fogFar.listen(v => (fogFarU.value = v))
      uniforms.fogColor = fogColor
      uniforms.fogNear = fogNearU
      uniforms.fogFar = fogFarU
    }

    if (textures.hasAny()) {
      defines.USE_UVS = true
      vertexShaderBeforeMain += textures.getVertexShaderBeforeMain()
      fragmentShaderBeforeMain += textures.getFragmentShaderBeforeMain()
      textures.registerUniforms(uniforms, params.useTextureUVTransform)
    }
    vertexShaderPreamble += attributes.getVertexPreamble()
    function padMain(shader: string, beforeMain: string, mainStart: string) {
      return shader.replace(
        'void main() {',
        beforeMain + '\nvoid main() {\n' + mainStart
      )
    }
    const materialParams: ShaderMaterialParameters = {
      defines,
      uniforms,
      vertexShader:
        vertexShaderPreamble +
        padMain(vertexShader, vertexShaderBeforeMain, vertexShaderMainStart),
      fragmentShader:
        fragmentShaderPreamble +
        padMain(
          fragmentShader,
          fragmentShaderBeforeMain,
          fragmentShaderMainStart
        ),
      depthTest: params.depthTest,
      depthWrite: params.depthWrite,
      side: params.side,
      transparent: !!params.useTransparency,
      needsModelNormalMatrix: true
    }

    if (params.useTransparency) {
      defines.USE_TRANSPARENCY = true
    }

    if (testOverdraw.value) {
      convertMaterialParamsToOverdrawTest(materialParams)
    }

    if (params.blendMode !== 'normal') {
      applyBlendMode(materialParams, params.blendMode)
    }
    super(materialParams)
    this._params = params
    this.name = 'LightCacheMeshMaterial'
  }

  clone(): this {
    return new LightCacheMeshMaterial(this._assetsManager, this._params) as this
  }
  variant(options: Partial<LightCacheMeshMaterialParameters>): this {
    const mat = new LightCacheMeshMaterial(this._assetsManager, {
      ...this._params,
      ...options
    }) as this
    return mat
  }

  isVariantOf(params: LightCacheMeshMaterialParameters) {
    return params.matLibId === this._params.matLibId
  }

  hasLibId(str?: string) {
    return this._params.matLibId === str
  }
}
