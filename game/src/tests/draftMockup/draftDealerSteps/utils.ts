import { getRandom } from '@opensky/shared/utils/arrayUtils'
import { Rarity } from '@skyweaver/state-metadata'

import { TrackableCollection } from '~/utils/TrackableCollection'

import DraftState, {
  DraftStateCard,
  DraftStateCardPack,
  DraftStateEvent,
  DraftStatePlayer
} from '../DraftState'

export function makeNewCardPack(state: DraftState) {
  TrackableCollection.unlock()
  const pack = new TrackableCollection<DraftStateCard>(
    'card pack #' + (state.cardPacks.length + 1)
  )
  TrackableCollection.lock()
  state.cardPacks.add(pack)
  return pack
}

export function makeNewAvatarPack(state: DraftState) {
  TrackableCollection.unlock()
  const pack = new TrackableCollection<DraftStateCard>(
    'avatar pack #' + (state.avatarPacks.length + 1)
  )
  TrackableCollection.lock()
  state.avatarPacks.add(pack)
  return pack
}

export function makeNewEventPack(state: DraftState) {
  TrackableCollection.unlock()
  const pack = new TrackableCollection<DraftStateEvent>(
    'event pack #' + (state.eventPacks.length + 1)
  )
  TrackableCollection.lock()
  state.eventPacks.add(pack)
  return pack
}

export function moveRandomItem<T>(
  from: TrackableCollection<T>,
  to: TrackableCollection<T>
) {
  const item = getRandom(from.items)
  from.remove(item)
  to.add(item)
}

export function moveRandomCard(
  from: DraftStateCardPack,
  to: DraftStateCardPack,
  rarity: Rarity
) {
  const item = getRandom(from.items.filter(c => c.rarity === rarity))
  from.remove(item)
  to.add(item)
}

export function isFirstPlayer(state: DraftState, player: DraftStatePlayer) {
  return state.players.items.indexOf(player) === 0
}
