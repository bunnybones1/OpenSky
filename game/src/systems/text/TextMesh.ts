import { i18n, isSupportedLanguage } from '@opensky/language-manager'
import {
  listenToProperty,
  listenToPropertyDynamic,
  stopListeningToProperty,
  stopListeningToPropertyDynamic
} from '@opensky/shared/utils/propertyListeners'
import {
  AxesHelper,
  Box3,
  BufferAttribute,
  BufferGeometry,
  Camera,
  Color,
  Float32BufferAttribute,
  Matrix4,
  Mesh,
  PlaneBufferGeometry,
  RawShaderMaterial,
  Scene,
  Sphere,
  Texture,
  Vector2,
  Vector4,
  WebGLRenderer
} from 'three'
import createGeometry from 'three-bmfont-text'

import { COLOR_BLACK } from '~/colors/colorLibrary'
import Gradient from '~/colors/Gradient'
import { toVertexColors } from '~/colors/gradientUtils'
import { ColorParameter, MetaColorParameter } from '~/colors/types'
import { toColor } from '~/colors/utils'
import queryParams from '~/queryParams'
import { getCharSafetyRegex, getFontCharMetaCache } from '~/utils/fontCharUtils'
import Box3Helper from '~/utils/helpers/Box3Helper'
import { lockProp } from '~/utils/jsUtils'
import { PPM } from '~/utils/measurements'
import { onNextFrame } from '~/utils/onNextFrame'
import { hashStringAsNumber } from '~/utils/stringUtils'
import { getPrerenderKit, makeBox3Helper } from '~/utils/threeUtils'

import { DEBUG_TEXT, RENDER_ORDERS } from '../../constants'
import { simpleTweener } from '../animation/tweeners'
import FontFace from './FontFace'
import { fontUtils } from './fontUtils'
import TextMaterial from './TextMaterial'
import { TextMeshEffect } from './textMeshEffects'
import * as textOptions from './TextOptions'

const DEFAULT_FONT_WEIGHT = 1.0
const DEFAULT_ITALIC_SKEW = 0.0

export type TextValue = string | number | TextSegment[]

export interface TextSegment {
  text: string
  color: MetaColorParameter
  fontWeight?: number
  italicSkew?: number
  xOffset?: number
  yOffset?: number
}

const reduceTextSegments = (text: TextValue) =>
  Array.isArray(text)
    ? text.reduce((acc, segment) => {
        return acc.concat(segment.text)
      }, '')
    : String(text)

const __mat = new Matrix4()

const trackedFontFaceTextures: Texture[] = []
function getFontFaceSubOrder(texture?: Texture) {
  if (!texture) {
    return -1
  }
  const index = trackedFontFaceTextures.indexOf(texture)
  if (index === -1) {
    trackedFontFaceTextures.push(texture)
    return trackedFontFaceTextures.length - 1
  } else {
    return index
  }
}

function __flatSafeString(text: TextValue, font: BMFont) {
  return reduceTextSegments(text).replace(getCharSafetyRegex(font), '□')
}

function __enforceSegmentsColor(
  text: TextValue,
  defaultColor: MetaColorParameter
) {
  return Array.isArray(text)
    ? (text as TextSegment[])
    : [
        {
          text: text + '',
          color: defaultColor
        }
      ]
}

function __enforceSegmentsWeight(text: TextValue) {
  return Array.isArray(text)
    ? (text as TextSegment[])
    : [
        {
          text: text + '',
          color: COLOR_BLACK
        }
      ]
}

function __segmentsHaveMultipleColors(
  segments: TextSegment[],
  color: MetaColorParameter
) {
  const metaColors = Array.from(new Set(segments.map(s => s.color)))
  return (
    metaColors.length > 1 ||
    (metaColors.length === 1 && metaColors[0] instanceof Gradient) ||
    color instanceof Gradient
  )
}

function __segmentsHaveMultipleWeights(segments: TextSegment[]) {
  return Array.from(new Set(segments.map(s => s.fontWeight))).length > 1
}

function __getColorMode(text: TextValue, defaultColor: MetaColorParameter) {
  const segments = __enforceSegmentsColor(text, defaultColor)
  return __segmentsHaveMultipleColors(segments, defaultColor)
    ? 'attribute'
    : 'uniform'
}

function __getAlternateDefaultColor(
  text: TextValue,
  defaultColor: MetaColorParameter
) {
  const segments = __enforceSegmentsColor(text, defaultColor)
  if (segments.length > 0) {
    const c = segments[0].color
    if (c instanceof Color) {
      return c
    }
  }
  return undefined
}

function __getWeightMode(text: TextValue) {
  const segments = __enforceSegmentsWeight(text)
  return __segmentsHaveMultipleWeights(segments) ? 'attribute' : 'uniform'
}

function __computeInterlacedBounds(
  geometry: BufferGeometry,
  positions: Float32Array,
  itemSize: number
) {
  if (!geometry.boundingBox) {
    geometry.boundingBox = new Box3()
  }
  const bb = geometry.boundingBox
  const bbMin = bb.min
  const bbMax = bb.max
  for (let i = 0, ix = 0; ix < positions.length; i++, ix += itemSize) {
    const x = positions[ix]
    const y = positions[ix + 1]
    bbMax.x = Math.max(x, bbMax.x)
    bbMax.y = Math.max(y, bbMax.y)
    bbMin.x = Math.min(x, bbMin.x)
    bbMin.y = Math.min(y, bbMin.y)
  }
  bbMax.z = 0.0001
  bbMin.z = -0.0001
  geometry.boundingSphere = new Sphere()
  geometry.boundingBox.getBoundingSphere(geometry.boundingSphere)
}

const __indices = new Map<number, BufferAttribute>()
function __consolidateIndexBuffers(geometry: BufferGeometry) {
  const b = geometry.getIndex()
  const t = b?.count
  if (t && b) {
    if (!__indices.has(t)) {
      __indices.set(t, b)
    } else {
      geometry.setIndex(__indices.get(t)!)
    }
  }
}

export default class TextMesh extends Mesh<BufferGeometry, TextMaterial> {
  private set dirty(value: boolean) {
    if (!this._dirtySafety && !this._dirty && value) {
      this._dirty = true
      onNextFrame(this.updateGeometry)
    }
  }

  set text(text: TextValue) {
    if (this._text !== text) {
      const textStr = reduceTextSegments(text)
      this._text = text
      this.dirty = true

      if (!this._dirtySafety && this._oldText && this.options.onTextChanged) {
        this.options.onTextChanged(this, textStr, this._oldText)
      }

      if (this.textMeshEffect) {
        this.textMeshEffect(this, textStr)
      }

      this._oldText = textStr
    }
  }

  get text() {
    return this._text
  }

  get isEmpty() {
    return !this._text || (typeof this._text !== 'number' && !this._text.length)
  }

  get color() {
    if (this.material.colorMode === 'uniform') {
      return this.material.color!
    } else {
      throw new Error(
        'Cannot get color on TextMesh whose colorMode is "attribute"'
      )
    }
  }

  set color(value: ColorParameter) {
    if (typeof value !== 'object') {
      value = toColor(value)
    }

    this._globalColor = value

    const { topLeft, topRight, bottomLeft, bottomRight } = toVertexColors(value)
    if (this.material.colorMode === 'attribute') {
      const colorBufferAttribute = (
        this.geometry as BufferGeometry
      ).getAttribute('color') as BufferAttribute

      const colors = colorBufferAttribute.array as Float32Array

      for (let i = 0; i < colors.length; i += 12) {
        colors.set(topLeft, i + 0)
        colors.set(bottomLeft, i + 3)
        colors.set(bottomRight, i + 6)
        colors.set(topRight, i + 9)
      }

      colorBufferAttribute.needsUpdate = true
    } else {
      if (value instanceof Color) {
        this.material.color = value
      } else {
        throw new Error(
          'Cannot set color on TextMesh whose colorMode is uniforms. Use a Color instead'
        )
      }
    }
  }

  set strokeWidth(value: number) {
    const mat = this.material
    if (mat.uniforms.strokeWidth.value !== value) {
      mat.uniforms.strokeWidth.value = value
      const needsStrokeShader = value > 0
      if (needsStrokeShader !== mat.defines.USE_STROKE) {
        mat.defines.USE_STROKE = needsStrokeShader
        mat.needsUpdate = true
      }
    }
  }

  get opacity() {
    return this.material.opacity
  }

  set opacity(value: number) {
    this.material.opacity = value
  }
  private set optimizeRenderOrder(val: boolean) {
    if (this._optimizeRenderOrder === val) {
      return
    }
    this._optimizeRenderOrder = val
    this._maybeUpdateOptimizedRenderOrder()
  }
  options: textOptions.TextOptions
  onMeasurementsUpdated?: (mesh: TextMesh) => void
  textGeometryOptions: object
  box3Helper: Box3Helper

  width: number
  height: number
  textScale: number = 1

  livePropObject?: Record<string, any>
  livePropName?: string
  textMeshEffect?: TextMeshEffect

  private _dirty: boolean = false
  private _text: TextValue
  private _oldText: string
  private _globalColor: Color | Gradient
  private _fontFace: FontFace
  private _echoClones: Mesh[] = []

  private _dirtySafety = true

  constructor(
    text: TextValue = '',
    options: textOptions.TextOptions = textOptions.generic,
    livePropObject?: any,
    livePropName?: string,
    textMeshEffect?: TextMeshEffect,
    onMeasurementsUpdated?: (mesh: TextMesh) => void,
    private _optimizeRenderOrder: boolean = true,
    private _animationCharactersPerSecond: number | undefined = undefined
  ) {
    super(
      tryCreateTextGeometry(
        text,
        options,
        undefined,
        _animationCharactersPerSecond
      ),
      new TextMaterial(
        options,
        __getColorMode(text, options.color),
        __getWeightMode(text),
        __getAlternateDefaultColor(text, options.color)

        //implement __getAlternateDefaultWeight, which would be skimmed from the text segments. This is just in case the weight of a single segment is different than the textOption.weight
      )
    )

    this.onMeasurementsUpdated = onMeasurementsUpdated
    this.textMeshEffect = textMeshEffect

    listenToProperty(options, 'fontFace', this.onFontFaceChange, true)

    this._text = text
    this.options = options
    this.updateMeasurements()

    if (this.textMeshEffect) {
      const textStr = reduceTextSegments(text)
      this.textMeshEffect(this, textStr)
    }

    this.userData.isFrontFacing = true

    if (DEBUG_TEXT) {
      const axesHelper = new AxesHelper(0.01)
      this.add(axesHelper)

      const box3Helper = makeBox3Helper(this.geometry.boundingBox!)
      this.add(box3Helper)
      this.box3Helper = box3Helper
    }
    this.livePropObject = livePropObject
    this.livePropName = livePropName
    this.frustumCulled = false
    if (queryParams.disableText) {
      this.visible = false
      lockProp(this, 'visible')
    }
    this._dirtySafety = false
  }

  onFontFaceChange = (newFontFace: FontFace, oldFontFace: FontFace) => {
    if (oldFontFace) {
      stopListeningToProperty(
        oldFontFace,
        'msdfTexture',
        this.onFontTextureUpdate
      )
      stopListeningToProperty(oldFontFace, 'font', this.onFontUpdate)
    }
    listenToProperty(newFontFace, 'msdfTexture', this.onFontTextureUpdate)
    listenToProperty(newFontFace, 'font', this.onFontUpdate)

    newFontFace.init(isSupportedLanguage(i18n.language) ? i18n.language : 'en')
    this._fontFace = newFontFace
    this._maybeUpdateOptimizedRenderOrder()
  }

  onFontTextureUpdate = (texture: Texture) => {
    ;(this.material as RawShaderMaterial).uniforms.msdf.value = texture
    this._maybeUpdateOptimizedRenderOrder()
  }

  onFontUpdate = () => {
    this.dirty = true
  }

  onBeforeRender = (renderer: WebGLRenderer, scene: Scene, camera: Camera) => {
    if (this.options.screenSpace) {
      const clipPos = this.material.uniforms.clipSpacePosition.value as Vector4
      __mat
        .multiplyMatrices(camera.matrixWorldInverse, this.matrixWorld)
        .premultiply(camera.projectionMatrix) //.multiply(camera.projectionMatrix)
      clipPos.set(0, 0, 0, 1).applyMatrix4(__mat)
    }
  }
  updateGeometry = (force = false) => {
    if (this._dirty || force) {
      this._dirty = false
      this.regenerateGeometry()
      getPrerenderKit().add(this)
    }
  }

  updateText = (value: any = '') => {
    this.text = `${value}`
  }

  changeLiveProp(livePropObject: any) {
    if (livePropObject === this.livePropObject) {
      return
    }
    if (this.livePropObject && this.livePropName) {
      stopListeningToPropertyDynamic(
        this.livePropObject,
        this.livePropName,
        this.updateText
      )
    }
    this.livePropObject = livePropObject
    if (this.livePropObject && this.livePropName) {
      listenToPropertyDynamic(
        this.livePropObject,
        this.livePropName,
        this.updateText,
        true
      )
    }
  }

  onAdd() {
    if (this.livePropObject && this.livePropName) {
      listenToPropertyDynamic(
        this.livePropObject,
        this.livePropName,
        this.updateText,
        true
      )
    }
  }

  onRemove() {
    stopListeningToProperty(this.options, 'fontFace', this.onFontFaceChange)
    if (this.livePropObject && this.livePropName) {
      stopListeningToPropertyDynamic(
        this.livePropObject,
        this.livePropName,
        this.updateText
      )
    }
    if (this._fontFace) {
      stopListeningToProperty(
        this._fontFace,
        'msdfTexture',
        this.onFontTextureUpdate
      )
      stopListeningToProperty(this._fontFace, 'font', this.onFontUpdate)
    }
  }

  echoClone() {
    const ec = new Mesh(this.geometry, this.material)
    this._echoClones.push(ec)
    ec.renderOrder = this.renderOrder
    return ec
  }

  private _maybeUpdateOptimizedRenderOrder() {
    const tex = (this.material as RawShaderMaterial).uniforms.msdf
      .value as Texture
    if (tex && this._optimizeRenderOrder && this._fontFace) {
      this.renderOrder =
        RENDER_ORDERS.text +
        getFontFaceSubOrder(tex) * 0.001 +
        (this._fontFace.name.includes('Shadow') ? -0.5 : 0) +
        __textGeoCacheValues.indexOf(this.geometry) * 0.00001 +
        (this.material.depthWrite ? -0.01 : 0)
      for (const ec of this._echoClones) {
        ec.renderOrder = this.renderOrder
      }
    }
  }

  private _cleanupGeometry = (geometry: BufferGeometry) => {
    if (!__textGeoCacheValues.includes(geometry)) {
      geometry.dispose()
    }
  }

  private regenerateGeometry() {
    const oldGeometry = this.geometry
    if (oldGeometry && oldGeometry !== tempBlankGeo) {
      onNextFrame(() => this._cleanupGeometry(oldGeometry))
    }
    this.geometry = tryCreateTextGeometry(
      this._text,
      this.options,
      this._globalColor,
      this._animationCharactersPerSecond
    )

    this._maybeUpdateOptimizedRenderOrder()

    for (const ec of this._echoClones) {
      ec.geometry = this.geometry
    }

    if (DEBUG_TEXT && this.box3Helper) {
      this.box3Helper.box = this.geometry.boundingBox!
    }

    this.updateMeasurements()
  }

  private updateMeasurements() {
    const bb = this.geometry.boundingBox!
    this.width = bb.max.x - bb.min.x
    this.height = Math.abs(bb.max.y - bb.min.y)
    this.userData.resolution = new Vector2(this.width, this.height)
    if (this.onMeasurementsUpdated) {
      this.onMeasurementsUpdated(this)
    }
  }
}

const tempBlankGeo = new PlaneBufferGeometry(0.0001, 0.0001)
tempBlankGeo.computeBoundingBox()

const __textGeoCacheKeys: number[] = []
const __textGeoCacheValues: Array<BufferGeometry> = []

function tryCreateTextGeometry(
  text: TextValue,
  options: textOptions.TextOptions,
  overrideColor?: Color | Gradient,
  animationCharactersPerSecond?: number
) {
  if (typeof text === 'number') {
    text = String(text)
  }
  if (options.fontFace.font && text) {
    const font = options.fontFace.font!
    const flatText = __flatSafeString(text, font)
    const cachable = flatText.length <= 20 // TODO XXX WARNING changing non-cachable long strings that get dynamic geometry changes dispose shared index attrs.
    const hash = cachable
      ? hashStringAsNumber(
          `${flatText};${options.fontFace.name};${options.size};${options.constantSizeOnScreen};${options.scaleDownToPhysicalSize};${options.align};${options.cacheHashFudge}`
        )
      : 0
    const index = cachable ? __textGeoCacheKeys.indexOf(hash) : -1
    if (index !== -1) {
      return __textGeoCacheValues[index]
    } else {
      const geometry = createTextGeometry(text, options, overrideColor)

      if (animationCharactersPerSecond) {
        const target = { value: 0 }
        geometry.drawRange.count = 0
        const duration = (flatText.length * 1000) / animationCharactersPerSecond
        simpleTweener.to({
          target,
          description: 'glitchy text',
          propertyGoals: { value: 1 },
          onUpdate() {
            geometry.drawRange.count =
              ~~((target.value * geometry.index!.count) / 6) * 6
          },
          duration
        })
      }

      if (cachable) {
        __textGeoCacheKeys.push(hash)
        __textGeoCacheValues.push(geometry)
      }
      return geometry
    }
  } else {
    return tempBlankGeo
  }
}

const createTextGeometry = (
  text: TextValue,
  options: textOptions.TextOptions,
  overrideColor?: Color | Gradient
): BufferGeometry => {
  const font = options.fontFace.font!
  const textStr = __flatSafeString(text, font)
  const geometry = createGeometry({
    text: `${textStr}`,
    font,
    align: options.align,
    width:
      options.width !== undefined
        ? (options.width / options.size) * font.info.size
        : undefined,
    lineHeight:
      options.lineHeight !== undefined
        ? options.lineHeight * font.info.size
        : undefined,
    letterSpacing: options.letterSpacing
  })
  __consolidateIndexBuffers(geometry)
  const posAttr = geometry.getAttribute('position')
  const posArr = posAttr.array
  const uvArr = geometry.getAttribute('uv').array
  const xyuvs = new Float32Array(posAttr.count * 4)
  let i2 = 0
  let i4 = 0
  for (let i = 0; i < posAttr.count; i++) {
    i2 = i * 2
    i4 = i * 4
    xyuvs[i4] = posArr[i2]
    xyuvs[i4 + 1] = posArr[i2 + 1]
    xyuvs[i4 + 2] = uvArr[i2]
    xyuvs[i4 + 3] = uvArr[i2 + 1]
  }
  const vertCount = posAttr.count
  //const charCount = vertCount / 4
  const defaultColor = overrideColor || options.color
  const segments = __enforceSegmentsColor(text, defaultColor)
  const useColorAttribute = __segmentsHaveMultipleColors(segments, defaultColor)

  const { base } = font.common
  const colorsAttrArray = useColorAttribute
    ? new Float32Array(vertCount * 3)
    : undefined

  const useWeightAttribute =
    Array.from(new Set(segments.map(s => s.fontWeight))).length > 1
  const weightsAttrArray = useWeightAttribute
    ? new Float32Array(vertCount)
    : undefined

  let charIdx = 0
  for (const segment of segments) {
    const safeText = segment.text.replace(getCharSafetyRegex(font), '□')
    segment.text = safeText
  }
  const fontMetaCache = getFontCharMetaCache(font)
  for (const segment of segments) {
    const fontWeight = segment.fontWeight || DEFAULT_FONT_WEIGHT
    const italicSkew = segment.italicSkew || DEFAULT_ITALIC_SKEW
    const xOffset = segment.xOffset || 0
    const yOffset = segment.yOffset || 0
    const stripped = segment.text.replace(/\s+/g, '')
    const start = charIdx
    const end = charIdx + stripped.length

    for (let i = start; i < end; i++) {
      const quadIdx = i * 16
      let char = stripped[i - charIdx]
      if (char === '\uD83D' || char === '\uD83C') {
        i++
        char += stripped[i - charIdx]
      }
      const charMeta = fontMetaCache.get(char)!
      // Italics skew - adjust the position geometry attribute directly to save calculations in shader
      const skew = base * italicSkew
      const descender = charMeta.height + charMeta.yoffset - base
      const italicSkewForward = ((base - charMeta.yoffset) / base) * skew
      const italicSkewBack = descender > 0 ? (descender / base) * -skew : 0.0

      // Top verts
      xyuvs[quadIdx + 0] += italicSkewForward
      xyuvs[quadIdx + 12] += italicSkewForward

      //Bottom verts
      xyuvs[quadIdx + 4] += italicSkewBack
      xyuvs[quadIdx + 8] += italicSkewBack

      // Add Offsets
      xyuvs[quadIdx + 0] += xOffset
      xyuvs[quadIdx + 1] += yOffset
      xyuvs[quadIdx + 4] += xOffset
      xyuvs[quadIdx + 5] += yOffset
      xyuvs[quadIdx + 8] += xOffset
      xyuvs[quadIdx + 9] += yOffset
      xyuvs[quadIdx + 12] += xOffset
      xyuvs[quadIdx + 13] += yOffset
    }

    if (colorsAttrArray) {
      const { topLeft, topRight, bottomLeft, bottomRight } = toVertexColors(
        segment.color
      )
      for (let i = start; i < end; i++) {
        const colorIdx = i * 12
        // Color gradient
        colorsAttrArray.set(topLeft, colorIdx + 0)
        colorsAttrArray.set(bottomLeft, colorIdx + 3)
        colorsAttrArray.set(bottomRight, colorIdx + 6)
        colorsAttrArray.set(topRight, colorIdx + 9)
      }
    }

    if (weightsAttrArray) {
      for (let i = start; i < end; i++) {
        const weightIdx = i * 4

        // Weight - need to adjust position to account for additional font width weighting applies.
        weightsAttrArray[weightIdx + 0] = fontWeight
        weightsAttrArray[weightIdx + 1] = fontWeight
        weightsAttrArray[weightIdx + 2] = fontWeight
        weightsAttrArray[weightIdx + 3] = fontWeight
      }
    }

    charIdx = end
  }

  if (colorsAttrArray) {
    geometry.setAttribute('color', new BufferAttribute(colorsAttrArray, 3))
  }
  if (weightsAttrArray) {
    geometry.setAttribute('weight', new BufferAttribute(weightsAttrArray, 1))
  }

  const x = options.bakedOffset ? options.bakedOffset.x : 0
  const y = options.bakedOffset ? options.bakedOffset.y : 0

  const itemSize = 4 //xyuv
  __computeInterlacedBounds(geometry, xyuvs, itemSize)
  const bb = geometry.boundingBox!
  if (options.width) {
    const layoutWidth = geometry.layout.width
    bb.max.x = layoutWidth - bb.min.x
  }
  const bbMin = bb.min
  const bbMax = bb.max

  if (text === '1') {
    for (let i = 0; i < xyuvs.length; i += itemSize) {
      xyuvs[i] -= 2
    }
  }

  //alignment according to glyph layout
  const bbWidth = bbMax.x - bbMin.x
  const lo = geometry.layout
  const charsHeight = (lo._linesTotal - 1) * lo.lineHeight + lo.capHeight
  const xOffset =
    x + bbWidth * fontUtils.getHorizontalBias(options.align) - bbMin.x
  // const yOffset = lo.capHeight
  const yOffset = y + charsHeight * fontUtils.getVerticalBias(options.vAlign)
  for (let i = 0; i < xyuvs.length; i += itemSize) {
    xyuvs[i] += xOffset
    xyuvs[i + 1] += yOffset
  }
  //always do same transforms to bounding box min and max. much cheaper than recalculating bounding box
  bbMax.x += xOffset
  bbMin.x += xOffset
  bbMax.y += yOffset
  bbMin.y += yOffset

  //flip on Y to fix winding order and orientation from TOP-LEFT paradigm (like canvas or photoshop)
  for (let i = 1; i < xyuvs.length; i += itemSize) {
    xyuvs[i] *= -1
  }
  //always do same transforms to bounding box min and max. much cheaper than recalculating bounding box
  bbMin.y *= -1
  bbMax.y *= -1

  let scale = options.size / font.info.size
  if (options.scaleDownToPhysicalSize) {
    scale /= PPM
  }
  //scale down to the correct font point size as it would be printed at 72 ppi
  for (let i = 0; i < xyuvs.length; i += itemSize) {
    xyuvs[i] *= scale
    xyuvs[i + 1] *= scale
  }
  //always do same transforms to bounding box min and max. much cheaper than recalculating bounding box
  bbMin.multiplyScalar(scale)
  bbMax.multiplyScalar(scale)

  if (bbMin.y > bbMax.y) {
    const temp = bbMin.y
    bbMin.y = bbMax.y
    bbMax.y = temp
  }

  const xyuvAttr = new Float32BufferAttribute(xyuvs, 4, false)
  xyuvAttr.name = 'xyuv'
  geometry.setAttribute('xyuv', xyuvAttr)
  geometry.deleteAttribute('position')
  geometry.deleteAttribute('uv')

  return geometry
}
