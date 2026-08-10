import { findClosestNumberIndex } from './arrayUtils'
import { getLocalStorageFloat, setLocalStorageFloat } from './localStorage'
import { makeSteppedClampCleaner } from './math'
import { NiceCategory } from './NiceElement'
import NiceParameter from './NiceParameter'

const SAMPLES = 400

const __distributionCacheCache: Map<
  (v: number) => number,
  Map<number, Float32Array>
> = new Map()

function __getdistributionCache(
  distribution: (v: number) => number,
  samples: number
) {
  if (!__distributionCacheCache.has(distribution)) {
    __distributionCacheCache.set(distribution, new Map())
  }
  const subCaches = __distributionCacheCache.get(distribution)!
  if (!subCaches.has(samples)) {
    const distCache = new Float32Array(samples)
    for (let index = 0; index < samples; index++) {
      distCache[index] = distribution(index / (samples - 1))
    }
    subCaches.set(samples, distCache)
  }
  return subCaches.get(samples)!
}

export default class NiceFloatParameter extends NiceParameter<number> {
  private _distributionCache: Float32Array
  private _increments: number
  get increments(): number {
    return this._increments
  }
  set increments(value: number) {
    this._increments = value
  }
  set max(val: number) {
    this._maxValue = val
    this._valueCleaner = makeSteppedClampCleaner(
      this._step,
      this._minValue,
      this._maxValue
    )
  }
  set min(val: number) {
    this._minValue = val
    this._valueCleaner = makeSteppedClampCleaner(
      this._step,
      this._minValue,
      this._maxValue
    )
  }
  constructor(
    name: string,
    label: string | (()=>string),
    defaultValue: number,
    private _minValue: number,
    private _maxValue: number,
    _distribution: (value: number) => number,
    valueTextConverter: (value: number) => string,
    category: NiceCategory,
    forceDefault: boolean = false,
    private _step: number = 0.01,
    sliderOrderPriority: number = 0,
    persistViaLocalStorage: boolean = true,
    samples = SAMPLES,
    increments = 0.05
  ) {
    super(
      name,
      label,
      defaultValue,
      valueTextConverter,
      category,
      makeSteppedClampCleaner(_step, _minValue, _maxValue),
      forceDefault,
      sliderOrderPriority,
      persistViaLocalStorage
    )

    this._distributionCache = __getdistributionCache(_distribution, samples)
    this.increments = increments
  }

  protected attemptPersistence() {
    if (this._persistViaLocalStorage) {
      setLocalStorageFloat('opensky-settings-' + this.name, this._value)
    }
  }

  protected determineInitialValue() {
    this.value =
      this._persistViaLocalStorage && !this._forceDefault
        ? getLocalStorageFloat(
            'opensky-settings-' + this.name,
            this._defaultValue
          )
        : this._defaultValue
  }

  get normalizedValue() {
    return (this._value - this._minValue) / (this._maxValue - this._minValue)
  }

  set normalizedValue(value: number) {
    this.value = value * (this._maxValue - this._minValue) + this._minValue
  }

  get distributedNormalizedValue() {
    return (
      findClosestNumberIndex(this._distributionCache, this.normalizedValue) /
      (this._distributionCache.length - 1)
    )
  }

  set distributedNormalizedValue(value: number) {
    //lerp this in the future for better inbetween values
    this.normalizedValue =
      this._distributionCache[
        Math.round(value * (this._distributionCache.length - 1))
      ]
  }
}
