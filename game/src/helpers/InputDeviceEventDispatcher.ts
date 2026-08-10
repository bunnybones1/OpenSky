type InputDeviceListener<Params extends any[]> = (...args: Params) => void

export class InputDeviceEventDispatcher<
  P extends any[] = [x: number, y: number]
> {
  protected _listeners: InputDeviceListener<P>[] = []
  protected _listenerOneTimeUse: boolean[] = []

  addListener(listener: InputDeviceListener<P>, oneTimeUse: boolean = false) {
    this._listeners.push(listener)
    this._listenerOneTimeUse.push(oneTimeUse)
  }
  removeListener(listener: InputDeviceListener<P>) {
    const index = this._listeners.indexOf(listener)
    if (index !== -1) {
      this._listeners.splice(index, 1)
      this._listenerOneTimeUse.splice(index, 1)
    }
  }
  dispatch(...args: P) {
    for (let i = this._listeners.length - 1; i >= 0; i--) {
      this._listeners[i](...args)
      if (this._listenerOneTimeUse[i]) {
        this.removeListener(this._listeners[i])
      }
    }
  }
}
