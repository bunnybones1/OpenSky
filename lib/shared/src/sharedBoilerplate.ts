import { useWorkerlessCacheStorage } from './userSettings'
import { installCacheyFetchShim } from './utils/cacheyFetch'
import { FetchingXMLHttpRequest } from './utils/shimXHRtoFetch'

export function sharedBoilerplate() {
  if (useWorkerlessCacheStorage.value) {
    // @ts-ignore
    window.XMLHttpRequest = FetchingXMLHttpRequest
    installCacheyFetchShim()
  }
}
