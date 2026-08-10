import { useWorkerlessCacheStorage } from '@opensky/shared/userSettings'
import { registerSW } from 'virtual:pwa-register'

import { isLocalHost } from '~/shared/helpers/is-local-host'
import { uiState, updateUIState } from '~/shared/state/ui/ui-state'

export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    // unregister previous service worker if name changed
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(
      registrations
        .filter(
          (sw) =>
            sw.active &&
            (!sw.active.scriptURL.includes(`service-worker.js`) ||
              isLocalHost() ||
              useWorkerlessCacheStorage.value)
        )
        .map((r) => r.unregister())
    ).catch((err) => {
      console.error(`Failed to unregister service worker - probably on iOS 14.`, err)
    })

    if (!isLocalHost() && !useWorkerlessCacheStorage.value) {
      const intervalMS = 60 * 60 * 1000

      const updateSW = registerSW({
        onRegisteredSW(swUrl, r) {
          r &&
            setInterval(async () => {
              if (!(!r.installing && navigator)) return

              if ('connection' in navigator && !navigator.onLine) return

              const resp = await fetch(swUrl, {
                cache: 'no-store',
                headers: {
                  cache: 'no-store',
                  'cache-control': 'no-cache'
                }
              })

              if (resp?.status === 200) await r.update()
            }, intervalMS)
        },
        onNeedRefresh() {
          // TODO: add a popup saying that new content is ready for the user, and click here to refresh
          // then call `updateSW()`
          void updateSW
        }
      })

      navigator.serviceWorker.onmessage = (event) => {
        if (event.data && event.data.type === 'QUOTA_EXCEEDED') {
          if (!uiState.isCacheQuotaExceeded) {
            updateUIState('isCacheQuotaExceeded', true)
          }
        }
      }
    }
  }
}
