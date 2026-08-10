import { Component } from 'gg'

export default class OrderComponent extends Component<number> {
  // @ts-ignore ts(1611)
  get value() {
    return this._value
  }
  set value(val: number) {
    this._value = val
    if (this.onChange) {
      this.onChange()
    }
  }
  onChange?: () => void
  private _value: number
  constructor(value: number) {
    super(value)
  }
}
