export const isSafari = (): boolean => {
  if (!navigator.vendor || !navigator.userAgent) return false

  return (
    navigator.vendor.indexOf('Apple') > -1 &&
    navigator.userAgent.indexOf('CriOS') === -1 &&
    navigator.userAgent.indexOf('FxiOS') === -1
  )
}
