export default class AnimatedValue {
  value = 0
  private _rawValue = 0
  constructor(private valueTransform: (valIn: number) => number) {
    //
  }
  update(dt: number) {
    this._rawValue += dt
    this.value = this.valueTransform(this._rawValue)
  }
}
