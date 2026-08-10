export function sortedStringify(obj: any, space?: number) {
  const allKeys = new Set<string>()
  JSON.stringify(obj, (key, value) => (allKeys.add(key), value))
  return JSON.stringify(
    obj,
    [...allKeys].sort((a, b) =>
      a.localeCompare(b, undefined, {
        numeric: true
      })
    ),
    space
  )
}
