export type ChangeCallback<T> = (newVal: T, oldVal: T) => void

class LiveProperty<O, T extends keyof O> {
  private obj: O
  private propName: T
  private value: O[T]
  private listeners: Set<ChangeCallback<O[T]>> = new Set()

  constructor(obj: O, propName: T) {
    // const prop = Object.getOwnPropertyDescriptor(obj, propName)
    // if (prop && (prop['get'] || prop['set'])) {
    //   throw new Error(
    //     `LiveProperty can't be attached to a property with a set/get. ${String(
    //       propName
    //     )} on ${JSON.stringify(obj)}`
    //   )
    // }
    this.propName = propName
    this.attach(obj)
  }

  get listenerCount() {
    return this.listeners.size
  }

  attach(obj: any) {
    if (this.obj) {
      this.release()
    }

    this.obj = obj
    const value = this.obj[this.propName]

    Object.defineProperty(obj, this.propName, {
      configurable: true,
      set: this._setValue,
      get: () => this.value
    })

    this._setValue(value)
  }

  release() {
    Object.defineProperty(this.obj, this.propName, {
      value: this.value,
      writable: true
    })
  }

  hasListener(listener: ChangeCallback<O[T]>) {
    return this.listeners.has(listener)
  }

  addListener(listener: ChangeCallback<O[T]>, firstOneForFree: boolean = true) {
    if (firstOneForFree) {
      listener(this.value, this.value)
    }

    this.listeners.add(listener)
  }

  removeListener(listener: ChangeCallback<O[T]>) {
    this.listeners.delete(listener)
  }

  private _setValue = (value: any) => {
    if (this.value === value) {
      return
    }

    const oldValue = this.value
    this.value = value

    for (const listener of this.listeners) {
      listener(value, oldValue)
    }
  }
}

const propGroupLibrary = new Map<any, Map<string, LiveProperty<any, any>>>()

function getObjectPropGroup(obj: any) {
  if (!propGroupLibrary.has(obj)) {
    propGroupLibrary.set(obj, new Map<string, LiveProperty<any, any>>())
  }
  return propGroupLibrary.get(obj)!
}

function getLiveProperty(obj: any, propName: string) {
  const objectPropGroup = getObjectPropGroup(obj)
  if (!objectPropGroup.has(propName)) {
    objectPropGroup.set(propName, new LiveProperty(obj, propName))
  }
  return objectPropGroup.get(propName)!
}

export function listenToProperty<O, T extends keyof O>(
  obj: O,
  propName: T,
  onChange: ChangeCallback<O[T]>,
  firstOneForFree: boolean = true
) {
  getLiveProperty(obj, propName as string).addListener(
    onChange,
    firstOneForFree
  )
}

export function stopListeningToProperty<O, T extends keyof O>(
  obj: O,
  propName: T,
  onChange: ChangeCallback<O[T]>
) {
  const propGroup = propGroupLibrary.get(obj)
  if (propGroup) {
    const liveProp = propGroup.get(propName as string)
    if (liveProp) {
      liveProp.removeListener(onChange)
      if (liveProp.listenerCount === 0) {
        liveProp.release()
        propGroup.delete(propName as string)
      }
    }
    if (propGroup.size === 0) {
      propGroupLibrary.delete(obj)
    }
  }
}

export function listenToPropertyDynamic<O, T extends keyof O>(
  obj: O,
  propName: T,
  onChange: ChangeCallback<O[T]>,
  firstOneForFree: boolean = true
) {
  getLiveProperty(obj, propName as string).addListener(
    onChange,
    firstOneForFree
  )
}

export function stopListeningToPropertyDynamic<O, T extends keyof O>(
  obj: O,
  propName: T,
  onChange: ChangeCallback<O[T]>
) {
  const propGroup = propGroupLibrary.get(obj)
  if (propGroup) {
    const liveProp = propGroup.get(propName as string)
    if (liveProp) {
      liveProp.removeListener(onChange)
      if (liveProp.listenerCount === 0) {
        liveProp.release()
        propGroup.delete(propName as string)
      }
    }
    if (propGroup.size === 0) {
      propGroupLibrary.delete(obj)
    }
  }
}

export function migrateLiveProperty(
  oldObj: any,
  newObj: any,
  propName: string
) {
  const oldPropGroup = propGroupLibrary.get(oldObj)
  if (oldPropGroup) {
    const liveProp = oldPropGroup.get(propName)
    if (liveProp) {
      liveProp.attach(newObj)
      oldPropGroup.delete(propName)
      const newPropGroup = getObjectPropGroup(newObj)
      newPropGroup.set(propName, liveProp)
      if (oldPropGroup.size === 0) {
        propGroupLibrary.delete(oldObj)
      }
    }
  }
}
