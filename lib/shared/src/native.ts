import {
  openskyDesktopUserAgentPrefix,
  openskyMobileUserAgentPrefix,
  versionCharLength
} from './constants'

let _isMobileBrowser: boolean | undefined = undefined

export const isMobileBrowser = (): boolean => {
  if (_isMobileBrowser) return _isMobileBrowser
  if (!navigator || !navigator.userAgent) return false
  const general = () => !!navigator.userAgent.match(/Mobi/)
  const android = () => !!navigator.userAgent.match(/Android/i)
  const ios = () => !!navigator.userAgent.match(/iPhone|iPad|iPod/i)
  const windows = () => !!navigator.userAgent.match(/IEMobile/i)
  const opera = () => !!navigator.userAgent.match(/Opera Mini/i)
  const blackberry = () => !!navigator.userAgent.match(/BlackBerry/i)
  _isMobileBrowser =
    general() || android() || ios() || windows() || opera() || blackberry()
  return _isMobileBrowser
}

export const isNativeMobileApp = (): boolean => {
  return isNativeOpenSkyMobileApp() || isNativeSequenceMobileApp()
}

export const nativeOpenSkyMobileVersion = (): string | undefined => {
  const { userAgent } = window.navigator
  // const userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 OpenSky-Mobile/v2.3.0.x'
  if (
    isNativeMobileApp() &&
    userAgent.includes(openskyMobileUserAgentPrefix)
  ) {
    const idx = userAgent.indexOf(openskyMobileUserAgentPrefix)
    const slicePosition = idx + openskyMobileUserAgentPrefix.length
    // cut from end of prefix for major.minor.patch
    const userAgentSliced = userAgent.slice(
      slicePosition,
      slicePosition + versionCharLength
    )
    if (userAgentSliced) {
      return userAgentSliced
    }
  }
  return undefined
}

let _isNativeSequenceMobileApp: boolean | undefined = undefined
let _isNativeOpenSkyMobileApp: boolean | undefined = undefined
let _isOldNativeOpenSkyMobileApp: boolean | undefined = undefined

export const isNativeSequenceMobileApp = (): boolean => {
  if (_isNativeSequenceMobileApp !== undefined)
    return _isNativeSequenceMobileApp
  if (!navigator || !navigator.userAgent) return false
  _isNativeSequenceMobileApp = !!navigator.userAgent.match(/Sequence-Mobile/)
  return _isNativeSequenceMobileApp
}

export const isNativeOpenSkyMobileApp = (): boolean => {
  if (_isNativeOpenSkyMobileApp !== undefined)
    return _isNativeOpenSkyMobileApp
  if (!navigator || !navigator.userAgent) return false
  _isNativeOpenSkyMobileApp = !!navigator.userAgent.match(/OpenSky-Mobile/)
  return _isNativeOpenSkyMobileApp
}

export const isOldNativeOpenSkyMobileApp = (): boolean => {
  if (_isOldNativeOpenSkyMobileApp !== undefined)
    return _isOldNativeOpenSkyMobileApp
  if (!navigator || !navigator.userAgent) return false
  _isOldNativeOpenSkyMobileApp =
    !!navigator.userAgent.match(/opensky/i) &&
    !isNativeOpenSkyMobileApp() &&
    !navigator.userAgent.match(/electron/i)
  return _isOldNativeOpenSkyMobileApp
}

let _isNativeOpenSkyDesktopApp: boolean | undefined = undefined
let _isOldNativeOpenSkyDesktopApp: boolean | undefined = undefined

export const nativeOpenSkyDesktopVersion = (): string | undefined => {
  const { userAgent } = window.navigator
  if (
    isNativeOpenSkyDesktopApp() &&
    userAgent.includes(openskyDesktopUserAgentPrefix)
  ) {
    const idx = userAgent.indexOf(openskyDesktopUserAgentPrefix)
    const slicePosition = idx + openskyDesktopUserAgentPrefix.length
    // cut from end of prefix for major.minor.patch
    const userAgentSliced = userAgent.slice(
      slicePosition,
      slicePosition + versionCharLength
    )
    if (userAgentSliced) {
      return userAgentSliced
    }
  }
  return undefined
}

export const isNativeOpenSkyDesktopApp = (): boolean => {
  if (_isNativeOpenSkyDesktopApp !== undefined)
    return _isNativeOpenSkyDesktopApp
  if (!navigator || !navigator.userAgent) return false
  _isNativeOpenSkyDesktopApp =
    !!navigator.userAgent.match(/OpenSky-Desktop\/v/)
  return _isNativeOpenSkyDesktopApp
}

export const isOldNativeOpenSkyDesktopApp = (): boolean => {
  if (_isOldNativeOpenSkyDesktopApp !== undefined)
    return _isOldNativeOpenSkyDesktopApp
  if (!navigator || !navigator.userAgent) return false
  _isOldNativeOpenSkyDesktopApp =
    !!navigator.userAgent.match(/OpenSky-Desktop/i) &&
    !isNativeOpenSkyDesktopApp()
  return _isOldNativeOpenSkyDesktopApp
}

export class MobileMessenger {
  private msDelayFlushAfterLoad: number
  private postMessageDedupe: boolean

  private postMessageQueue: Array<any> = []
  private postMessageDedupeIndex: { [key: string]: boolean } = {}

  private isMessengerReady: boolean = false

  constructor(
    checkRetryCount: number = 10,
    msDelayFlushAfterLoad: number = 1000,
    postMessageDedupe: boolean = true
  ) {
    this.msDelayFlushAfterLoad = msDelayFlushAfterLoad
    this.postMessageDedupe = postMessageDedupe

    if (isNativeOpenSkyMobileApp()) {
      this.checkMessengerReady(checkRetryCount)
    }
  }

  postMessage = (data: object): void => {
    if (!isNativeOpenSkyMobileApp()) {
      return
    }
    if (!this.isMessengerReady || this.postMessageQueue.length > 0) {
      // enqueue it as will be flushed in a batch
      this.enqueuePostMessage(data)
    } else {
      // webview is ready, and queue is empty, so we're safe to send
      // the message to the webview
      this.sendPostMessage(data)
    }
  }

  private enqueuePostMessage(data: object): void {
    const payload = JSON.stringify(data)

    if (this.postMessageDedupe) {
      if (this.postMessageDedupeIndex[payload]) {
        // skip enqueue if its already in
        return
      } else {
        // mark string as enqueued
        this.postMessageDedupeIndex[payload] = true
      }
    }
    console.debug(`MobileMessenger enqueuePostMessage`, payload)
    this.postMessageQueue.push(payload)
  }

  private flushPostMessageQueue(): void {
    if (this.postMessageQueue.length === 0) return

    console.debug(
      `MobileMessenger flushPostMessageQueue # of messages, ${this.postMessageQueue.length}`
    )

    for (let i = 0; i < this.postMessageQueue.length; i++) {
      this.sendPostMessage(this.postMessageQueue[i])
    }

    this.postMessageQueue.length = 0
    this.postMessageDedupeIndex = {}
  }

  private sendPostMessage = (data: Object | string): void => {
    // eslint-disable-next-line
    ;(window as any).ReactNativeWebView.postMessage(JSON.stringify(data))
  }

  private checkMessengerReady = (retryCount: number): void => {
    if (
      'ReactNativeWebView' in window &&
      // eslint-disable-next-line
      (window as any).ReactNativeWebView.postMessage !== undefined
    ) {
      this.isMessengerReady = true
      setTimeout(() => this.flushPostMessageQueue(), this.msDelayFlushAfterLoad)
    } else {
      if (retryCount > 0) {
        setTimeout(() => this.checkMessengerReady(retryCount - 1), 500)
      } else {
        console.error('Could not communicate to mobile app.')
      }
    }
  }
}
let __mobileMessenger: MobileMessenger | undefined
export function getMobileMessenger() {
  if (!__mobileMessenger) {
    __mobileMessenger = new MobileMessenger()
  }
  return __mobileMessenger!
}

export function makeCarefulMobileMessageListener(handler: (data: any) => void) {
  return function wrappedHandler(e: MessageEvent) {
    try {
      // skip if not a message from RN
      if (e.origin !== '' && e.origin !== window.location.origin) {
        return
      }

      // skip if no data is present
      const data = e.data
      if (!data) {
        return
      }

      if (data.openskyMobile) {
        handler(data.openskyMobile)
      }
    } catch (err) {
      console.error(err, 'OpenSky mobile message failed')
    }
  }
}
