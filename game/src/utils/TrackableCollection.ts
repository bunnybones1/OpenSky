import { removeFromArray } from '@opensky/shared/utils/arrayUtils'

import { replaceAll } from './stringUtils'

// const testSets = [
//   'MeshComponent',
//   'CardInstanceComponent',
//   '(MeshComponent ⋂ CardInstanceComponent)',
//   '(CardInstanceComponent ⋂ MeshComponent)'
// ]

// function testCaptureItem(tc:TrackableCollection<Entity<Components>>, item:Entity<Components>) {
//   if(item.id === 14 && testSets.includes(tc.name)) {
//     debugger
//   }
// }

export type ItemCallback<T> = (item: T) => void

const nonNameChars = '() ⋃⋂-'
const specialChar = ';'

function __extractSubNames(name: string) {
  for (let i = 0; i < nonNameChars.length; i++) {
    name = replaceAll(name, nonNameChars[i], specialChar)
  }
  return name.split(specialChar).filter(s => s !== '')
}

const PREVENT_ANY_SUBCOLLECTION_OVERLAPS = false
function __checkSubCollectionOverlap<T>(
  a: ReadonlyTrackableCollection<T>,
  b: ReadonlyTrackableCollection<T>
) {
  if (a === b) {
    throw new Error('Cannot be the same collection')
  }

  if (PREVENT_ANY_SUBCOLLECTION_OVERLAPS) {
    const aNames = __extractSubNames(a.name)
    const bNames = __extractSubNames(b.name)
    for (const aName of aNames) {
      if (bNames.includes(aName)) {
        throw new Error(
          'You cannot have same subcollection in both collections'
        )
      }
    }
  }
}

export type ReadonlyTrackableCollection<T> = Omit<
  TrackableCollection<T>,
  'add' | 'remove'
>

export class TrackableCollection<T> {
  static allCollections: TrackableCollection<any>[] = []
  static queuedDirtyCollections = new Set<TrackableCollection<any>>()
  private static _paused = false
  private static _locked = false
  static lock() {
    this._locked = true
  }
  static unlock() {
    this._locked = false
  }
  static get paused() {
    return this._paused
  }
  static set paused(value) {
    this._paused = value
    if (!value) {
      while (this.queuedDirtyCollections.size > 0) {
        // console.log('nudge wave!!')
        this._paused = true
        const currentQueue = Array.from(this.queuedDirtyCollections)
        this.queuedDirtyCollections.clear()
        for (const c of currentQueue) {
          c.reduceQueues()
        }
        for (const c of currentQueue) {
          c.processQueues()
        }
        this._paused = false
      }
    }
  }
  static nudge() {
    if (this.paused) {
      this.paused = false
      this.paused = true
    }
  }

  constructor(public name: string) {
    if (TrackableCollection._locked) {
      throw new Error(
        `Tried to create collection ${name} at a time later than module import. All collections must be created at the root level of their modules. (i.e. compoundCollections.ts)`
      )
    }
    TrackableCollection.allCollections.push(this)
  }
  private _items: T[] = []
  private _queuedAdds: T[] = []
  private _queuedRemoves: T[] = []
  reduceQueues() {
    for (let i = this._queuedAdds.length - 1; i >= 0; i--) {
      const i2 = this._queuedRemoves.indexOf(this._queuedAdds[i])
      if (i2 !== -1) {
        this._queuedAdds.splice(i, 1)
        this._queuedRemoves.splice(i2, 1)
      }
    }
    if (this._queuedAdds.length > 0) {
      for (let i = this._queuedAdds.length - 1; i >= 0; i--) {
        if (this._queuedAdds.indexOf(this._queuedAdds[i]) !== i) {
          this._queuedAdds.splice(i, 1)
        }
      }
    }
    if (this._queuedRemoves.length > 0) {
      for (let i = this._queuedRemoves.length - 1; i >= 0; i--) {
        if (this._queuedRemoves.indexOf(this._queuedRemoves[i]) !== i) {
          this._queuedRemoves.splice(i, 1)
        }
      }
    }
  }
  processQueues() {
    for (const item of this._queuedRemoves) {
      for (const cb of this._onRemoveCallbacks) {
        cb(item)
      }
    }
    for (const item of this._queuedAdds) {
      for (const cb of this._onAddCallbacks) {
        cb(item)
      }
    }
    if (this._queuedRemoves.length > 0 || this._queuedAdds.length > 0) {
      for (const cb of this._onChangeCallbacks) {
        cb(this._items)
      }
    }
    this._queuedRemoves.length = 0
    this._queuedAdds.length = 0
  }
  get items() {
    return this._items
  }
  get length() {
    return this._items.length
  }
  private _onAddCallbacks: Array<ItemCallback<T>> = []
  listenForAdd(cb: ItemCallback<T>, ignoreThisTime = false) {
    this._onAddCallbacks.push(cb)
    if (!ignoreThisTime) {
      for (const item of this.items) {
        cb(item)
      }
    }
  }
  stopListeningForAdd(cb: ItemCallback<T>) {
    removeFromArray(this._onAddCallbacks, cb)
  }
  private _onRemoveCallbacks: Array<ItemCallback<T>> = []
  private _onChangeCallbacks: Array<ItemCallback<T[]>> = []
  listenForRemove(cb: ItemCallback<T>) {
    this._onRemoveCallbacks.push(cb)
  }
  stopListeningForRemove(cb: ItemCallback<T>) {
    removeFromArray(this._onRemoveCallbacks, cb)
  }
  listenForChange(cb: ItemCallback<T[]>) {
    this._onChangeCallbacks.push(cb)
    cb(this.items)
  }
  stopListeningForChange(cb: ItemCallback<T[]>) {
    removeFromArray(this._onChangeCallbacks, cb)
  }
  add(item: T) {
    // testCaptureItem(this as any, item as any)
    if (this._items.includes(item)) {
      //   // console.warn(
      //   //   'Why is this being added twice? Possible bad logical overlap of TrackableCollections. Possibly bad "synthetics"'
      //   // )
      //   // a synthetic is when you use trackableCollections' set logic to create a complex set,
      //   // but then you add a new component to those members, which acts as a wholey new and independent collection.
      //   // (a "synthetic", because it represents the complex set feeding into it, but technically has no reference to it).
      //   // if you see this warning, it is a sign that you have a synthetic collection that is being combined dangerously with other collections.
      return
    }
    // console.log(`adding ${item} to ${this.name}`)
    this._items.push(item)
    if (TrackableCollection.paused) {
      this._queuedAdds.push(item)
      TrackableCollection.queuedDirtyCollections.add(this)
    } else {
      for (const cb of this._onAddCallbacks) {
        if (this._items.includes(item)) {
          cb(item)
        }
      }
      for (const cb of this._onChangeCallbacks) {
        cb(this._items)
      }
    }
  }
  remove(item: T) {
    // testCaptureItem(this as any, item as any)
    if (!this._items.includes(item)) {
      //   // console.warn(
      //   //   'Why is this being removed twice?'
      //   // )
      return
    }
    // console.log(`removing ${item} from ${this.name}`)
    removeFromArray(this._items, item)
    if (TrackableCollection.paused) {
      this._queuedRemoves.push(item)
      TrackableCollection.queuedDirtyCollections.add(this)
    } else {
      for (const cb of this._onRemoveCallbacks) {
        cb(item)
      }
      for (const cb of this._onChangeCallbacks) {
        cb(this._items)
      }
    }
  }
  union(b: ReadonlyTrackableCollection<T>): ReadonlyTrackableCollection<T> {
    return TrackableCollection.union(this, b as TrackableCollection<T>)
  }
  static union<T>(
    a: ReadonlyTrackableCollection<T>,
    b: ReadonlyTrackableCollection<T>
  ): ReadonlyTrackableCollection<T> {
    __checkSubCollectionOverlap(a, b)
    //   c = a + b
    const c = new TrackableCollection<T>(`(${a.name} ⋃ ${b.name})`)
    function addedToA(item: T) {
      if (!b.items.includes(item)) {
        c.add(item)
      }
    }
    a.listenForAdd(addedToA)
    for (const item of a.items) {
      addedToA(item)
    }
    function addedToB(item: T) {
      if (!a.items.includes(item)) {
        c.add(item)
      }
    }
    for (const item of b.items) {
      addedToB(item)
    }
    b.listenForAdd(addedToB)
    a.listenForRemove(function removedFromA(item) {
      if (!b.items.includes(item)) {
        c.remove(item)
      }
    })
    b.listenForRemove(function removedFromB(item) {
      if (!a.items.includes(item)) {
        c.remove(item)
      }
    })
    return c
  }

  static unionTree<T>(
    ...items: ReadonlyTrackableCollection<T>[]
  ): ReadonlyTrackableCollection<T> {
    if (items.length > 2) {
      const mid = Math.round(items.length * 0.5)
      const a = TrackableCollection.unionTree(
        ...items.slice(0, mid)
      ) as TrackableCollection<T>
      const b = TrackableCollection.unionTree(
        ...items.slice(mid, items.length)
      ) as TrackableCollection<T>
      return a.union(b)
    } else if (items.length === 2) {
      return items[0].union(items[1])
    } else {
      return items[0]
    }
  }

  exclude(b: ReadonlyTrackableCollection<T>): ReadonlyTrackableCollection<T> {
    return TrackableCollection.exclude(this, b as TrackableCollection<T>)
  }
  static exclude<T>(
    base: ReadonlyTrackableCollection<T>,
    excluded: ReadonlyTrackableCollection<T>
  ): ReadonlyTrackableCollection<T> {
    __checkSubCollectionOverlap(base, excluded)
    //   c = a - b
    const c = new TrackableCollection<T>(`(${base.name} - ${excluded.name})`)
    for (const item of base.items) {
      if (!excluded.items.includes(item)) {
        c.items.push(item)
      }
    }
    base.listenForAdd(function addedToBase(item) {
      if (!excluded.items.includes(item)) {
        c.add(item)
      }
    })
    excluded.listenForAdd(function addedToExcluded(item) {
      if (base.items.includes(item)) {
        c.remove(item)
      }
    })
    base.listenForRemove(function removedFromBase(item) {
      if (!excluded.items.includes(item)) {
        c.remove(item)
      }
    })
    excluded.listenForRemove(function removedFromExcluded(item) {
      if (base.items.includes(item)) {
        c.add(item)
      }
    })
    return c
  }

  intersect(b: ReadonlyTrackableCollection<T>): ReadonlyTrackableCollection<T> {
    return TrackableCollection.intersect(this, b as TrackableCollection<T>)
  }
  static intersect<T>(
    a: ReadonlyTrackableCollection<T>,
    b: ReadonlyTrackableCollection<T>
  ): ReadonlyTrackableCollection<T> {
    __checkSubCollectionOverlap(a, b)
    //   c = a && b
    const c = new TrackableCollection<T>(`(${a.name} ⋂ ${b.name})`)
    a.listenForAdd(function addedToA(item) {
      if (b.items.includes(item)) {
        c.add(item)
      }
    })
    b.listenForAdd(function addedToB(item) {
      if (a.items.includes(item)) {
        c.add(item)
      }
    })
    a.listenForRemove(function removedFromA(item) {
      if (b.items.includes(item)) {
        c.remove(item)
      }
    })
    b.listenForRemove(function removedFromB(item) {
      if (a.items.includes(item)) {
        c.remove(item)
      }
    })
    for (const item of a.items) {
      if (b.items.includes(item)) {
        c.items.push(item)
      }
    }
    return c
  }

  map<U extends Exclude<any, undefined>>(
    func: (original: T) => U
  ): ReadonlyTrackableCollection<U> {
    return TrackableCollection.map(this, func)
  }
  static map<T, U extends Exclude<any, undefined>>(
    a: ReadonlyTrackableCollection<T>,
    func: (original: T) => U
  ): ReadonlyTrackableCollection<U> {
    const map = new Map<T, U>()
    const b = new TrackableCollection<U>(
      `(${a.name} → ${func.name || func.toString().slice(0, 16)})`
    )
    a.listenForAdd(function addedToA(item) {
      const mapped = func(item)
      map.set(item, mapped)
      b.add(mapped)
    })
    a.listenForRemove(function removedFromA(item) {
      const mapped = map.get(item)!
      map.delete(item)
      b.remove(mapped)
    })
    return b
  }

  clear() {
    for (const item of [...this._items]) {
      this.remove(item)
    }
  }
}
