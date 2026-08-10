import { Databeat, Event as DatabeatEvent } from '@databeat/tracker'
import { EventType } from './analytics.gen'

export type EventTypes = keyof typeof EventType
export type Event = DatabeatEvent<EventTypes>

// NOTE: The source of truth for event types are listed in the
// RIDL file at api/lib/analytics.ridl.
//
// To add new event types:
// 1. Edit api/lib/analytics/analytics.ridl to add the event
// 2. Run `make analytics` inside of api folder
// 3. It's done! maybe reload your code editor

// Tracker sub-class to add some custom helper methods
export class Tracker extends Databeat<EventTypes> {

  trackExample() {
    this.track({ event: 'MATCH_STARTED' })
  }

}
