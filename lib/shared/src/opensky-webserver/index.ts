import { WebServerAPI } from './messages.gen'

let __server: WebServerAPI | undefined
export function getLocalWebServer() {
  if (!__server) {
    __server = new WebServerAPI(
      'https://swa-001.skyweaver.network:41214',
      window.fetch
    )
  }
  return __server!
}
