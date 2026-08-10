import { renderMetrics } from '@opensky/shared/renderMetrics'
import { listenToProperty } from '@opensky/shared/utils/propertyListeners'
import { Uniform, Vector2 } from 'three'

export const aspectRatioUniform = new Uniform(1.0)

export const renderMetricsUniforms = {
  finalPixelRatio: new Uniform(1),
  pixelAspectRatio: new Uniform(1),
  finalPointScale: new Uniform(1),
  finalUiPointScale: new Uniform(1),
  halfScreenWidthPixels: new Uniform(1920 / 2),
  metreSizeInClipSpace: new Uniform(new Vector2(2 / 1920, 2 / 1080)),
  uiMetreSizeInClipSpace: new Uniform(new Vector2(2 / 1920, 2 / 1080)),
  uiPixelSizeInClipSpace: new Uniform(new Vector2(2 / 1920, 2 / 1080))
}

listenToProperty(renderMetrics, 'finalPixelRatio', fpr => {
  renderMetricsUniforms.finalPixelRatio.value = fpr
})

listenToProperty(renderMetrics, 'finalPointScale', fps => {
  renderMetricsUniforms.finalPointScale.value = fps
})

function updateUIWidthPixels() {
  renderMetricsUniforms.uiMetreSizeInClipSpace.value.x =
    2 / renderMetrics.uiWidth
}

function updateUIHeightPixels() {
  renderMetricsUniforms.uiMetreSizeInClipSpace.value.y =
    2 / renderMetrics.uiHeight
}

listenToProperty(renderMetrics, 'width', updateUIWidthPixels)
listenToProperty(renderMetrics, 'height', updateUIHeightPixels)

function updateUIPixelWidthInClipSpace() {
  renderMetricsUniforms.uiPixelSizeInClipSpace.value.x =
    2 / renderMetrics.uiWidth
}
listenToProperty(renderMetrics, 'uiWidth', updateUIPixelWidthInClipSpace)
listenToProperty(
  renderMetrics,
  'devicePixelRatio',
  updateUIPixelWidthInClipSpace
)

function updateUIPixelHeightInClipSpace() {
  renderMetricsUniforms.uiPixelSizeInClipSpace.value.y =
    2 / renderMetrics.uiHeight
}
listenToProperty(renderMetrics, 'uiHeight', updateUIPixelHeightInClipSpace)
listenToProperty(
  renderMetrics,
  'devicePixelRatio',
  updateUIPixelHeightInClipSpace
)

listenToProperty(
  renderMetrics,
  'halfScreenWidthPixels',
  hsp => (renderMetricsUniforms.halfScreenWidthPixels.value = hsp)
)

function updateFinalUiPointScale() {
  renderMetricsUniforms.finalUiPointScale.value =
    (renderMetrics.finalPointScale * 1080) / renderMetrics.uiHeight
}
listenToProperty(renderMetrics, 'finalPointScale', updateFinalUiPointScale)
listenToProperty(renderMetrics, 'uiHeight', updateFinalUiPointScale)

listenToProperty(renderMetrics, 'aspect', aspect => {
  renderMetricsUniforms.pixelAspectRatio.value = aspect
  renderMetricsUniforms.metreSizeInClipSpace.value.x = 2 / (1080 * aspect)
  aspectRatioUniform.value = aspect
})
