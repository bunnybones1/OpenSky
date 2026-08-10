import { i18n } from '@opensky/language-manager'
import { RESET_USER_SETTINGS_TO_DEFAULTS } from '@opensky/shared/userSettings'
import { distributions } from '@opensky/shared/utils/distributions'
import NiceBooleanParameter from '@opensky/shared/utils/NiceBooleanParameter'
import NiceFloatParameter from '@opensky/shared/utils/NiceFloatParameter'
import { Vector3 } from 'three'

import { reactToToggleWithLocationRefresh } from './userSettings'
import NiceVector3Parameter from './utils/NiceVector3Parameter'

const toggleNewManaVial = new NiceBooleanParameter(
  'toggle-new-mana-vial-2',
  'Use New Mana Vial',
  true,
  'manaVialOptions',
  undefined,
  RESET_USER_SETTINGS_TO_DEFAULTS
)
reactToToggleWithLocationRefresh(toggleNewManaVial)

export const cameraHomePositionBlend = new NiceFloatParameter(
  'camera-home-position-blend',
  'Camera Home',
  0,
  0,
  1,
  distributions.linear,
  v => v.toFixed(2),
  'never',
  RESET_USER_SETTINGS_TO_DEFAULTS,
  0.001,
  undefined,
  false
)

export const toggleTriggerIndicators = new NiceBooleanParameter(
  'trigger-indicators-toggle-v2',
  'Show Triggers',
  true,
  'triggers',
  undefined,
  RESET_USER_SETTINGS_TO_DEFAULTS
)

const raycastCloudCat = 'raycastCloudOptions'

export const cloudScrollSpeed = new NiceFloatParameter(
  'cloud-scroll-speed-v3',
  'Scroll Speed',
  0.0015,
  -0.02,
  0.02,
  distributions.linear,
  v => v.toFixed(4),
  raycastCloudCat,
  true,
  0.0001
)

export const cloudTiltAngle = new NiceFloatParameter(
  'cloud-tilt-angle-v3',
  'Tilt Angle',
  -0.4125,
  -Math.PI,
  Math.PI,
  distributions.linear,
  v => v.toFixed(4),
  raycastCloudCat,
  RESET_USER_SETTINGS_TO_DEFAULTS,
  0.0001
)

export const cloudPlanePosition = new NiceVector3Parameter(
  'cloud-plane-position-v3',
  'Position',
  new Vector3(0, 5.2, -37.8),
  -40.0,
  40.0,
  distributions.linear,
  v => v.toFixed(4),
  raycastCloudCat,
  RESET_USER_SETTINGS_TO_DEFAULTS,
  0.0001
)

export const cloudPlaneScale = new NiceFloatParameter(
  'cloud-plane-scale-v3',
  'Plane Scale',
  53.58,
  0.1,
  80.0,
  distributions.quadratic,
  v => v.toFixed(4),
  raycastCloudCat,
  RESET_USER_SETTINGS_TO_DEFAULTS,
  0.0001
)

export const cloudUVScale = new NiceFloatParameter(
  'cloud-uv-scale-v3',
  'UV Scale',
  6.0,
  0.05,
  6.0,
  distributions.quadratic,
  v => v.toFixed(4),
  raycastCloudCat,
  RESET_USER_SETTINGS_TO_DEFAULTS,
  0.0001
)

export const cloudLayerOffset = new NiceVector3Parameter(
  'cloud-layer-offset-v3',
  'Layer Offset',
  new Vector3(1.689, -0.018, -1.022),
  -8.0,
  8.0,
  distributions.linear,
  v => v.toFixed(4),
  raycastCloudCat,
  RESET_USER_SETTINGS_TO_DEFAULTS,
  0.0001
)

export const cloudBendDirection = new NiceVector3Parameter(
  'cloud-bend-dir-v3',
  'Bend Direction',
  new Vector3(0, 0.351, 0.164),
  -8.0,
  8.0,
  distributions.linear,
  v => v.toFixed(4),
  raycastCloudCat,
  RESET_USER_SETTINGS_TO_DEFAULTS,
  0.0001
)

export const cloudDepthNear = new NiceFloatParameter(
  'cloud-depth-near-v3',
  'Depth Near',
  -1.6465,
  -20.0,
  3.0,
  distributions.linear,
  v => v.toFixed(4),
  raycastCloudCat,
  RESET_USER_SETTINGS_TO_DEFAULTS,
  0.0001
)

export const cloudDepthFar = new NiceFloatParameter(
  'cloud-depth-far-v3',
  'Depth Far',
  3.0,
  -1.0,
  3.0,
  distributions.linear,
  v => v.toFixed(4),
  raycastCloudCat,
  RESET_USER_SETTINGS_TO_DEFAULTS,
  0.0001
)

export const cloudDepthLayers = new NiceFloatParameter(
  'cloud-depth-layers-v3',
  'Depth Layers',
  7,
  2,
  16,
  distributions.linear,
  v => v.toString(),
  raycastCloudCat,
  RESET_USER_SETTINGS_TO_DEFAULTS,
  1
)

export const cloudAltitude = new NiceFloatParameter(
  'cloud-altitude-v3',
  'Altitude',
  -0.2727,
  -1,
  1,
  distributions.linear,
  v => v.toFixed(4),
  raycastCloudCat,
  RESET_USER_SETTINGS_TO_DEFAULTS,
  0.0001
)

export const floatationFrequency = new NiceFloatParameter(
  'floatation-frequency-v3',
  'Floatation Frequency',
  0.75,
  0.5,
  1.5,
  distributions.linear,
  v => v.toFixed(4),
  'graphics',
  RESET_USER_SETTINGS_TO_DEFAULTS,
  0.0001
)

export const floatationMagnitude = new NiceFloatParameter(
  'floatation-magnitude-v2',
  'Floatation Magnitude',
  0.5,
  0.0,
  1.5,
  distributions.linear,
  v => v.toFixed(4),
  'graphics',
  RESET_USER_SETTINGS_TO_DEFAULTS,
  0.0001
)

export const floatationPitchMagnitude = new NiceFloatParameter(
  'floatation-pitch-magnitude-v4',
  'Floatation Pitch Magnitude',
  0.025,
  0,
  0.075,
  distributions.linear,
  v => v.toFixed(4),
  'graphics',
  RESET_USER_SETTINGS_TO_DEFAULTS,
  0.0001
)

export const floatationPitchPhase = new NiceFloatParameter(
  'floatation-pitch-phase-v2',
  'Floatation Pitch Phase',
  0.3,
  0,
  2 * Math.PI,
  distributions.linear,
  v => v.toFixed(4),
  'graphics',
  RESET_USER_SETTINGS_TO_DEFAULTS,
  0.0001
)

export const floatationAltitude = new NiceFloatParameter(
  'floatation-altitude-v2',
  'Floatation Altitude',
  1,
  1,
  6,
  distributions.linear,
  v => v.toFixed(4),
  'graphics',
  RESET_USER_SETTINGS_TO_DEFAULTS,
  0.0001
)

export const floatationAltitudeMotionless = new NiceFloatParameter(
  'floatation-altitude-motionless-v2',
  'Floatation Altitude Motionless',
  4,
  1,
  6,
  distributions.linear,
  v => v.toFixed(4),
  'graphics',
  RESET_USER_SETTINGS_TO_DEFAULTS,
  0.0001
)

export const useParticles = new NiceBooleanParameter(
  'use-particles-v2',
  () => i18n.t('common:options.graphicsOptions.particleEffects'),
  true,
  'userGraphics',
  undefined,
  RESET_USER_SETTINGS_TO_DEFAULTS,
  -100
)

export const useCustomHeroCards = new NiceBooleanParameter(
  'use-custom-hero-cards',
  'Use Custom Hero Cards',
  false,
  'secret',
  undefined,
  RESET_USER_SETTINGS_TO_DEFAULTS,
  -100
)

export const useCardColorOverlays = new NiceBooleanParameter(
  'use-card-color-overlays',
  'Use Card Color Overlays',
  true,
  'secret',
  undefined,
  RESET_USER_SETTINGS_TO_DEFAULTS,
  -100
)

export const useTestGraveyardElementParticles = new NiceBooleanParameter(
  'use-test-graveyard-element-particles',
  'Use Test Graveyard Element Particles',
  false,
  'secret',
  undefined,
  RESET_USER_SETTINGS_TO_DEFAULTS,
  -100
)
reactToToggleWithLocationRefresh(useTestGraveyardElementParticles)
