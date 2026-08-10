import { TrackableCollection } from '~/utils/TrackableCollection'

import {
  DraftStateCard,
  DraftStateCardPack,
  DraftStatePlayer
} from './DraftState'

export class DraftStateBoonBidTrack {
  player: DraftStatePlayer | undefined
  debts: TrackableCollection<DraftStateCard>
  debtIndex = -1
  constructor(public boon: DraftStateCard) {
    TrackableCollection.unlock()
    this.debts = new TrackableCollection('boon debts')
    TrackableCollection.lock()
  }
}

export class EventStateLifeAuctionDealer {
  boons: DraftStateCardPack
  boonBidTracks: TrackableCollection<DraftStateBoonBidTrack>
  activePlayer: DraftStatePlayer
  constructor() {
    TrackableCollection.unlock()
    this.boons = new TrackableCollection('life auction boons')
    this.boonBidTracks = new TrackableCollection('life auction boon bid tracks')
    this.boons.listenForAdd(boon =>
      this.boonBidTracks.add(new DraftStateBoonBidTrack(boon))
    )
    this.boons.listenForRemove(boon => {
      const bbt = this.boonBidTracks.items.find(bbt => bbt.boon === boon)
      if (bbt) {
        this.boonBidTracks.remove(bbt)
      } else {
        throw new Error('Cannot remove boon. Never seen this one before...')
      }
    })
    TrackableCollection.lock()
  }
}
