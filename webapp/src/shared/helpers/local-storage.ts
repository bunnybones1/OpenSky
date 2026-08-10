import { WebIAP } from '../state/mobile-state'
import { StoredGameInfo } from '../types/play'

export interface OpenSkyLS extends StoredGameInfo {
  iapItems?: WebIAP[]
  lastSeenConversionDialog?: string
}

export const SKYWEAVER_LOCAL_DATA_KEY = '_opensky.HZ_LS'

const ls = window.localStorage.getItem(SKYWEAVER_LOCAL_DATA_KEY)

const storedState: OpenSkyLS = ls ? JSON.parse(ls) : {}

export const getLocalStorage = () => {
  const sesh = window.localStorage.getItem(SKYWEAVER_LOCAL_DATA_KEY)
  return !!sesh ? (JSON.parse(sesh) as OpenSkyLS) : null
}

export const setItem = <T extends keyof OpenSkyLS>(key: T, val: OpenSkyLS[T]) => {
  storedState[key] = val

  window.localStorage.setItem(SKYWEAVER_LOCAL_DATA_KEY, JSON.stringify(storedState))
}

export const mergeLSItem = (val: Partial<OpenSkyLS>) => {
  for (const key in val) {
    if (Object.prototype.hasOwnProperty.call(val, key)) {
      const itemVal = val[key]
      storedState[key] = itemVal
    }
  }

  window.localStorage.setItem(SKYWEAVER_LOCAL_DATA_KEY, JSON.stringify(storedState))
}
