import 'core-js/stable'
import './i18n'
import 'react-loading-skeleton/dist/skeleton.css'
import './index.css'

if (!(window as any).ResizeObserver) {
  import('resize-observer-polyfill').then((mod) => {
    ;(window as any).ResizeObserver = mod.default
  })
}

import { initAnalytics } from '@opensky/analytics'
import { isAndroidNativeApp } from '@opensky/shared/check-mobile-app-type'
import { sharedBoilerplate } from '@opensky/shared/sharedBoilerplate'
import { QueryClientProvider } from '@tanstack/react-query'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'

import env from '~/env'
import { reduxStore } from '~/shared/redux'

import { GetAssetProvider } from './components/GetAssetProvider/GetAssetProvider'
import { registerServiceWorker } from './helpers/register-sw'
import { IndexPage } from './IndexPage/IndexPage'
import { GlobalQueryClient } from './shared/clients'
import { Toasts } from './Toasts/Toasts'

sharedBoilerplate()

if (env.ANALYTICS) {
  initAnalytics(env.DATABEAT_SERVER, env.DATABEAT_KEY)
}

// Dont register the SW on android native, since
// we have our own cache implementation there.
if (!isAndroidNativeApp()) {
  registerServiceWorker()
}

const container = document.getElementById('app')
const root = createRoot(container!)

root.render(
  <>
    <Provider store={reduxStore}>
      <QueryClientProvider client={GlobalQueryClient}>
        <GetAssetProvider>
          <IndexPage />
          <Toasts />
        </GetAssetProvider>
      </QueryClientProvider>
    </Provider>
  </>
)
