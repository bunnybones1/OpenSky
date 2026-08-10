
export type FindByType<Union, Type> = Union extends { type: Type }
? Union
: never

export type ExtractKeysOfValueType<T, K> = {
[I in keyof T]: T[I] extends K ? I : never
}[keyof T]

export type Overlaps<T extends any[]> = {
[K in keyof T]: {
  [L in keyof T]: L extends K
    ? never
    : T[K] & T[L] extends never
    ? never
    : ['Elements at indices', K | L, 'both contain', T[K] & T[L]]
}[number]
}[number]

export type ExpectNever<T extends never> = T

export type DropFirst<T extends unknown[]> = T extends [any, ...infer U]
? U
: never

export function makeSafetyCheckFromConstStringArray<
  T extends { [index: number]: string }
>(arr: Exclude<T, Array<string>>) {
  type SpecificString = typeof arr[number]
  return function safe(x: string): x is SpecificString {
    return Array.prototype.includes.call(arr, x)
  }
}
