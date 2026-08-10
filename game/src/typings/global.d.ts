import type * as Sentry from '@sentry/browser'
import device from '@opensky/shared/device'
import { Howler } from 'howler'

import type apiClient from '~/apiClient'
import { type Automation } from '~/automation'
import type env from '~/env'
import { type gameEngineController } from '~/gameEngineController'
import { type store } from '~/state'

export {}

declare global {
  interface SessionStorage {
    countryCode?: string
    sessionId?: string
    clearIndentity: () => void
  }

  interface Window {
    APP_CONFIG: any
    apiClient: typeof apiClient
    automation: Automation
    device: typeof device
    env: typeof env
    swGameEngineController: typeof gameEngineController
    store: typeof store
    Sentry?: typeof Sentry
    H: typeof Howler
    sessStorage?: SessionStorage
    exportCanvasData?: () => void
  }
}
