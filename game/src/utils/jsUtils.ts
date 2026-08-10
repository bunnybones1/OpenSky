export function boobyTrap<O, T extends keyof O>(
  obj: O,
  propName: T,
  optionalSetCondition?: (value: O[T]) => boolean,
  onGet = false
) {
  let _prop: O[T] = obj[propName]
  Object.defineProperty(obj, propName, {
    get: () => {
      if (onGet) {
        debugger // eslint-disable-line
      }
      return _prop
    },
    set: (value: O[T]) => {
      if (optionalSetCondition) {
        if (optionalSetCondition(value)) {
          debugger // eslint-disable-line
        }
      } else {
        debugger // eslint-disable-line
      }
      _prop = value
    }
  })
}

export function fatalBoobyTrap<O, T extends keyof O>(
  obj: O,
  propName: T,
  error: string
) {
  const _prop: O[T] = obj[propName]
  Object.defineProperty(obj, propName, {
    get: () => {
      return _prop
    },
    set: () => {
      throw new Error(error)
    }
  })
}

export const decorateMethodBefore = (
  obj: any,
  methodName: string,
  newMethod: () => void
) => {
  const oldMethod = obj[methodName] as () => void
  obj[methodName] = function decoratedMethodBefore(...args: any[]) {
    newMethod.apply(this, args)
    const result = oldMethod.apply(this, args)
    return result
  }
  return () => {
    obj[methodName] = oldMethod
  }
}

export const decorateMethodAfter = (
  obj: any,
  methodName: string,
  newMethod: () => void
) => {
  const oldMethod = obj[methodName] as () => void
  obj[methodName] = function decoratedMethodAfter(...args: any[]) {
    const result = oldMethod.apply(this, args)
    newMethod.apply(this, args)
    return result
  }
  return () => {
    obj[methodName] = oldMethod
  }
}

export function NOOP() {
  // do nothing!
}

export function notEmpty<TValue>(
  value: TValue | null | undefined
): value is TValue {
  return value !== null && value !== undefined
}

export function copyDefaults(onto: any, from: any) {
  for (const key of Object.keys(from)) {
    if (!onto.hasOwnProperty(key)) {
      onto[key] = from[key]
    }
  }
}

export function assignProps(onto: any, from: any) {
  for (const key of Object.keys(from)) {
    if (onto.hasOwnProperty(key)) {
      onto[key] = from[key]
    }
  }
}

export function buildParameters<T>(defaults: T, options: Partial<T>) {
  if (defaults === options) {
    return defaults
  }
  const final: T = {} as any
  for (const key in defaults) {
    if (defaults[key] !== undefined) {
      final[key] = defaults[key]!
    }
  }
  for (const key in options) {
    if (options[key] !== undefined) {
      final[key] = options[key]!
    }
  }
  return final
}

export function defaultNumber(val: number | undefined, defVal: number) {
  return val !== undefined ? val : defVal
}

export function lockProp(target: any, propName: string) {
  const _value = target[propName]
  Object.defineProperty(target, propName, {
    get() {
      return _value
    },
    set() {
      console.warn(propName + ' change prevented.')
    }
  })
}

export function unlockProp(target: any, propName: string) {
  let _value = target[propName]
  Object.defineProperty(target, propName, {
    get() {
      return _value
    },
    set(val) {
      _value = val
    }
  })
}

export class NamedJob {
  constructor(
    public name: string,
    public job: () => void
  ) {
    //
  }
}
