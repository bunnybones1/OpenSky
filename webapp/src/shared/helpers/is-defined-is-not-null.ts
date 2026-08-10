export function isDefined<T>(x: T | undefined): x is T {
  return x !== undefined
}

export function isNotNull<T>(x: T | null): x is T {
  return x !== null
}

export function isDefinedAndNotNull<T>(x: T | null | undefined): x is T {
  return isNotNull(x) && isDefined(x)
}
