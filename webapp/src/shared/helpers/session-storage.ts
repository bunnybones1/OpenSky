import { StoredGameInfo } from '../types/play'

export const SKYWEAVER_SESSION_DATA_KEY = '_opensky.HZ_SS'

const ss = window.sessionStorage.getItem(SKYWEAVER_SESSION_DATA_KEY)

const storedState: StoredGameInfo = ss ? JSON.parse(ss) : {}

export const getSessionStorage = () => {
  const sesh = window.sessionStorage.getItem(SKYWEAVER_SESSION_DATA_KEY)
  return !!sesh ? (JSON.parse(sesh) as StoredGameInfo) : null
}

export const setItem = <T extends keyof StoredGameInfo>(
  key: T,
  val: StoredGameInfo[T]
) => {
  storedState[key] = val

  window.sessionStorage.setItem(
    SKYWEAVER_SESSION_DATA_KEY,
    JSON.stringify(storedState)
  )
}

export const mergeSSItem = (val: Partial<StoredGameInfo>) => {
  for (const key in val) {
    if (Object.prototype.hasOwnProperty.call(val, key)) {
      const itemVal = val[key]
      storedState[key] = itemVal
    }
  }

  window.sessionStorage.setItem(
    SKYWEAVER_SESSION_DATA_KEY,
    JSON.stringify(storedState)
  )
}
