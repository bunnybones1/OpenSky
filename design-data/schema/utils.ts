export function noDuplicates<T>(value: T[]): boolean {
  return value.length === new Set(value).size
}
