import { getLocalStorageBoolean, setLocalStorageBoolean } from './localStorage'
import { NiceCategory } from './NiceElement'
import NiceParameter from './NiceParameter'
import { i18n } from '@opensky/language-manager'

export default class NiceBooleanParameter extends NiceParameter<boolean> {
  constructor(
    name: string,
    label: string | (() => string),
    defaultValue: boolean,
    category: NiceCategory,
    valueTextConverter = (on: boolean) =>
      i18n.t(`common:options.${on ? 'en' : 'dis'}abled`),
    forceDefault: boolean = false,
    sliderOrderPriority: number = 0,
    persistViaLocalStorage: boolean = true
  ) {
    super(
      name,
      label,
      defaultValue,
      valueTextConverter,
      category,
      undefined,
      forceDefault,
      sliderOrderPriority,
      persistViaLocalStorage
    )
  }

  protected attemptPersistence() {
    if (this._persistViaLocalStorage) {
      setLocalStorageBoolean('opensky-settings-' + this.name, this._value)
    }
  }

  protected determineInitialValue() {
    this._value =
      this._persistViaLocalStorage && !this._forceDefault
        ? getLocalStorageBoolean(
            'opensky-settings-' + this.name,
            this._defaultValue
          )
        : this._defaultValue
  }
}
