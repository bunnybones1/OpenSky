import { lerp } from '@opensky/shared/utils/math'
import { Component, Entity } from 'gg'
import { Color } from 'three'

import {
  getExtraMagicSoundLayer,
  getMagicGlowBaseSoundLayer
} from '~/audio/soundLayersLibrary'
import { hues } from '~/colors/colorHues'
import { COLOR_PLAYABLE_GREEN } from '~/colors/colorLibrary'
import { addColor, makeHSL, screenColor } from '~/colors/utils'
import { Easing } from '~/systems/animation/Easing'
import { AnimatedBool } from '~/utils/AnimatedBool'
import { TrackableCollection } from '~/utils/TrackableCollection'

import { Components } from '.'

const __colorPlayable = COLOR_PLAYABLE_GREEN
const __colorTargetable = makeHSL(hues._04_warmYellow, 0.8, 0.4)
const __colorHovered = makeHSL(hues._04_warmYellow, 0.8, 0.06)
const __colorSelected = makeHSL(hues._07_warmGreen)
const __colorHolding = makeHSL(hues._12_coolCyan, 0.8, 0.5)
const __colorDragging = makeHSL(hues._04_warmYellow, 0.8, 0.45)
const __colorCasting = makeHSL(hues._05_yellow, 0.8, 0.45)
const __colorBookMark = makeHSL(hues._12_coolCyan, 0.25, 0.8)
const __colorSuggestion = makeHSL(250 / 360, 0.77, 0.4)
const __colorBlack = new Color(0, 0, 0)
const __colorDamagePrediction = makeHSL(
  lerp(hues._02_red, hues._03_warmRed, 0.3),
  0.9,
  0.5
)
const __colorHealingPrediction = makeHSL(hues._10_warmCyan, 0.8, 0.4)

class InteractiveIndicator {
  private _hummingDamagePrediction = false
  private _lastHummingDamagePrediction = 0
  private _lastHummingDamagePredictionSoundUsed = false
  readonly color: Color = new Color(0, 0, 0)
  readonly color2: Color = new Color(0, 0, 0)
  readonly playableState = new AnimatedBool(
    () => (this.dirty = true),
    false,
    200
  )
  readonly targetlessState = new AnimatedBool(
    () => (this.dirty = true),
    false,
    200
  )
  readonly targetableState = new AnimatedBool(
    () => (this.dirty = true),
    false,
    200
  )
  readonly holdingState = new AnimatedBool(
    () => (this.dirty = true),
    false,
    200
  )
  readonly draggingState = new AnimatedBool(
    () => (this.dirty = true),
    false,
    100,
    undefined,
    300
  )
  readonly hoveringState = new AnimatedBool(
    () => (this.dirty = true),
    false,
    150,
    undefined,
    300
  )
  readonly selectedState = new AnimatedBool(
    () => (this.dirty = true),
    false,
    200,
    Easing.Exponential.Out
  )
  readonly bookmarkState = new AnimatedBool(
    () => (this.dirty = true),
    false,
    300,
    Easing.Cubic.Out
  )
  readonly suggestionState = new AnimatedBool(
    () => (this.dirty = true),
    false,
    300,
    Easing.Cubic.InOut
  )
  readonly castingState = new AnimatedBool(
    () => (this.dirty = true),
    false,
    400,
    undefined,
    800
  )
  readonly damagePredictionState = new AnimatedBool(
    () => (this.dirty = true),
    false,
    400,
    Easing.Quartic.Out
  )
  readonly healingPredictionState = new AnimatedBool(
    () => (this.dirty = true),
    false,
    400,
    Easing.Quartic.Out
  )

  dirty = true
  private _updateBaseMagicSound: (amt: number) => void
  private _updateExtraMagicSound: (amt: number) => void

  constructor(
    private _colorPlayable: Color = __colorPlayable,
    private _colorTargetable: Color = __colorTargetable,
    private _colorHovered: Color = __colorHovered,
    private _colorSelected: Color = __colorSelected,
    private _colorHolding: Color = __colorHolding,
    private _colorDragging: Color = __colorDragging,
    private _colorBookmark: Color = __colorBookMark,
    private _colorSuggestion: Color = __colorSuggestion,
    private _colorNormal: Color = __colorBlack,
    private _colorCasting: Color = __colorCasting,
    private _colorDamagePrediction: Color = __colorDamagePrediction,
    private _colorHealingPrediction: Color = __colorHealingPrediction,
    readonly useOpacity = false
  ) {
    this._updateBaseMagicSound = getMagicGlowBaseSoundLayer().getController()
    this._updateExtraMagicSound = getExtraMagicSoundLayer().getController()
  }

  update() {
    if (this.dirty) {
      this._updateBaseMagicSound(
        Math.max(
          this.draggingState.animatedValue,
          this.targetableState.animatedValue
        )
      )
      this._updateExtraMagicSound(
        Math.min(
          this.targetableState.animatedValue,
          this.hoveringState.animatedValue
        )
      )

      this.dirty = false
      const color = this.color
      color.setRGB(0, 0, 0)

      if (this.targetableState.animatedValue !== 0) {
        addColor(
          color,
          this._colorTargetable,
          this.targetableState.animatedValue
        )
      }

      if (this.hoveringState.animatedValue !== 0) {
        addColor(color, this._colorHovered, this.hoveringState.animatedValue)
      }
      if (this.draggingState.animatedValue !== 0) {
        addColor(
          color,
          this._colorDragging,
          this.hoveringState.animatedValue +
            this.draggingState.animatedValue *
              (1 - this.targetlessState.animatedValue)
        )
      }

      if (this.playableState.animatedValue !== 0) {
        addColor(color, this._colorPlayable, this.playableState.animatedValue)
      }
      if (this.selectedState.animatedValue !== 0) {
        addColor(color, this._colorSelected, this.selectedState.animatedValue)
      }
      if (this.bookmarkState.animatedValue !== 0) {
        addColor(color, this._colorBookmark, this.bookmarkState.animatedValue)
      }
      if (this.suggestionState.animatedValue !== 0) {
        addColor(
          color,
          this._colorSuggestion,
          this.suggestionState.animatedValue
        )
      }
      if (this.castingState.animatedValue !== 0) {
        addColor(color, this._colorCasting, this.castingState.animatedValue)
      }
      if (this.holdingState.animatedValue !== 0) {
        color.lerp(this._colorHolding, this.holdingState.animatedValue)
      }

      this.color2.copy(color)
      if (this.damagePredictionState.animatedValue !== 0) {
        color.lerp(
          this._colorDamagePrediction,
          this.damagePredictionState.animatedValue
        )
      }
      if (this.healingPredictionState.animatedValue !== 0) {
        color.lerp(
          this._colorHealingPrediction,
          this.healingPredictionState.animatedValue
        )
      }

      screenColor(color, this._colorNormal)
      return true
    }
    return false
  }
}

export function attemptToModifyIndicator(
  entity: Entity<Components>,
  action: (i: InteractiveIndicator) => void
) {
  if (entity.has('interactiveIndicators')) {
    action(entity.get('interactiveIndicators'))
  }
}

export default class InteractiveIndicatorsComponent extends Component<InteractiveIndicator> {
  constructor(
    colorPlayable?: Color,
    colorTargetable?: Color,
    colorHovered?: Color,
    colorSelected?: Color,
    colorHolding?: Color,
    colorDragging?: Color,
    colorBookmark?: Color,
    colorSuggestion?: Color,
    colorNormal?: Color,
    colorCasting?: Color,
    colorDamagePrediction?: Color,
    colorHealingPrediction?: Color,
    useOpacity = true
  ) {
    super(
      new InteractiveIndicator(
        colorPlayable,
        colorTargetable,
        colorHovered,
        colorSelected,
        colorHolding,
        colorDragging,
        colorBookmark,
        colorNormal,
        colorSuggestion,
        colorCasting,
        colorDamagePrediction,
        colorHealingPrediction,
        useOpacity
      )
    )
  }
  static entities = new TrackableCollection<Entity<Components>>(
    'InteractiveIndicatorsComponent'
  )
  onAttach(entity: Entity<Components>) {
    InteractiveIndicatorsComponent.entities.add(entity)
  }
  onDetach(entity: Entity<Components>) {
    InteractiveIndicatorsComponent.entities.remove(entity)
  }
}
