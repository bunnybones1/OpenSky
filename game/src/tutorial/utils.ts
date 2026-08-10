export const asArray = <T>(value: T | T[]) => {
  return ([] as T[]).concat(value)
}
