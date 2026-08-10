import { ProviderMessage, ProxyMessageChannel } from '@0xsequence/provider'
import { listenForMessage } from '@opensky/shared/browserMessageListener'
import { getMobileMessenger, isNativeMobileApp } from '@opensky/shared/native'

import { captureError } from '~/shared/helpers/sentry'

export const getMobileWalletMessenger = () => {
  if (isNativeMobileApp()) {
    const ch = new ProxyMessageChannel()

    const handleMessage = (e) => {
      try {
        if (e.origin !== '' && e.origin !== window.location.origin) return // skip non-RN origins

        if (!ch.app.conn) {
          console.warn('ch.app.conn is undefined.. why?')
          return
        }

        // event message data, sent as an object
        const providerMessage = e.data

        if (providerMessage.idx && providerMessage.type) {
          ch.app.handleMessage(providerMessage)
        }
      } catch (err) {
        captureError(err, 'Wallet message error')
      }
    }

    // Receving message from RN -> Wallet
    listenForMessage(handleMessage)

    // Sending message from app -> RN
    //
    // here our app is trying to reach the wallet port, and we forward this
    // to RN, destined for the wallet. What we do here is intercept the request
    // then send over RN postMessage bridge
    ch.wallet.handleMessage = (message: ProviderMessage<any>): void => {
      // now, lets send to RN
      getMobileMessenger().postMessage(message)
    }
    return ch
  }
  return
}
