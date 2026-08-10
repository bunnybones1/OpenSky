import { sanitizeUrl } from '@braintree/sanitize-url'
import {
  getMobileMessenger,
  isNativeOpenSkyMobileApp,
  isNativeSequenceMobileApp
} from '@opensky/shared/native'

export const MOBILE_NATIVE_OPEN_PATH = '/_open'
export const MOBILE_NATIVE_LINK_PATH = '/_link'

// getExternalLink returns mobile-compatible link that will optionally open the link in an in-app-browser
// on mobile-native, and behave normally on desktops/other. Note: if you pass false to inAppBrowser, then
// the mobile-native app will open the link with the phone's browser instead.
export const getExternalLink = (link: string, inAppBrowser = true) =>
  _getExternalLink(
    link,
    inAppBrowser ? MOBILE_NATIVE_OPEN_PATH : MOBILE_NATIVE_LINK_PATH
  )

// openExternalLink is like `getExternalLink` but it will also immediately change location to the link.
export const openExternalLink = (link: string, inAppBrowser = true) =>
  _openExternalLink(
    link,
    inAppBrowser ? MOBILE_NATIVE_OPEN_PATH : MOBILE_NATIVE_LINK_PATH
  )

const _getExternalLink = (link: string, specialPath: string) => {
  link = sanitizeUrl(link)
  if (isNativeOpenSkyMobileApp()) {
    return `${window.location.origin}${specialPath}?url=${encodeURI(link)}`
  } else {
    return link
  }
}

const _openExternalLink = (link: string, specialPath: string) => {
  link = sanitizeUrl(link)
  if (link === 'about:blank') {
    return
  }
  if (isNativeOpenSkyMobileApp() || isNativeSequenceMobileApp()) {
    // open in external mobile-native in-app browser by traversing to specialPath
    // with url encoded as a query param

    // NOTE: we must send a post-message with this link data instead of
    // specifying window.location.href, as unfortunately there is a bug with React-Native
    // on Android, where only <a> click events will trigger a request event, whereas
    // window.location.href will open the link, but it won't notify the mobile-native app
    // of the event. So, we send an event to the mobile-native app and it will trigger the link.
    getMobileMessenger().postMessage({
      action: 'openBrowser',
      link: _getExternalLink(link, specialPath)
    })
  } else {
    // open in external browser tab/window
    window.open(link)
  }
}
