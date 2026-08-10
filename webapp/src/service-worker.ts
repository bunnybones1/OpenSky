declare let self: ServiceWorkerGlobalScope

import { cacheFilters } from '@opensky/shared/cacheFilters'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { clientsClaim, registerQuotaErrorCallback, WorkboxPlugin } from 'workbox-core'
import { ExpirationPlugin } from 'workbox-expiration'
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkOnly } from 'workbox-strategies'

cleanupOutdatedCaches()

precacheAndRoute(self.__WB_MANIFEST)

const deOpaquifyAssetsRequests: WorkboxPlugin = {
  requestWillFetch: async ({ request }) =>
    new Request(request, { mode: 'cors', credentials: 'same-origin' })
}

clientsClaim()

registerQuotaErrorCallback(() => {
  self.clients.matchAll().then(function (clients) {
    if (clients && clients.length) {
      clients[0].postMessage({ type: 'QUOTA_EXCEEDED' })
    }
  })
})

self.skipWaiting()

const plugins = [
  deOpaquifyAssetsRequests,
  new ExpirationPlugin({
    purgeOnQuotaError: true,
    // One Year
    maxAgeSeconds: 365 * 24 * 60 * 60
  }),
  new CacheableResponsePlugin({
    statuses: [200]
  })
]

Array.from(cacheFilters.keys()).forEach((cacheName) => {
  registerRoute(
    (a) => cacheFilters.get(cacheName)!(a.url.href),
    new CacheFirst({
      cacheName,
      plugins
    })
  )
})

registerRoute(({ url }) => url.pathname.includes('index.html'), new NetworkOnly())
