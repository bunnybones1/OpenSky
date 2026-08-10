import { TrackableCollection } from '~/utils/TrackableCollection'

import { DraftStateCardPack } from './DraftState'

export class EventStateBoonChoiceDealer {
  boons: DraftStateCardPack
  boonPacks: TrackableCollection<DraftStateCardPack>
  constructor() {
    TrackableCollection.unlock()
    this.boons = new TrackableCollection('boon choice boons')
    this.boonPacks = new TrackableCollection('boon choice boon packs')
    TrackableCollection.lock()
  }
}
