import device from './device'
import queryParams from './sharedQueryParams'
import renderController from './renderController'
import {
  downsamplePixels,
  useRecommendedTextureResolution
} from './renderSettings'
import { uiScale } from './userSettings'
import { findClosestNumber } from './utils/arrayUtils'
import { clamp } from './utils/math'
import { listenToProperty } from './utils/propertyListeners'
import {
  supportedResolutions,
  textureResolution
} from './utils/renderResolution'
import { throttle2 } from './utils/throttlers'

type SizeListener = (width: number, height: number) => void

const __sizeChangeListeners: Set<SizeListener> = new Set()
function onSizeChange(listener: SizeListener, firstOneForFree = false) {
  __sizeChangeListeners.add(listener)
  if (firstOneForFree) {
    listener(renderMetrics.width, renderMetrics.height)
  }

  return () => __sizeChangeListeners.delete(listener)
}
export const renderMetrics = {
  width: 1920,
  height: 1080,
  uiWidth: 1920,
  uiHeight: 1080,
  devicePixelRatio: window.devicePixelRatio,
  overridePixelRatio: queryParams.forcePixelRatio,
  pixelDownsample: 1,
  finalPixelRatio: 1,
  finalPointScale: 1,
  halfScreenWidthPixels: 1920 / 2,
  pixelWidthInClipSpace: 1,
  pixelHeightInClipSpace: 1,
  aspect: 16 / 9,
  onSizeChange
}

function __notifySizeListeners() {
  for (const cb of __sizeChangeListeners) {
    cb(renderMetrics.width, renderMetrics.height)
  }
  sizeChangeRequested = false
}

let sizeChangeRequested = false
export function requestSizeChange() {
  if (sizeChangeRequested) {
    return
  }
  sizeChangeRequested = true
  setTimeout(__notifySizeListeners, 10)
}

downsamplePixels.listen(dsp => (renderMetrics.pixelDownsample = dsp))

function updateFinalPixelRatio() {
  renderMetrics.finalPixelRatio =
    renderMetrics.overridePixelRatio > 0
      ? renderMetrics.overridePixelRatio
      : renderMetrics.devicePixelRatio / (4 - renderMetrics.pixelDownsample)
}

listenToProperty(renderMetrics, 'devicePixelRatio', updateFinalPixelRatio)
listenToProperty(renderMetrics, 'pixelDownsample', updateFinalPixelRatio)

listenToProperty(renderMetrics, 'finalPixelRatio', fpr => {
  renderMetrics.finalPointScale = fpr / renderMetrics.devicePixelRatio
})

function onWidthOrHeightChange() {
  renderMetrics.devicePixelRatio = window.devicePixelRatio
  requestSizeChange()
}

listenToProperty(renderMetrics, 'width', onWidthOrHeightChange)
listenToProperty(renderMetrics, 'height', onWidthOrHeightChange)

function updateUIWidthPixels() {
  renderMetrics.uiWidth = renderMetrics.width / uiScale.value
}

function updateUIHeightPixels() {
  renderMetrics.uiHeight = renderMetrics.height / uiScale.value
}

listenToProperty(renderMetrics, 'width', updateUIWidthPixels)
listenToProperty(renderMetrics, 'height', updateUIHeightPixels)
uiScale.listen(() => {
  updateUIWidthPixels()
  updateUIHeightPixels()
})

function updateHalfScreenWidthPixels() {
  renderMetrics.halfScreenWidthPixels =
    renderMetrics.finalPixelRatio * renderMetrics.width * 0.5
}
listenToProperty(renderMetrics, 'width', updateHalfScreenWidthPixels)
listenToProperty(renderMetrics, 'finalPixelRatio', updateHalfScreenWidthPixels)
// const isProbablyFullscreen = gameMode !== GameMode.UNKNOWN
const isProbablyFullscreen = true

const attemptResize = () => {
  if (!renderController.active) {
    return
  }
  //   const width = isProbablyFullscreen ? window.innerWidth : canvas.clientWidth
  //   const height = isProbablyFullscreen ? window.innerHeight : canvas.clientHeight
  const width = device.width
  const height = device.height
  renderMetrics.width = width
  renderMetrics.height = height
  renderMetrics.aspect = width / height
}

const throttledAttemptResize = throttle2(attemptResize)

if (isProbablyFullscreen) {
  //probably fullscreen
  device.onChange(throttledAttemptResize, true)
} else {
  //probably embedded widget
  setTimeout(() => {
    setInterval(throttledAttemptResize, 500)
  }, 1000)
}

const idealMaxSize = 1200

export const resolutionScalePercent = {
  value: 100
}

export const resolutionScalePercentSmall = {
  value: 100
}

export const resolutionScalePercentBig = {
  value: 100
}

export const resolutionScalePercentUI = {
  value: 100
}

export const resolutionScalePercentSmallUI = {
  value: 100
}

const smallScale = 0.4
const bigScale = 1.5

function getTextureSize() {
  if (useRecommendedTextureResolution.value) {
    const idealRatio = Math.min(device.width, device.height) / idealMaxSize
    const adjustedRatio = idealRatio * renderMetrics.finalPixelRatio
    return clamp(adjustedRatio, 0, 1) * 100
  } else {
    return supportedResolutions[Math.round(textureResolution.value)]
  }
}

function findClosestRes(res: number) {
  return findClosestNumber(supportedResolutions, res)
}
export function updateTextureResolution() {
  const final = getTextureSize()
  if (useRecommendedTextureResolution.value) {
    textureResolution.value = supportedResolutions.indexOf(
      findClosestRes(final)
    )
  }
  resolutionScalePercent.value = findClosestRes(final)
  resolutionScalePercentBig.value = findClosestRes(final * bigScale)
  resolutionScalePercentSmall.value = findClosestRes(final * smallScale)
  updateUITextureResolution()
}

function updateUITextureResolution() {
  const final = getTextureSize()
  resolutionScalePercentUI.value = findClosestRes(final * uiScale.value)
  resolutionScalePercentSmallUI.value = findClosestRes(
    final * smallScale * uiScale.value
  )
}
device.onChange(updateTextureResolution, true)
downsamplePixels.listen(updateTextureResolution)
useRecommendedTextureResolution.listen(updateTextureResolution)
uiScale.listen(updateTextureResolution)
