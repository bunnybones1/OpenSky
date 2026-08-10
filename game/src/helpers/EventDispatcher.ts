type Listener<T> = (val: T) => void

export class EventDispatcher<T> {
  protected _listeners: Array<Listener<T>> = []
  protected _listenerOneTimeUse: boolean[] = []

  addListener(listener: Listener<T>, oneTimeUse: boolean = false) {
    this._listeners.push(listener)
    this._listenerOneTimeUse.push(oneTimeUse)
  }
  removeListener(listener: Listener<T>) {
    const index = this._listeners.indexOf(listener)
    if (index !== -1) {
      this._listeners.splice(index, 1)
      this._listenerOneTimeUse.splice(index, 1)
    }
  }
  dispatch(val: T) {
    for (let i = this._listeners.length - 1; i >= 0; i--) {
      this._listeners[i](val)
      if (this._listenerOneTimeUse[i]) {
        this.removeListener(this._listeners[i])
      }
    }
  }
}
