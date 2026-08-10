import { Vector2, Vector4 } from 'three'

import {
  COLOR_ARROW_YELLOW,
  COLOR_FOG_PURPLE,
  COLOR_HIGHLIGHT_GREEN
} from '~/colors/colorLibrary'
import { makeHSL } from '~/colors/utils'
import { MagicFireHighlightMeshMaterialOptions } from '~/materials/MagicFireHighlightMeshMaterial'

import { ValidDropTarget } from './dropTargetTypes'

const __basicHighlightSettings: Partial<MagicFireHighlightMeshMaterialOptions> =
  {
    map: 'fireEffectSourceMap',
    uvScaleV: 1,
    thicknessBase: 1,
    perpectiveCompensation: 0.7
  }
const __deckHighlightSettings: Partial<MagicFireHighlightMeshMaterialOptions> =
  {
    ...__basicHighlightSettings,
    opacityRamp: new Vector2(0.6, -0.8),
    perpectiveCompensation: 0.7
  }
const __cardHighlightSettings: Partial<MagicFireHighlightMeshMaterialOptions> =
  {
    ...__basicHighlightSettings,
    opacityRamp: new Vector2(3, -1),
    thicknessBase: 0.8,
    coreHotness: 0.8
    //   colorStrength: new Vector4(0.8, 0.8, 0.8, 1)
  }
const __cardThickerHighlightSettings: Partial<MagicFireHighlightMeshMaterialOptions> =
  {
    ...__cardHighlightSettings,
    thicknessBase: 1.1
  }
const subtleMagicColorStrength = new Vector4(0.3, 0.3, 0.3, 0.15)
const __groundMistHighlightSettings: Partial<MagicFireHighlightMeshMaterialOptions> =
  {
    ...__basicHighlightSettings,
    opacityRamp: new Vector2(1.3, -0.6),
    colorStrength: subtleMagicColorStrength,
    coreHotness: 1
  }
const __beamsHighlightSettings: Partial<MagicFireHighlightMeshMaterialOptions> =
  {
    ...__basicHighlightSettings,
    opacityRamp: new Vector2(1.3, -0.8),
    uvScaleV: 0.25,
    thicknessBase: 1.3,
    colorStrength: subtleMagicColorStrength,
    coreHotness: 1
  }

const __ropeScrollTiling = new Vector2(10, 73).multiplyScalar(0.5)
const __ropebeamsHighlightSettings: Partial<MagicFireHighlightMeshMaterialOptions> =
  {
    ...__beamsHighlightSettings,
    perpectiveCompensation: 1,
    thicknessBase: 1
  }
const __ropegroundMistHighlightSettings: Partial<MagicFireHighlightMeshMaterialOptions> =
  {
    ...__groundMistHighlightSettings,
    scrollTiling: __ropeScrollTiling,
    perpectiveCompensation: 1,
    opacityRamp: new Vector2(1.8, -0.8),
    uvScaleV: 0.5
  }
const __arrowHighlightSettings: Partial<MagicFireHighlightMeshMaterialOptions> =
  {
    ...__basicHighlightSettings,
    opacityRamp: new Vector2(3.0, -0.5),
    uvScaleV: 2,
    scrollTiling: new Vector2(5, -13),
    thicknessBase: 1,
    useLengthRatio: true,
    color: COLOR_ARROW_YELLOW.clone(),
    color2: COLOR_ARROW_YELLOW.clone(),
    perpectiveCompensation: 0.7
  }
const __fogHighlightSettings: Partial<MagicFireHighlightMeshMaterialOptions> = {
  ...__basicHighlightSettings,
  map: 'fogEffectSourceMap',
  use2dMode: true,
  opacityRamp: new Vector2(2.0, -0.5),
  uvScaleV: 2.5,
  scrollTiling: new Vector2(5, -13),
  thicknessBase: 28,
  thicknessRatio: 1,
  color: COLOR_FOG_PURPLE.clone(),
  perpectiveCompensation: 1,
  coreHotness: 0.4
}
const __fog2HighlightSettings: Partial<MagicFireHighlightMeshMaterialOptions> =
  {
    ...__fogHighlightSettings,
    uvScaleV: 0.8,
    thicknessBase: 15,
    opacityRamp: new Vector2(2.0, -1.0),
    scrollTiling: new Vector2(5, 7),
    color: COLOR_FOG_PURPLE.clone(),
    coreHotness: 0.6
  }
const __nebulaHighlightSettings: Partial<MagicFireHighlightMeshMaterialOptions> =
  {
    ...__fog2HighlightSettings,
    uvScaleV: 1.3,
    thicknessBase: 15,
    opacityRamp: new Vector2(2.0, -1.0),
    scrollTiling: new Vector2(5, 7),
    color: makeHSL(0.65, 0.7, 0.1),
    coreHotness: 0.6
  }

const __buttonBasicHighlightSettings: Partial<MagicFireHighlightMeshMaterialOptions> =
  {
    opacityRamp: new Vector2(2, -1),
    color: COLOR_HIGHLIGHT_GREEN,
    uvScaleV: 0.5,
    opacity: 0,
    use2dMode: true,
    thicknessBase: 1,
    perpectiveCompensation: 0.7
  }

const __buttonReplayHighlightSettings: Partial<MagicFireHighlightMeshMaterialOptions> =
  {
    ...__buttonBasicHighlightSettings,
    opacityRamp: new Vector2(1, -0.5),
    thicknessBase: 0.3
  }

const __dashHighlightSettings: Partial<MagicFireHighlightMeshMaterialOptions> =
  {
    ...__ropegroundMistHighlightSettings,
    color: makeHSL(0.32, 0.7, 0.4)
  }

const __highlightOverrides = {
  'player-graveyard': __deckHighlightSettings,
  'opponent-graveyard': __deckHighlightSettings,
  'player-deck': __deckHighlightSettings,
  'opponent-deck': __deckHighlightSettings,
  'player-casting': __deckHighlightSettings,
  'opponent-casting': __deckHighlightSettings,
  'player-staging': __deckHighlightSettings,
  'opponent-staging': __deckHighlightSettings,
  'player-conjuring': __deckHighlightSettings,
  'opponent-conjuring': __deckHighlightSettings,
  'player-hand': __deckHighlightSettings,
  'opponent-hand': __deckHighlightSettings,
  'player-field': __deckHighlightSettings,
  'opponent-field': __deckHighlightSettings,
  'player-optimistichand': __deckHighlightSettings,
  'opponent-optimistichand': __deckHighlightSettings,
  'island-dust': __deckHighlightSettings,
  card: __cardHighlightSettings,
  enchantment: __cardThickerHighlightSettings,
  'hero-ability': __cardHighlightSettings,
  'hero-mini-ability': __cardThickerHighlightSettings,
  guard: __cardHighlightSettings,
  hero: __cardHighlightSettings,
  heroCard: __cardHighlightSettings,
  spell: __cardThickerHighlightSettings,
  unit: __cardHighlightSettings,
  field: __groundMistHighlightSettings,
  'field-beams': __beamsHighlightSettings,
  'field-rope': __ropegroundMistHighlightSettings,
  'field-rope-beams': __ropebeamsHighlightSettings,
  'intent-arrow': __arrowHighlightSettings,
  dash: __dashHighlightSettings,
  fog: __fogHighlightSettings,
  fog2: __fog2HighlightSettings,
  nebula: __nebulaHighlightSettings,
  buttonBasic: __buttonBasicHighlightSettings,
  buttonReplay: __buttonReplayHighlightSettings
}

const __highlightOverridesSafetyCheck: {
  [K: string]: Partial<MagicFireHighlightMeshMaterialOptions>
} = __highlightOverrides
__highlightOverridesSafetyCheck

const __highlightOverridesSafetyCheck2: {
  [K in ValidDropTarget]: Partial<MagicFireHighlightMeshMaterialOptions>
} = __highlightOverrides
__highlightOverridesSafetyCheck2

export function getFireHighlightOptionOverrides(
  baseName: keyof typeof __highlightOverrides
) {
  return __highlightOverrides[baseName]
}

export function getFireHighlightOptionOverridesUnsafe(baseName: string) {
  if (baseName in __highlightOverrides) {
    return __highlightOverrides[baseName as keyof typeof __highlightOverrides]
  } else {
    // console.error(
    //   `No settings named ${baseName} in fireHightlightMaterialFactory`
    // )
    return undefined
  }
}
