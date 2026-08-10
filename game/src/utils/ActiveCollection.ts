export class ActiveCollection<T> {
  private _items: T[] = []
  private _previousItems: T[] = []
  constructor(
    private _activate: (item: T) => void,
    private _deactivate: (item: T) => void
  ) {}
  collect(work: (add: (item: T) => void) => void) {
    //swap arrays. Go easy on garbage collector
    const temp = this._previousItems
    this._previousItems = this._items
    this._items = temp

    this._items.length = 0

    work(item => this._items.push(item))

    for (const item of this._items) {
      if (!this._previousItems.includes(item)) {
        this._activate(item)
      }
    }
    for (const item of this._previousItems) {
      if (!this._items.includes(item)) {
        this._deactivate(item)
      }
    }
  }
  get items() {
    return this._items
  }
}
