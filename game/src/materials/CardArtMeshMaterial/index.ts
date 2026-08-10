import { clamp01 } from '@opensky/shared/utils/math'
import {
  listenToProperty,
  stopListeningToProperty
} from '@opensky/shared/utils/propertyListeners'
import { Rarity } from '@skyweaver/state-metadata'
import {
  Color,
  IUniform,
  Matrix4,
  RawShaderMaterial,
  ShaderMaterialParameters,
  Texture,
  Uniform,
  Vector2,
  Vector3,
  Vector4
} from 'three'

import FoilKit from '~/foils/FoilKit'
import { FoilContextType, FoilType } from '~/foils/FoilKitTypeHelpers'
import { ColorMatrixLib } from '~/helpers/ColorMatrixLib'
import { testOverdraw } from '~/renderSettings'
import { Easing } from '~/systems/animation/Easing'
import { simpleTweener } from '~/systems/animation/tweeners'
import UpdateManager from '~/systems/UpdateManager'
import { useCardColorOverlays } from '~/tempDesignOptions'
import { getFoilKit } from '~/tempFoilDesignOptions'
import { timeUniformFactory } from '~/timeUniforms'
import {
  timeWaveUniformFactory,
  TimeWaveUniformHelper
} from '~/timeWaveUniforms'
import { AnimatedBool } from '~/utils/AnimatedBool'
import AnimatedValue from '~/utils/AnimatedValue'
import { AttributeRouter } from '~/utils/AttributeRouter'
import { globalAccess } from '~/utils/globalAccess'
import { convertMaterialParamsToOverdrawTest } from '~/utils/materials'
import { mat4Blend } from '~/utils/threeMathUtils'

import fragmentShader from './frag.glsl'
import vertexShader from './vert.glsl'

const __metalColorGold = new Vector3(0.25, 0.1, -0.35)
const __metalColorSilver = new Vector3(-0.35, 0.1, 0.25).multiplyScalar(0.5)

const __specColorGold = new Vector3(1.25, 1.1, 0.65)
const __specColorSilver = new Vector3(0.83, 1.05, 1.125).multiplyScalar(0.65)

interface IDefines {
  COLOR_MASK_ATTRIBUTE: string
  PRETINT_ATTRIBUTE: string
  BG_MASK_ATTRIBUTE: string
  FG_MASK_ATTRIBUTE: string
  USE_CENTROIDS?: boolean
  RENDER_STREAMER_FRAME?: boolean
  USE_STEALTH_EFFECT?: boolean
  USE_COLOR_MATRIX?: boolean
  USE_FOIL?: boolean
  USE_MULTI_SURFACE?: boolean
}

interface CardArtMeshMaterialParameters {
  rarity: Rarity
  fgTexture: Texture
  bgTexture: Texture
  colorMaskVertexAttribute?: string
  pretintVertexAttribute?: string
  bgMaskVertexAttribute?: string
  fgMaskVertexAttribute?: string
  bgParallaxStrength?: number
  fgParallaxStrength?: number
  attachmentParallaxStrength?: number
  decalColor?: Color
  useCentroids?: boolean
  foilContext: FoilContextType
  accentColor?: Vector4
}

let __distortionWaveTime: Uniform | undefined
function __getDistortionWaveTime() {
  if (!__distortionWaveTime) {
    __distortionWaveTime = timeWaveUniformFactory.getUniform(0.1, 1.0)
  }
  return __distortionWaveTime!
}

const __foilAnimTimeHelper = new Map<string, TimeWaveUniformHelper>()
function __getFoilAnimTime(foilType: FoilType, context: FoilContextType) {
  const key = `${foilType}-${context}` as const
  if (!__foilAnimTimeHelper.has(key)) {
    const foilSettings = getFoilKit(foilType, context).settings
    const twuh = timeWaveUniformFactory.getUniformHelper(
      999,
      0.12,
      Math.PI,
      key
    )
    listenToProperty(foilSettings, 'foilWaveSpeed', v => {
      twuh.setFrequency(v)
    })
    __foilAnimTimeHelper.set(key, twuh)
  }
  return __foilAnimTimeHelper.get(key)!
}

const uStealthEffectSettingsOff = new Vector3(0.0, 1.0, 1.0)
const uStealthEffectSettingsA = new Vector3(0.09, 0.2, 0.35)
const uStealthEffectSettingsB = new Vector3(0.03, 0.7, 0.8)
const WHITE_ACCENT = new Vector4(1, 1, 1, 1)
export default class CardArtMeshMaterial extends RawShaderMaterial {
  private _stealthUniform: Uniform
  private _stealthSettingsVec: Vector3
  private _stealthGlitch: AnimatedValue
  foilKit: FoilKit | undefined
  onFoilKitToggle: (val: boolean) => void
  private _updateStealthSettings() {
    const sa = this.stealthActive.animatedValue
    const sv = this.stealthVulnerability.animatedValue
    this._stealthSettingsVec
      .copy(uStealthEffectSettingsA)
      .lerp(
        uStealthEffectSettingsB,
        Math.max(0.0, sv - 0.5 * this._stealthGlitch.value)
      )
      .lerp(uStealthEffectSettingsOff, 1 - sa)
    const distortionEmphasis1 = 1 - Math.abs(sa - 0.5) * 2
    const distortionEmphasis2 = 1 - Math.abs(sv - 0.5) * 2
    const distortionEmphasis = Math.max(
      distortionEmphasis1,
      distortionEmphasis2
    )
    this._stealthSettingsVec.x += distortionEmphasis * 0.5
  }
  stealthActive: AnimatedBool
  stealthVulnerability: AnimatedBool
  colorMatrixStackFg: ColorMatrixStackControllerFg
  colorMatrixStackWhole: ColorMatrixStackControllerWhole
  set fgTexture(val: Texture) {
    this._uFgTexture.value = val
  }
  get fgTexture() {
    return this._uFgTexture.value
  }

  set bgTexture(val: Texture) {
    this._uBgTexture.value = val
  }

  get bgTexture() {
    return this._uBgTexture.value
  }

  set fgParallaxStrength(val: number) {
    this._parallaxStrength.x = val
  }

  set bgParallaxStrength(val: number) {
    this._parallaxStrength.y = val
  }

  set decalColor(val: Color) {
    this._uDecalColor.value = val
  }
  set accentColor(val: Color) {
    this._uAccentColor.value = val
  }
  _parallaxStrength: Vector2
  private _params: CardArtMeshMaterialParameters
  private _uFgTexture: Uniform
  private _uBgTexture: Uniform
  private _uDecalColor: Uniform
  private _uAccentColor: Uniform

  constructor(params: CardArtMeshMaterialParameters) {
    const uFgTexture = new Uniform(params.fgTexture)
    const uBgTexture = new Uniform(params.bgTexture)
    const uDecalColor = new Uniform(params.decalColor || new Color('#73d0c2'))
    const uAccentColor = new Uniform(params.accentColor || WHITE_ACCENT)

    const parallaxStrength = new Vector2(
      params.fgParallaxStrength || 0.0,
      params.bgParallaxStrength || 0.2
    )
    const uniforms: {
      [uniform: string]: IUniform<any>
    } = {
      uFgTexture,
      uBgTexture,
      uParallaxStrength: new Uniform(parallaxStrength),
      uDecalColor,
      uAccentColor
    }

    const fragmentShaderPreamble = ''
    let vertexShaderPreamble = ''
    const attributes = new AttributeRouter([
      params.bgMaskVertexAttribute,
      params.fgMaskVertexAttribute,
      params.pretintVertexAttribute,
      params.colorMaskVertexAttribute
    ])
    const defines: IDefines = {
      FG_MASK_ATTRIBUTE: attributes.correct(params.fgMaskVertexAttribute!),
      BG_MASK_ATTRIBUTE: attributes.correct(params.bgMaskVertexAttribute!),
      COLOR_MASK_ATTRIBUTE: attributes.correct(
        params.colorMaskVertexAttribute!
      ),
      PRETINT_ATTRIBUTE: attributes.correct(params.pretintVertexAttribute!)
    }

    if (params.useCentroids) {
      defines.USE_CENTROIDS = true
      uniforms.uCentroidTime = timeUniformFactory.getUniform(1)
    }

    if (globalAccess.compositeMode === 'streamer') {
      defines.RENDER_STREAMER_FRAME = true
    }

    vertexShaderPreamble += attributes.getVertexPreamble()
    const materialParams: ShaderMaterialParameters = {
      defines,
      uniforms,
      vertexShader: vertexShaderPreamble + vertexShader,
      fragmentShader: fragmentShaderPreamble + fragmentShader,
      depthTest: true,
      depthWrite: true,
      needsInverseModelMatrix: true,
      // side: BackSide,
      extensions: {
        derivatives: true
      }
    }
    if (testOverdraw.value) {
      convertMaterialParamsToOverdrawTest(materialParams)
    }

    super(materialParams)

    this.defines = defines
    this._rarity = params.rarity
    this._foilContext = params.foilContext

    this.onFoilKitToggle = (val: boolean) => {
      defines.USE_FOIL = val
      this.needsUpdate = true
    }

    this._updateFoilKit()

    this._params = params
    this._uFgTexture = uFgTexture
    this._uBgTexture = uBgTexture
    this._uDecalColor = uDecalColor
    this._uAccentColor = uAccentColor
    this._parallaxStrength = parallaxStrength
    const stealthSettingsVec = new Vector3()
    this._stealthSettingsVec = stealthSettingsVec
    this._stealthUniform = new Uniform(stealthSettingsVec)
    const stealthGlitch = new AnimatedValue(v => {
      v += Math.sin(v) * 1.7
      const v2 = Math.sin(v * 45) + (Math.sin(v * 4) * 6 - 5)
      return clamp01(Math.max(0.0, v2 + Math.cos(v2 * 10))) * 0.3
    })
    listenToProperty(
      stealthGlitch,
      'value',
      () => {
        this._updateStealthSettings()
      },
      false
    )
    this._stealthGlitch = stealthGlitch

    //color matrix effect
    let lastStealthStrength = 0
    this.stealthActive = new AnimatedBool(
      value => {
        const shouldUpdateShader =
          (lastStealthStrength === 0 && value > 0) ||
          (lastStealthStrength > 0 && value === 0)
        lastStealthStrength = value
        if (value > 0) {
          this._updateStealthSettings()
        }
        if (shouldUpdateShader) {
          if (value > 0) {
            defines.USE_STEALTH_EFFECT = true
            uniforms.uStealthEffectSettings = this._stealthUniform
            uniforms.uWaveTime = __getDistortionWaveTime()
            UpdateManager.register(stealthGlitch)
          } else {
            delete defines.USE_STEALTH_EFFECT
            delete uniforms.uStealthEffectSettings
            delete uniforms.uWaveTime
            UpdateManager.unregister(stealthGlitch)
          }
          this.needsUpdate = true
        }
      },
      false,
      1500
    )
    this.stealthVulnerability = new AnimatedBool(
      () => {
        if (this.stealthActive.animatedValue > 0) {
          this._updateStealthSettings()
        }
      },
      false,
      1000
    )

    this.colorMatrixStackFg = new ColorMatrixStackControllerFg(this)
    this.colorMatrixStackWhole = new ColorMatrixStackControllerWhole(this)

    if (useCardColorOverlays.value) {
      let vis = this.visible
      Object.defineProperty(this, 'visible', {
        get: function () {
          if (vis) {
            this.colorMatrixStackFg.update()
            this.colorMatrixStackWhole.update()
          }
          return vis
        },
        set: function (v) {
          vis = v
        }
      })
    }
  }
  private _rarity: Rarity
  get rarity(): Rarity {
    return this._rarity
  }
  set rarity(value: Rarity) {
    this._rarity = value
    this._updateFoilKit()
  }
  private _foilContext: FoilContextType
  get foilContext(): FoilContextType {
    return this._foilContext
  }
  set foilContext(value: FoilContextType) {
    this._foilContext = value
    this._updateFoilKit()
  }
  private _updateFoilKit() {
    const foilRarity =
      this._rarity === 'silver' || this._rarity === 'gold'
        ? this._rarity
        : undefined

    const foilKit = foilRarity
      ? getFoilKit(foilRarity, this._foilContext)
      : undefined

    if (this.foilKit === foilKit) {
      return
    }

    if (this.foilKit) {
      stopListeningToProperty(
        this.foilKit.settings,
        'active',
        this.onFoilKitToggle
      )
    }

    const defines = this.defines as IDefines
    const uniforms = this.uniforms

    if (foilKit && foilRarity) {
      defines.USE_FOIL = foilKit.settings.active
      uniforms.uFoilRGBSplit = foilKit.uniforms.foilRGBSplit
      uniforms.uMetalColor = new Uniform(
        foilRarity === 'gold' ? __metalColorGold : __metalColorSilver
      )
      uniforms.uMetalColorStrength = foilKit.uniforms.metalColorStrength
      uniforms.uGlintColor = new Uniform(
        foilRarity === 'gold' ? __specColorGold : __specColorSilver
      )
      uniforms.uFoilBandWavelength = foilKit.uniforms.foilBandWavelength
      uniforms.uBandOffset = new Uniform(1.1)
      simpleTweener.to({
        description: 'autoscrolling shine on foils',
        target: uniforms.uBandOffset,
        propertyGoals: { value: 0.6 },
        easing: Easing.Custom.SuperFastOut,
        duration: 1000
      })
      uniforms.uFoilOnArtOnly = globalAccess.useTrueArtistColorsOnCardArt
        ? new Uniform(
            new Vector3(
              foilKit.uniforms.foilOnArtOnly.value.x * 0.5,
              foilKit.uniforms.foilOnArtOnly.value.y,
              foilKit.uniforms.foilOnArtOnly.value.z
            )
          )
        : foilKit.uniforms.foilOnArtOnly
      uniforms.uTiltShineSensitivity = foilKit.uniforms.tiltShineSensitivity

      uniforms.uFoilAnimTime = __getFoilAnimTime(foilRarity, this._foilContext)

      listenToProperty(foilKit.settings, 'active', this.onFoilKitToggle)
    } else {
      defines.USE_FOIL = false
    }
    this.needsUpdate = true
    this.foilKit = foilKit
  }
  dispose() {
    UpdateManager.unregister(this._stealthGlitch)
    if (this.foilKit) {
      stopListeningToProperty(
        this.foilKit.settings,
        'active',
        this.onFoilKitToggle
      )
    }
  }
  clone(): this {
    return new CardArtMeshMaterial(this._params) as this
  }
  variant(params: Partial<CardArtMeshMaterialParameters>): this {
    return new CardArtMeshMaterial({ ...this._params, ...params }) as this
  }
}

const __colorMartixIdentity = ColorMatrixLib.identity
class ColorMatrixController {
  animator: AnimatedBool
  mixedColorMatrix: Matrix4
  amt = 0
  constructor(
    public colorMatrix: Matrix4,
    durIn: number = 500,
    durOut: number = 500
  ) {
    const mixedColorMatrix = new Matrix4()
    this.mixedColorMatrix = mixedColorMatrix
    this.animator = new AnimatedBool(
      amt => {
        if (amt > 0 && amt < 1) {
          mat4Blend(mixedColorMatrix, __colorMartixIdentity, colorMatrix, amt)
        }
        this.amt = amt
      },
      false,
      durIn,
      undefined,
      durOut
    )
  }
}

class ColorMatrixStackController {
  finalColorMatrix = new Matrix4()
  private _colorMatricesUsed = 0
  private _colorMatrixUniform: Uniform
  protected _stack: ColorMatrixController[]
  constructor(
    private _material: CardArtMeshMaterial,
    private _uniformName = 'uColorMatrix',
    private _define = 'USE_COLOR_MATRIX'
  ) {
    this._colorMatrixUniform = new Uniform(this.finalColorMatrix)
  }
  update() {
    this.finalColorMatrix.identity()
    const lastcolorMatricesUsed = this._colorMatricesUsed
    this._colorMatricesUsed = 0
    for (const cmc of this._stack) {
      if (cmc.amt === 1) {
        this.finalColorMatrix.premultiply(cmc.colorMatrix)
        this._colorMatricesUsed++
      } else if (cmc.amt > 0) {
        this.finalColorMatrix.premultiply(cmc.mixedColorMatrix)
        this._colorMatricesUsed++
      }
    }
    const mat = this._material
    if (this._colorMatricesUsed > 0 && lastcolorMatricesUsed === 0) {
      mat.defines[this._define] = true
      mat.uniforms[this._uniformName] = this._colorMatrixUniform
      mat.needsUpdate = true
    } else if (this._colorMatricesUsed === 0 && lastcolorMatricesUsed > 0) {
      delete mat.defines[this._define]
      delete mat.uniforms[this._uniformName]
      mat.needsUpdate = true
    }
  }
}

class ColorMatrixStackControllerFg extends ColorMatrixStackController {
  heal = new ColorMatrixController(ColorMatrixLib.healyGreen, 100, 400)
  frozen = new ColorMatrixController(ColorMatrixLib.icy)
  damage = new ColorMatrixController(ColorMatrixLib.damageWhite, 100, 500)
  withered = new ColorMatrixController(ColorMatrixLib.withered, 600, 1000)
  heroAbilityProgressing = new ColorMatrixController(
    ColorMatrixLib.counterIncreaseGlow,
    200,
    1000
  )
  stealthChange = new ColorMatrixController(
    ColorMatrixLib.intenseStealthyBlue,
    400,
    800
  )
  whiteFlash = new ColorMatrixController(
    ColorMatrixLib.intenseWhiteLight,
    200,
    1200
  )
  //for demo purposes
  // grayscale1 = new ColorMatrixController(ColorMatrixLib.desaturate, 1000, 1000)
  // invertValue = new ColorMatrixController(ColorMatrixLib.invertValuesOnly, 1000, 1000)
  // invertHue = new ColorMatrixController(ColorMatrixLib.invertedSaturation, 1000, 1000)
  // grayscale2 = new ColorMatrixController(ColorMatrixLib.desaturate, 1000, 1000)

  constructor(material: CardArtMeshMaterial) {
    super(material, 'uColorMatrixFg', 'USE_COLOR_MATRIX_FG')
    this._stack = [
      // this.grayscale1,
      // this.invertValue,
      // this.invertHue,
      this.heroAbilityProgressing,
      this.heal,
      this.frozen,
      this.withered,
      this.stealthChange,
      this.damage,
      this.whiteFlash
      // this.grayscale2
    ]
  }
}

class ColorMatrixStackControllerWhole extends ColorMatrixStackController {
  castStart = new ColorMatrixController(
    ColorMatrixLib.intenseGoldenLight,
    200,
    600
  )
  changeBase = new ColorMatrixController(
    ColorMatrixLib.intenseWhiteLight,
    0,
    600
  )
  deathGrayscale = new ColorMatrixController(
    ColorMatrixLib.desaturate,
    200,
    600
  )
  constructor(material: CardArtMeshMaterial) {
    super(material)
    this._stack = [this.castStart, this.changeBase, this.deathGrayscale]
  }
}
