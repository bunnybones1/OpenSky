export type Overlaps<T extends any[]> = {
  [K in keyof T]: {
    [L in keyof T]: L extends K
      ? never
      : T[K] & T[L] extends never
      ? never
      : ['Elements at indices', K | L, 'both contain', T[K] & T[L]]
  }[number]
}[number]

export type ExpectNever<T extends never> = void
