export function gameStateReplacer(this: any, key: any, value: any) {
  const originalObject = this[key]
  if (originalObject instanceof Map) {
    return {
      dataType: 'Map',
      value: Array.from(originalObject.entries())
    }
  } else {
    return value
  }
}
export function gameStateReviver(_: any, value: any) {
  if (typeof value === 'object' && value !== null) {
    if (value.dataType === 'Map') {
      return new Map(value.value)
    }
  }
  return value
}

export function gameStateStringify(obj: any): string {
  return JSON.stringify(obj, gameStateReplacer)
}

export function gameStateParse(str: string): any {
  return JSON.parse(str, gameStateReviver)
}
