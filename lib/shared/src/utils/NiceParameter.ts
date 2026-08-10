import { removeFromArray } from './arrayUtils'
import NiceElement, { NiceCategory } from './NiceElement'
export default class NiceParameter<T> extends NiceElement {
  set value(val: T) {
    this.setValue(val, this._persistViaLocalStorage)
  }

  get value() {
    return this._value
  }

  setValueWithoutPersistence(val: T) {
    this.setValue(val, false)
  }

  valueStringSuffix: string | (() => string) = ''

  get valueString() {
    const suffix = this.valueStringSuffix
    return (
      this._valueTextConverter(this._value) +
      (typeof suffix === 'string' ? suffix : suffix())
    )
  }

  protected _value: T
  protected _listeners: Array<(value: T) => void> = []
  set customValueCleaner(cleaner: (val: T) => T) {
    this._valueCleaner = cleaner
  }
  set customValueTextConverter(textConverter: (val: T) => string) {
    this._valueTextConverter = textConverter
  }
  constructor(
    name: string,
    label: string | (() => string),
    protected _defaultValue: T,
    private _valueTextConverter: (value: T) => string,
    category: NiceCategory,
    protected _valueCleaner: (val: T) => T = v => v,
    protected _forceDefault: boolean = false,
    orderPriority: number = 0,
    protected _persistViaLocalStorage: boolean = true
  ) {
    super(name, label, category, orderPriority)
    this.determineInitialValue()
  }

  listen(callback: (value: T) => void, firstOneForFree = true) {
    this._listeners.push(callback)
    if (firstOneForFree) {
      callback(this.value)
    }
  }

  stopListening(callback: (value: T) => void) {
    removeFromArray(this._listeners, callback)
  }

  protected determineInitialValue() {
    throw new Error('Override this')
  }

  protected attemptPersistence() {
    throw new Error('Override this')
  }

  private setValue(val: T, attemptPersistence: boolean) {
    if (val === this._value) {
      return
    }
    val = this._valueCleaner(val)
    if (val === this._value) {
      return
    }
    this._value = val
    if (attemptPersistence) {
      this.attemptPersistence()
    }
    this._listeners.forEach(cb => cb(val))
  }
}
