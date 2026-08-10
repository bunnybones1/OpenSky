import { clamp } from './math'

export function getLocalStorageParam(key: string) {
  return localStorage.getItem(key)
}

export function setLocalStorageParam(key: string, val: string) {
  return localStorage.setItem(key, val)
}

export function getLocalStorageFlag(key: string) {
  const result = getLocalStorageParam(key)
  return !!(result === '' || (result && result !== 'false'))
}

export function setLocalStorageFlag(key: string, val: boolean) {
  setLocalStorageParam(key, val ? 'true' : 'false')
}

function __getLocalStorageNumber(
  key: string,
  defaultVal: number,
  parser: (val: string) => number,
  min = -Infinity,
  max = Infinity
) {
  return clamp(
    parser(getLocalStorageParam(key) || defaultVal.toString()),
    min,
    max
  )
}

function __setLocalStorageNumber(key: string, val: number) {
  return setLocalStorageParam(key, val.toString())
}

export function getLocalStorageFloat(
  key: string,
  defaultVal: number,
  min = -Infinity,
  max = Infinity
) {
  return __getLocalStorageNumber(key, defaultVal, parseFloat, min, max)
}
export function setLocalStorageFloat(key: string, val: number) {
  return __setLocalStorageNumber(key, val)
}

function parseBoolean(val: string) {
  switch (val) {
    case 'true':
      return true
    case 'false':
      return false
    default:
      return undefined
  }
}

export function getLocalStorageBoolean(key: string, defaultVal: boolean) {
  const val = parseBoolean(getLocalStorageParam(key) || 'unknown')
  return val !== undefined ? val : defaultVal
}
export function setLocalStorageBoolean(key: string, val: boolean) {
  return setLocalStorageParam(key, val ? 'true' : 'false')
}

export function getLocalStorageInt(
  key: string,
  defaultVal: number,
  min = -Infinity,
  max = Infinity
) {
  return __getLocalStorageNumber(key, defaultVal, parseInt, min, max)
}
export function setLocalStorageInt(key: string, val: number) {
  return __setLocalStorageNumber(key, val)
}

export function getLocalStorageObject(key: string) {
  const str = getLocalStorageParam(key)
  if (str) {
    return JSON.parse(str)
  } else {
    return {}
  }
}

export function setLocalStorageObject(key: string, obj: object) {
  setLocalStorageParam(key, JSON.stringify(obj))
}
