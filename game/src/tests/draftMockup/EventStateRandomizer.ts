import { TrackableCollection } from '~/utils/TrackableCollection'

import { DraftStateCardSlot } from './DraftState'

export class EventStateRandomizerDealer {
  boonSlots: TrackableCollection<DraftStateCardSlot>
  distance = Math.random() * 12 + 36
  constructor() {
    TrackableCollection.unlock()
    this.boonSlots = new TrackableCollection('randomizer boon slots')
    TrackableCollection.lock()
  }
}
