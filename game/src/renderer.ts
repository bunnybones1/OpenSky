import { i18n } from '@opensky/language-manager'
import { GameMode } from '@opensky/proto'
import device from '@opensky/shared/device'
import { isDevMode } from '@opensky/shared/devMode'
import { renderMetrics } from '@opensky/shared/renderMetrics'
import { isWebGLAvailable } from '@opensky/shared/utils'
import { listenToProperty } from '@opensky/shared/utils/propertyListeners'
import {
  Camera,
  PCFShadowMap,
  Scene,
  sRGBEncoding,
  WebGLRenderer,
  WebGLRendererParameters
} from 'three'

import { LOW_MEMORY_MODE } from '~/constants'

import { COLOR_BLACK } from './colors/colorLibrary'
import { gameMode } from './helpers/envGameModeHelpers'
import queryParamColors from './queryParamColors'
import queryParams from './queryParams'
import { forceWebGL1, renderShadows, toggleAntialias } from './renderSettings'
import { reactToToggleWithLocationRefresh } from './userSettings'

if (!isWebGLAvailable) {
  throw new Error('No WebGL support')
}

const canvas = document.createElement('canvas')

const contextParams = {
  alpha: !queryParams.disableCanvasAlpha,
  antialias: toggleAntialias.value || queryParams.test?.includes('composite'),
  desynchronized: queryParams.desynchronized,
  depth: true,
  powerPreference: 'default',
  // powerPreference: "high-performance",
  // powerPreference: "low-power",
  premultipliedAlpha: true,
  preserveDrawingBuffer: queryParams.preserveDrawingBuffer,
  stencil: true
}

const rendererParams: WebGLRendererParameters = {
  canvas,
  ...contextParams
}
if (forceWebGL1.value && !queryParams.forceWebGL2) {
  rendererParams.context = canvas.getContext(
    'webgl',
    contextParams
  ) as WebGLRenderingContext
}

const renderer = new WebGLRenderer(rendererParams)
renderer.debug.checkShaderErrors = isDevMode()

canvas.addEventListener(
  'webglcontextlost',
  function () {
    console.error('context lost')
    // throw new Error('webglContext lost')
    // setTimeout(() => renderer.forceContextRestore(), 100)
  },
  false
)

canvas.addEventListener(
  'webglcontextrestored',
  function () {
    // Do something
    console.log('context restored')
  },
  false
)

for (const v of [
  '-moz-crisp-edges',
  '-webkit-crisp-edges',
  'crisp-edges',
  'pixelated'
]) {
  canvas.style.setProperty('image-rendering', v)
}

renderer.info.autoReset = false

renderer.debug.checkShaderErrors = isDevMode()

renderShadows.listen(() => {
  // renderer.shadowMap.enabled = v
})
renderer.shadowMap.enabled = false

renderer.shadowMap.type = PCFShadowMap
// renderer.gammaOutput = true
// renderer.gammaFactor = 2.2
renderer.outputEncoding = sRGBEncoding
renderer.autoClear = false

export const maxTextureSize =
  Math.min(
    device.isMobile ? 2048 : 4096,
    renderer.capabilities.maxTextureSize
  ) * (LOW_MEMORY_MODE ? 0.5 : 1)

export default renderer

export const onNextRenderCallbacks: Array<() => void> = []

export const bgColor = {
  value: (queryParamColors.bgColor || COLOR_BLACK).clone()
}

if (queryParams.bgFlash) {
  let flash = true
  setInterval(() => {
    flash = !flash
    const b = flash ? 1 : 0
    bgColor.value.setRGB(b, b, b)
  }, 500)
}

export function clearRenderer() {
  renderer.setClearColor(bgColor.value, 1)
  renderer.clearColor()
  renderer.clearDepth()
  renderer.clearStencil()
}
export function renderSceneGameAll(scene: Scene, camera: Camera) {
  renderer.render(scene, camera)
  renderer.setClearAlpha(0)
}

if (gameMode === GameMode.TUTORIAL) {
  toggleAntialias.valueStringSuffix = () =>
    i18n.t('common:options.suffix.willApplyNextGame')
} else {
  reactToToggleWithLocationRefresh(toggleAntialias)
}

listenToProperty(renderMetrics, 'finalPixelRatio', fpr => {
  renderer.setPixelRatio(fpr)
})
renderMetrics.onSizeChange((width, height) => {
  renderer.setSize(width, height, false)
})
