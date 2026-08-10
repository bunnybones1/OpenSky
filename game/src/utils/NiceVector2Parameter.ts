import { removeFromArray } from '@opensky/shared/utils/arrayUtils'
import { NiceCategory } from '@opensky/shared/utils/NiceElement'
import NiceParameter from '@opensky/shared/utils/NiceParameter'
import { Vector2 } from 'three'

import { niceVec2ToFloatString } from '~/colors/utils'

import {
  getLocalStorageVector2,
  setLocalStorageVector2
} from './localStorageThree'

export default class NiceVector2Parameter extends NiceParameter<Vector2> {
  set value(val: Vector2) {
    if (this._value === undefined) {
      this._value = new Vector2()
    } else if (val.equals(this._value)) {
      return
    }
    this._value.copy(this._valueCleaner(val))
    this.attemptPersistence()
    this._listeners.forEach(cb => cb(val))
  }

  get value() {
    return this._value
  }

  protected _listeners: Array<(value: Vector2) => void> = []
  constructor(
    name: string,
    label: string,
    defaultValue: Vector2,
    category: NiceCategory,
    forceDefault: boolean = false,
    sliderOrderPriority: number = 0,
    persistViaLocalStorage: boolean = true,
    valueCleaner?: (v2: Vector2) => Vector2
  ) {
    super(
      name,
      label,
      defaultValue,
      niceVec2ToFloatString,
      category,
      valueCleaner || (v => v),
      forceDefault,
      sliderOrderPriority,
      persistViaLocalStorage
    )
  }

  listen(callback: (value: Vector2) => void) {
    this._listeners.push(callback)
    callback(this.value)
  }

  stopListening(callback: (value: Vector2) => void) {
    removeFromArray(this._listeners, callback)
  }
  protected attemptPersistence() {
    if (this._persistViaLocalStorage) {
      setLocalStorageVector2('opensky-settings-' + this.name, this._value)
    }
  }

  protected determineInitialValue() {
    this.value =
      this._persistViaLocalStorage && !this._forceDefault
        ? getLocalStorageVector2(
            'opensky-settings-' + this.name,
            this._defaultValue
          )
        : this._defaultValue
  }
}
