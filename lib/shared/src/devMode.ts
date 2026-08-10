const hn = location.hostname
const localDevMode =
  hn.includes('localhost') ||
  hn.includes('192.168.') ||
  hn.includes('local.0xhorizon.net') ||
  hn.includes('127.0.0.1')

const devMode = hn.includes('dev') || localDevMode || hn.includes('ngrok')

export function isDevMode() {
  return devMode
}

export function isLocalDevMode() {
  return localDevMode
}
