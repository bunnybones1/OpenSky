import { isNativeMobileApp } from '@opensky/shared/native'

export const getIsStandalone = () => {
  const isInWebAppiOS = (window.navigator as any).standalone === true
  const isInWebAppChrome = window.matchMedia('(display-mode: standalone)').matches

  return isNativeMobileApp() || isInWebAppChrome || isInWebAppiOS
}
