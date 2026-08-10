// import * as Sentry from '@sentry/browser'
// import { CaptureConsole } from '@sentry/integrations'

import env from '~/env'

export const initSentry = (setSentryEventId: (eventId?: string) => void) => {
  if (env.SENTRY_DSN) {
    // ;(window as any).Sentry = Sentry

    // Sentry.init({
    //   dsn: env.SENTRY_DSN,
    //   debug: window.location.hostname.includes('dev'),
    //   release: env.GITCOMMIT,
    //   beforeSend(event) {
    //     // Check if it is an exception, and if so, show the report dialog
    //     if (event.level === 'error' || event.exception) {
    //       setSentryEventId(event.event_id)
    //     }

    //     return event
    //   },
    //   environment:
    //     window.location.hostname.split('.')[0] === 'play'
    //       ? 'production'
    //       : window.location.hostname.split('.')[0],
    //   integrations: [
    //     new CaptureConsole({
    //       levels: ['error']
    //     })
    //   ]
    // })
  }
}
