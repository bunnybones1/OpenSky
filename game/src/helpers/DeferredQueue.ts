export class DeferredQueue<T> {
  items: T[] = []
  private _action: (item: T) => void
  setAction(action: (item: T) => void) {
    this._action = action
    for (const item of this.items) {
      action(item)
    }
    this.items.length = 0
  }
  add(item: T) {
    if (this._action) {
      this._action(item)
    } else {
      this.items.push(item)
    }
  }
}
