import { clamp } from '@opensky/shared/utils/math'

export default class Matrix1Plus {
  constructor(
    private _scale = 1,
    private _offset = 0,
    private _floor = -Infinity,
    private _ceil = Infinity
  ) {
    //
  }
  getValue(parent: number) {
    return clamp(parent * this._scale + this._offset, this._floor, this._ceil)
  }
}
