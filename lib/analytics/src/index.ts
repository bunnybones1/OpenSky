import { Tracker } from './tracker'

// Setup analytics tracker
//
// By default the tracker is setup with noop operations, where you can
// make calls to the track events, but they will just be skipped. The app can
// call the `initAnalytics` method passing the databeat config (server and key) to
// allow it to track. Additional user operations and controls can also be passed
// to the tracker.
export let analytics = new Tracker('', {}, { noop: true })

let inited = false

export const initAnalytics = (
  databeatServer: string,
  databeatAuthKey: string
) => {
  if (inited) {
    return analytics
  }
  inited = true
  analytics = new Tracker(
    databeatServer,
    { jwt: databeatAuthKey },
    {
      // default on -- which is separate from allowTracking,
      // as we have privacy-preserving mode, this is safe.
      defaultEnabled: true,

      // these settings must match settings on the server
      privacy: { userIdHash: true, userAgentSalt: false }
    }
  )
  analytics.enable()
  return analytics
}

// NOTE: to use this package:
//
// import { analytics } from '@opensky/analytics'
//
// then call, `analytics.track({ event: 'MATCH_STARTED' })` or similar
// or the subclass helper methods like analytics.trackExample() etc..
//
// The tracker is setup with noop operations by default, so you can
// use it everywhere, and if tracking key isn't setup, it will
// quietly just do nothing.
